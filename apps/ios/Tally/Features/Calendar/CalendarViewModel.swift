import Foundation
import SwiftUI

struct Calendar2Day: Identifiable, Hashable {
    let id: String // yyyy-MM-dd
    let date: Date
    let inMonth: Bool

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: Calendar2Day, rhs: Calendar2Day) -> Bool {
        lhs.id == rhs.id
    }
}

struct ProviderBadge: Identifiable, Hashable {
    let id: Int
    let name: String
    let logo: String?
}

struct EpisodeRef: Identifiable, Hashable {
    let id: String
    let tmdbId: Int
    let seasonNumber: Int
    let episodeNumber: Int
    let title: String
    let airDate: String
}

struct ProviderPrice {
    let providerId: Int
    let providerName: String
    let price: Decimal
    let currency: String

    var formattedPrice: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency
        return formatter.string(from: NSDecimalNumber(decimal: price)) ?? "$0.00"
    }
}

@MainActor
final class CalendarViewModel: ObservableObject {
    @Published var country: String = CountryManager.get()
    @Published var monthAnchor: Date = CalendarViewModel.firstOfMonth(Date())
    @Published var days: [Calendar2Day] = []
    @Published var episodesByDate: [String: [EpisodeRef]] = [:]
    @Published var dailyProviders: [String: [ProviderBadge]] = [:]
    @Published var primaryProviderByDate: [String: ProviderBadge] = [:]
    @Published var isLoading: Bool = false
    @Published var error: String?

    // Static pricing data (to be replaced by API in the future)
    private let staticPricing: [String: [Int: ProviderPrice]] = [
        "AU": [
            1899: ProviderPrice(providerId: 1899, providerName: "HBO Max", price: 19.99, currency: "AUD"),
            4888: ProviderPrice(providerId: 4888, providerName: "Paramount+ with Showtime", price: 11.99, currency: "AUD"),
            8: ProviderPrice(providerId: 8, providerName: "Netflix", price: 16.99, currency: "AUD"),
            119: ProviderPrice(providerId: 119, providerName: "Amazon Prime Video", price: 8.99, currency: "AUD"),
            337: ProviderPrice(providerId: 337, providerName: "Disney+", price: 13.99, currency: "AUD"),
            15: ProviderPrice(providerId: 15, providerName: "Hulu", price: 15.99, currency: "AUD"),
            2: ProviderPrice(providerId: 2, providerName: "Apple TV+", price: 9.99, currency: "AUD"),
            531: ProviderPrice(providerId: 531, providerName: "Paramount+", price: 9.99, currency: "AUD")
        ],
        "US": [
            1899: ProviderPrice(providerId: 1899, providerName: "HBO Max", price: 15.99, currency: "USD"),
            4888: ProviderPrice(providerId: 4888, providerName: "Paramount+ with Showtime", price: 11.99, currency: "USD"),
            8: ProviderPrice(providerId: 8, providerName: "Netflix", price: 15.49, currency: "USD"),
            119: ProviderPrice(providerId: 119, providerName: "Amazon Prime Video", price: 8.99, currency: "USD"),
            337: ProviderPrice(providerId: 337, providerName: "Disney+", price: 7.99, currency: "USD"),
            15: ProviderPrice(providerId: 15, providerName: "Hulu", price: 7.99, currency: "USD"),
            2: ProviderPrice(providerId: 2, providerName: "Apple TV+", price: 6.99, currency: "USD"),
            531: ProviderPrice(providerId: 531, providerName: "Paramount+", price: 5.99, currency: "USD")
        ]
    ]

    // MARK: - Month helpers
    static func firstOfMonth(_ date: Date) -> Date {
        let cal = Calendar.current
        let comps = cal.dateComponents([.year, .month], from: date)
        return cal.date(from: comps) ?? date
    }

    func changeMonth(by delta: Int) {
        if let newDate = Calendar.current.date(byAdding: .month, value: delta, to: monthAnchor) {
            monthAnchor = CalendarViewModel.firstOfMonth(newDate)
        }
    }

    func makeMonthGrid() {
        let cal = Calendar.current
        let start = monthAnchor
        guard let range = cal.range(of: .day, in: .month, for: start) else { return }
        let firstWeekday = cal.component(.weekday, from: start) // 1=Sun ... 7=Sat
        let leading = (firstWeekday + 6) % 7 // 0..6 for Monday-first visual

        var grid: [Calendar2Day] = []
        if leading > 0, let prev = cal.date(byAdding: .day, value: -leading, to: start) {
            for i in 0..<leading {
                let d = cal.date(byAdding: .day, value: i, to: prev)!
                grid.append(Calendar2Day(id: Self.key(for: d), date: d, inMonth: false))
            }
        }
        for day in range {
            let d = cal.date(byAdding: .day, value: day - 1, to: start)!
            grid.append(Calendar2Day(id: Self.key(for: d), date: d, inMonth: true))
        }
        while grid.count % 7 != 0 { grid.append(nextDay(from: grid.last!.date, inMonth: false)) }
        while grid.count < 42 { grid.append(nextDay(from: grid.last!.date, inMonth: false)) }
        days = grid
    }

    private func nextDay(from date: Date, inMonth: Bool) -> Calendar2Day {
        let d = Calendar.current.date(byAdding: .day, value: 1, to: date)!
        return Calendar2Day(id: Self.key(for: d), date: d, inMonth: inMonth)
    }

    static func key(for date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = .current
        return f.string(from: date)
    }

    // MARK: - Data loading using TV Guide API (Step B implementation)
    func reload(api: ApiClient) async {
        isLoading = true
        error = nil
        makeMonthGrid()
        episodesByDate = [:]
        dailyProviders = [:]
        primaryProviderByDate = [:]

        do {
            let monthBounds = visibleMonthRange()
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"

            let startDate = formatter.string(from: monthBounds.0)
            let endDate = formatter.string(from: monthBounds.1)

            print("📅 Calendar: Loading TV Guide data for \(startDate) to \(endDate), country: \(country)")

            // Fetch TV guide data for the month
            let tvGuideData = try await api.getTVGuide(
                startDate: startDate,
                endDate: endDate,
                country: country
            )

            print("📺 TV Guide Response: \(tvGuideData.services.count) services, \(tvGuideData.totalShows) shows, \(tvGuideData.totalEpisodes) episodes")

            // Helper to convert ISO 8601 date to yyyy-MM-dd format
            let isoDateFormatter = DateFormatter()
            isoDateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
            isoDateFormatter.timeZone = TimeZone(abbreviation: "UTC")

            let dayFormatter = DateFormatter()
            dayFormatter.dateFormat = "yyyy-MM-dd"
            dayFormatter.timeZone = .current

            // Build episodesByDate from TV guide data
            for serviceGroup in tvGuideData.services {
                print("🎬 Service: \(serviceGroup.service.name) (ID: \(serviceGroup.service.id)) - \(serviceGroup.shows.count) shows")

                for show in serviceGroup.shows {
                    print("  📱 Show: \(show.title) (TMDB: \(show.tmdbId)) - \(show.upcomingEpisodes.count) episodes")

                    for episode in show.upcomingEpisodes {
                        print("    📅 Episode: '\(episode.title)' airDate: '\(episode.airDate)'")

                        // Convert ISO 8601 date to yyyy-MM-dd format
                        let dayKey: String
                        if let isoDate = isoDateFormatter.date(from: episode.airDate) {
                            dayKey = dayFormatter.string(from: isoDate)
                            print("      ✅ Converted '\(episode.airDate)' -> '\(dayKey)'")
                        } else {
                            // Fallback: try to extract just the date part if it's already in the right format
                            if episode.airDate.contains("T") {
                                dayKey = String(episode.airDate.prefix(10))
                                print("      ⚠️  Fallback: extracted '\(dayKey)' from '\(episode.airDate)'")
                            } else {
                                dayKey = episode.airDate
                                print("      ⚠️  Using raw date: '\(dayKey)'")
                            }
                        }

                        // Handle missing episode/season numbers gracefully
                        let episodeNumber = episode.episodeNumber ?? 0
                        let seasonNumber = episode.seasonNumber ?? 1

                        let episodeRef = EpisodeRef(
                            id: "\(show.tmdbId)-s\(seasonNumber)e\(episodeNumber)",
                            tmdbId: show.tmdbId,
                            seasonNumber: seasonNumber,
                            episodeNumber: episodeNumber,
                            title: episode.title,
                            airDate: episode.airDate
                        )

                        var episodes = episodesByDate[dayKey] ?? []
                        if !episodes.contains(episodeRef) {
                            episodes.append(episodeRef)
                        }
                        episodesByDate[dayKey] = episodes
                        print("      📝 Added episode to day '\(dayKey)' (total: \(episodes.count))")

                        // Derive providers strictly from episodes (only days with episodes get providers)
                        for service in show.streamingServices {
                            let providerBadge = ProviderBadge(
                                id: service.id,
                                name: service.name,
                                logo: service.logo
                            )

                            var providers = dailyProviders[dayKey] ?? []
                            if !providers.contains(providerBadge) {
                                providers.append(providerBadge)
                                print("      🏷️  Added provider '\(service.name)' to day '\(dayKey)' (total: \(providers.count))")
                            }
                            dailyProviders[dayKey] = providers
                        }
                    }
                }
            }

            print("📊 Final results:")
            print("   Episodes by date: \(episodesByDate.count) days")
            for (dayKey, episodes) in episodesByDate.sorted(by: { $0.key < $1.key }) {
                print("     \(dayKey): \(episodes.count) episodes")
            }
            print("   Providers by date: \(dailyProviders.count) days")
            for (dayKey, providers) in dailyProviders.sorted(by: { $0.key < $1.key }) {
                let providerNames = providers.map { $0.name }.joined(separator: ", ")
                print("     \(dayKey): \(providers.count) providers (\(providerNames))")
            }

            // Calculate primary providers for each day (only for days with episodes)
            calculatePrimaryProviders()

            print("   Primary providers: \(primaryProviderByDate.count) days")
            for (dayKey, provider) in primaryProviderByDate.sorted(by: { $0.key < $1.key }) {
                print("     \(dayKey): \(provider.name)")
            }

        } catch {
            print("❌ Calendar reload error: \(error)")
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    // MARK: - Primary Provider Selection
    private func calculatePrimaryProviders() {
        for (dayKey, providers) in dailyProviders {
            if let primary = selectPrimaryProvider(from: providers) {
                primaryProviderByDate[dayKey] = primary
            }
        }
    }

    private func selectPrimaryProvider(from providers: [ProviderBadge]) -> ProviderBadge? {
        // Only consider days with 1-3 providers that have logos
        guard providers.count >= 1 && providers.count <= 3 else { return nil }

        let providersWithLogos = providers.filter { $0.logo != nil && !$0.logo!.isEmpty }
        guard !providersWithLogos.isEmpty else { return nil }

        // Sort by name length (more characters = more popular/detailed) then by ID for stability
        let sorted = providersWithLogos.sorted { lhs, rhs in
            if lhs.name.count != rhs.name.count {
                return lhs.name.count > rhs.name.count
            }
            return lhs.id < rhs.id
        }

        return sorted.first
    }

    // MARK: - Public accessors for UI
    func primaryProvider(for dayKey: String) -> ProviderBadge? {
        return primaryProviderByDate[dayKey]
    }

    func secondaryProviders(for dayKey: String) -> [ProviderBadge] {
        guard let providers = dailyProviders[dayKey],
              let primary = primaryProviderByDate[dayKey] else {
            return dailyProviders[dayKey] ?? []
        }

        return providers.filter { $0.id != primary.id }
    }

    // MARK: - Episode access for UI
    func episodes(for dayKey: String) -> [EpisodeRef] {
        return episodesByDate[dayKey] ?? []
    }

    func hasEpisodes(for dayKey: String) -> Bool {
        return !(episodesByDate[dayKey]?.isEmpty ?? true)
    }

    // MARK: - Day Detail Data
    func getProviderPrices(for dayKey: String) -> [ProviderPrice] {
        guard let providers = dailyProviders[dayKey] else { return [] }
        let countryPricing = staticPricing[country] ?? staticPricing["US"] ?? [:]

        return providers.compactMap { provider in
            countryPricing[provider.id]
        }.sorted { $0.providerName < $1.providerName }
    }

    func getTotalCost(for dayKey: String) -> String {
        let prices = getProviderPrices(for: dayKey)
        guard !prices.isEmpty else { return "$0.00" }

        let total = prices.reduce(Decimal(0)) { $0 + $1.price }
        let currency = prices.first?.currency ?? "USD"

        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency
        return formatter.string(from: NSDecimalNumber(decimal: total)) ?? "$0.00"
    }

    func getShowsAiringOnDay(_ dayKey: String) -> [String] {
        let episodes = episodes(for: dayKey)
        // Group episodes by tmdbId to get unique shows
        let uniqueShows = Set(episodes.map { $0.tmdbId })
        return Array(uniqueShows).map { tmdbId in
            // Return the first episode's title for that show
            episodes.first { $0.tmdbId == tmdbId }?.title ?? "Unknown Show"
        }.sorted()
    }

    private func visibleMonthRange() -> (Date, Date) {
        let cal = Calendar.current
        let start = monthAnchor
        let end = cal.date(byAdding: DateComponents(month: 1, day: -1), to: start) ?? start
        return (start, end)
    }
}
