//
//  DashboardViewModel.swift
//  Tally
//
//  ViewModel for the main Dashboard view
//  Fetches subscriptions and computes summary statistics
//

import Foundation
import SwiftUI
import Observation

// MARK: - TickerItem Model

struct TickerItem: Identifiable {
    enum Kind {
        case upcomingAirDate
        case newRelease
        case renewalDue
        case priceChange
        case recommendation
        case trendingNow
    }

    let id: UUID = .init()
    let kind: Kind
    let title: String
    let subtitle: String?
    let icon: String
    let aggregateCount: Int?    // anonymous global count e.g., viewers this week
    let entityId: String?       // e.g., show ID for deep-link
    let date: Date?
    let deepLink: URL?
    let urgency: Int
}

@Observable
final class DashboardViewModel {
    // MARK: - State

    var subscriptions: [Subscription] = []
    var watchlist: [UserShow] = [] // Store watchlist for show counts
    var upcomingEpisodes: [CalendarEpisode] = [] // Episodes airing this week
    var tickerItems: [TickerItem] = [] // News ticker items
    var isLoading = false
    var isLoadingEpisodes = false // Track episode loading separately
    var error: String?
    private var hasLoadedData = false // Cache flag to prevent redundant loads
    private var isRefreshing = false // Prevent concurrent refreshes

    // MARK: - Initialization

    init() {
        // Load mock ticker items
        loadMockTickerItems()
    }

    // MARK: - Computed Properties

    /// Total number of active subscriptions
    var totalActiveSubscriptions: Int {
        subscriptions.filter { $0.isActive }.count
    }

    /// Total monthly cost across all active subscriptions
    var totalMonthlyCost: Double {
        subscriptions
            .filter { $0.isActive }
            .reduce(0) { $0 + $1.monthlyCost }
    }

    /// Formatted monthly cost string
    var formattedMonthlyCost: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale.current
        return formatter.string(from: NSNumber(value: totalMonthlyCost)) ?? "$\(totalMonthlyCost)"
    }

    /// Total number of shows in watchlist
    var totalShows: Int {
        watchlist.count
    }

    /// Active subscriptions sorted by name
    var activeSubscriptions: [Subscription] {
        subscriptions
            .filter { $0.isActive }
            .sorted { $0.serviceName < $1.serviceName }
    }

    /// Inactive subscriptions sorted by name
    var inactiveSubscriptions: [Subscription] {
        subscriptions
            .filter { !$0.isActive }
            .sorted { $0.serviceName < $1.serviceName }
    }

    /// Unique streaming services (for hero section logos)
    var uniqueServices: [StreamingService] {
        let services = subscriptions.compactMap { $0.service }
        let uniqueIds = Set(services.map { $0.id })
        return uniqueIds.compactMap { id in
            services.first { $0.id == id }
        }
    }

    // MARK: - Actions

    /// Load subscriptions from API (derived from watchlist providers)
    @MainActor
    func load(api: ApiClient) async {
        // Skip loading if data already cached
        guard !hasLoadedData else { return }

        isLoading = true
        error = nil

        do {
            // Fetch watchlist to infer subscriptions from streaming providers
            let fetchedWatchlist = try await api.getWatchlist()

            // Check if task was cancelled before updating state
            try Task.checkCancellation()

            watchlist = fetchedWatchlist
            subscriptions = deriveSubscriptionsFromWatchlist(fetchedWatchlist)
            isLoading = false
            hasLoadedData = true
        } catch is CancellationError {
            // Task was cancelled - this is normal, don't show error
            isLoading = false
        } catch let apiError as ApiError {
            error = apiError.errorDescription ?? "Failed to load watchlist"
            isLoading = false
        } catch {
            self.error = error.localizedDescription
            isLoading = false
        }
    }

    /// Derive subscription list from watchlist providers
    private func deriveSubscriptionsFromWatchlist(_ watchlist: [UserShow]) -> [Subscription] {
        // Filter shows that have streaming providers
        let showsWithProviders = watchlist.compactMap { show -> (provider: StreamingProvider, show: UserShow)? in
            guard let provider = show.streamingProvider else { return nil }
            return (provider: provider, show: show)
        }

        // Group shows by streaming provider ID
        let showsByProvider = Dictionary(grouping: showsWithProviders, by: { $0.provider.id })

        // Convert each unique provider into a Subscription
        return showsByProvider.compactMap { (providerId, items) in
            guard let firstItem = items.first else { return nil }
            let provider = firstItem.provider
            let showCount = items.count

            // Create StreamingService from StreamingProvider
            let service = StreamingService(
                id: String(provider.id),
                tmdbProviderId: provider.id,
                name: provider.name,
                logoPath: provider.logoPath,
                homepage: nil,
                prices: [],
                defaultPrice: nil
            )

            // Create inferred subscription with metadata
            // Store show count in tier field as a temporary hack
            return Subscription(
                id: "inferred-\(provider.id)",
                userId: nil,
                serviceId: String(provider.id),
                monthlyCost: 10.00, // Placeholder - could be enhanced with actual pricing
                isActive: true, // Active if they're watching shows on it
                tier: "Watching \(showCount) show\(showCount == 1 ? "" : "s")", // Show count as tier
                startedDate: nil,
                endedDate: nil,
                createdAt: nil,
                updatedAt: nil,
                service: service
            )
        }
    }

    /// Get show count for a specific subscription
    func showCount(for subscription: Subscription) -> Int {
        guard let tier = subscription.tier, tier.hasPrefix("Watching ") else { return 0 }
        let components = tier.split(separator: " ")
        guard components.count >= 2, let count = Int(components[1]) else { return 0 }
        return count
    }

    /// Provider color mapping (same as SimplifiedCalendarViewModel)
    private let providerColors: [Int: Color] = [
        8: Color.red,        // Netflix
        119: Color.blue,     // Amazon Prime
        337: Color(red: 0.0, green: 0.3, blue: 0.6),   // Disney+ - dark blue
        15: Color.green,     // Hulu
        1899: Color.purple,  // HBO Max
        2: Color.gray,       // Apple TV+
        531: Color.blue,     // Paramount+
        283: Color.orange,   // Crunchyroll - orange
        4888: Color.orange   // Paramount+ with Showtime
    ]

    /// Load upcoming episodes for the current week
    @MainActor
    func loadUpcomingEpisodes(api: ApiClient) async {
        isLoadingEpisodes = true
        defer { isLoadingEpisodes = false }

        do {
            let calendar = Calendar.current
            let today = calendar.startOfDay(for: Date())

            // Get current week range (7 days starting from today)
            guard let endDate = calendar.date(byAdding: .day, value: 7, to: today) else { return }

            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"

            let startDateString = formatter.string(from: today)
            let endDateString = formatter.string(from: endDate)

            print("📅 Dashboard: Loading episodes from \(startDateString) to \(endDateString)")

            // Fetch TV guide data
            let tvGuide2Data = try await api.getTVGuide2Data(
                startDate: startDateString,
                endDate: endDateString,
                country: CountryManager.get()
            )

            // Check if task was cancelled before updating state
            try Task.checkCancellation()

            print("📺 Dashboard TV Guide Response: \(tvGuide2Data.providers.count) providers")

            // Build CalendarEpisode objects from tvGuide2Data
            upcomingEpisodes = buildEpisodesFromTVGuide(tvGuide2Data)

            print("📅 Dashboard: Built \(upcomingEpisodes.count) episodes")
        } catch is CancellationError {
            // Task was cancelled - this is normal, don't log as error
            print("ℹ️ Dashboard: Episode loading cancelled")
        } catch {
            print("❌ Dashboard loadUpcomingEpisodes error: \(error)")
        }
    }

    /// Build CalendarEpisode objects from TVGuide2Data
    private func buildEpisodesFromTVGuide(_ tvGuide2Data: TVGuide2Data) -> [CalendarEpisode] {
        var episodes: [CalendarEpisode] = []
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        dateFormatter.timeZone = .current

        for provider in tvGuide2Data.providers {
            let providerColor = colorForProvider(provider.id)
            let recurringDay = getRecurringDay(for: provider.id)

            for show in provider.shows {
                for tvEpisode in show.episodes {
                    guard let airDate = dateFormatter.date(from: tvEpisode.airDate) else { continue }

                    let episode = Episode(
                        episodeNumber: tvEpisode.episodeNumber,
                        name: tvEpisode.title,
                        airDate: tvEpisode.airDate,
                        overview: tvEpisode.overview,
                        runtime: nil, // TVGuide2Episode doesn't have runtime
                        stillPath: nil
                    )

                    let calendarEpisode = CalendarEpisode(
                        id: tvEpisode.id,
                        show: Show(
                            id: "\(show.tmdbId)",
                            tmdbId: show.tmdbId,
                            title: show.title,
                            overview: nil,
                            posterPath: show.posterPath,
                            firstAirDate: nil,
                            status: nil,
                            totalSeasons: nil,
                            totalEpisodes: nil
                        ),
                        seasonNumber: tvEpisode.seasonNumber,
                        episode: episode,
                        provider: StreamingProvider(
                            id: provider.id,
                            name: provider.name,
                            logoPath: provider.logoPath
                        ),
                        airDate: airDate,
                        recurringDay: recurringDay,
                        providerColor: providerColor.map { CodableColor(from: $0) },
                        costPerEpisode: calculateCostPerEpisode(for: provider.id)
                    )

                    episodes.append(calendarEpisode)
                }
            }
        }

        return episodes.sorted { $0.airDate < $1.airDate }
    }

    /// Get provider color for a given provider ID
    private func colorForProvider(_ providerId: Int) -> Color? {
        providerColors[providerId]
    }

    /// Get recurring day for a provider (mock implementation - would be API-driven)
    private func getRecurringDay(for providerId: Int) -> Int? {
        // Mock recurring days based on provider ID
        switch providerId {
        case 8: return 15     // Netflix renews on 15th
        case 337: return 3    // Disney+ renews on 3rd
        case 119: return 1    // Prime Video renews on 1st
        case 1899: return 21  // HBO Max renews on 21st
        case 283: return 10   // Crunchyroll renews on 10th
        default: return nil
        }
    }

    /// Calculate cost per episode for a provider (mock implementation)
    private func calculateCostPerEpisode(for providerId: Int) -> Double? {
        // Mock cost calculations - would be based on subscription cost / episodes watched
        switch providerId {
        case 8: return 3.12      // Netflix
        case 337: return 2.50    // Disney+
        case 119: return 2.75    // Prime Video
        case 1899: return 4.16   // HBO Max
        case 283: return 1.85    // Crunchyroll
        default: return nil
        }
    }

    /// Get episodes airing on a specific date
    func episodesForDate(_ date: Date) -> [CalendarEpisode] {
        upcomingEpisodes.filter { episode in
            Calendar.current.isDate(episode.airDate, inSameDayAs: date)
        }
    }

    /// Load mock ticker items (placeholder data for UI development)
    private func loadMockTickerItems() {
        let calendar = Calendar.current
        let today = Date()

        tickerItems = [
            // Trending item
            TickerItem(
                kind: .trendingNow,
                title: "567 people watching Chad Powers this week",
                subtitle: nil,
                icon: "flame.fill",
                aggregateCount: 1167,
                entityId: "show:chad-powers",
                date: nil,
                deepLink: URL(string: "tally://show/chad-powers"),
                urgency: 0
            ),

            // Urgent renewal
            TickerItem(
                kind: .renewalDue,
                title: "Netflix $15.99",
                subtitle: "3 days",
                icon: "creditcard",
                aggregateCount: nil,
                entityId: nil,
                date: calendar.date(byAdding: .day, value: 3, to: today),
                deepLink: nil,
                urgency: 3
            ),

            // Upcoming air date
            TickerItem(
                kind: .upcomingAirDate,
                title: "Severance S02E05 airs tomorrow",
                subtitle: "Apple TV+",
                icon: "calendar.badge.clock",
                aggregateCount: nil,
                entityId: "show:severance",
                date: calendar.date(byAdding: .day, value: 1, to: today),
                deepLink: URL(string: "tally://show/severance"),
                urgency: 2
            ),

            // New release
            TickerItem(
                kind: .newRelease,
                title: "Stranger Things Season 5",
                subtitle: "Out now on Netflix",
                icon: "sparkles",
                aggregateCount: nil,
                entityId: "show:stranger-things",
                date: today,
                deepLink: URL(string: "tally://show/stranger-things"),
                urgency: 1
            ),
            
            // Urgent renewal
            TickerItem(
                kind: .renewalDue,
                title: "Netflix $15.99",
                subtitle: "3 days",
                icon: "creditcard",
                aggregateCount: nil,
                entityId: nil,
                date: calendar.date(byAdding: .day, value: 3, to: today),
                deepLink: nil,
                urgency: 3
            ),

            // Upcoming air date
            TickerItem(
                kind: .upcomingAirDate,
                title: "Severance S02E05 airs tomorrow",
                subtitle: "Apple TV+",
                icon: "calendar.badge.clock",
                aggregateCount: nil,
                entityId: "show:severance",
                date: calendar.date(byAdding: .day, value: 1, to: today),
                deepLink: URL(string: "tally://show/severance"),
                urgency: 2
            ),

            // New release
            TickerItem(
                kind: .newRelease,
                title: "Stranger Things Season 5",
                subtitle: "New",
                icon: "sparkles",
                aggregateCount: nil,
                entityId: "show:stranger-things",
                date: today,
                deepLink: URL(string: "tally://show/stranger-things"),
                urgency: 1
            )
        ]
    }

    /// Refresh subscriptions and episodes
    @MainActor
    func refresh(api: ApiClient) async {
        // Prevent concurrent refreshes
        guard !isRefreshing else { return }
        isRefreshing = true
        defer { isRefreshing = false }

        hasLoadedData = false // Reset cache to force reload

        // Run both API calls concurrently for faster refresh
        async let loadTask: Void = load(api: api)
        async let episodesTask: Void = loadUpcomingEpisodes(api: api)

        // Wait for both to complete
        _ = await (loadTask, episodesTask)
    }
}

// MARK: - Preview Helpers

#if DEBUG
extension DashboardViewModel {
    static let preview: DashboardViewModel = {
        let vm = DashboardViewModel()
        vm.subscriptions = Subscription.previews
        return vm
    }()

    static let empty: DashboardViewModel = {
        let vm = DashboardViewModel()
        vm.subscriptions = []
        return vm
    }()

    static let loading: DashboardViewModel = {
        let vm = DashboardViewModel()
        vm.isLoading = true
        return vm
    }()

    static let error: DashboardViewModel = {
        let vm = DashboardViewModel()
        vm.error = "Failed to load subscriptions. Please try again."
        return vm
    }()
}
#endif
