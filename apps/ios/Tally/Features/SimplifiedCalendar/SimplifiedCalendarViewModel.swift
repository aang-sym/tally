//
//  SimplifiedCalendarViewModel.swift
//  Tally
//
//  Simplified vertical scrolling calendar with week-based layout
//

import Foundation
import SwiftUI

// MARK: - Models

struct ShowMetadata {
    let tmdbId: Int
    let title: String
    let posterPath: String?
}

struct WeekData: Identifiable {
    let id: UUID
    let days: [DayData]
    let startDate: Date

    init(days: [DayData], startDate: Date) {
        self.id = UUID()
        self.days = days
        self.startDate = startDate
    }
}

struct DayData: Identifiable {
    let id: UUID
    let date: Date
    let dateString: String // "yyyy-MM-dd"
    let dayNumber: Int
    let inCurrentMonth: Bool
    let isPast: Bool
    let providers: [ProviderBadge]
    let episodePips: [ProviderPip]
    let resubscriptionProviders: [ProviderBadge] // Providers to resubscribe on this day

    init(
        date: Date,
        dateString: String,
        dayNumber: Int,
        inCurrentMonth: Bool,
        isPast: Bool,
        providers: [ProviderBadge],
        episodePips: [ProviderPip],
        resubscriptionProviders: [ProviderBadge] = []
    ) {
        self.id = UUID()
        self.date = date
        self.dateString = dateString
        self.dayNumber = dayNumber
        self.inCurrentMonth = inCurrentMonth
        self.isPast = isPast
        self.providers = providers
        self.episodePips = episodePips
        self.resubscriptionProviders = resubscriptionProviders
    }
}

struct ProviderPip: Identifiable {
    let id: UUID
    let providerColor: Color
    let providerId: Int

    init(providerColor: Color, providerId: Int) {
        self.id = UUID()
        self.providerColor = providerColor
        self.providerId = providerId
    }
}

struct EpisodeCardData: Identifiable {
    let id: String
    let showTitle: String
    let posterPath: String?
    let episodeNumber: String // "S1E4"
    let episodeTitle: String
    let synopsis: String
    let tmdbId: Int
}

// MARK: - ViewModel

@MainActor
final class SimplifiedCalendarViewModel: ObservableObject {
    @Published var weeks: [WeekData] = []
    @Published var selectedDate: String?
    @Published var lockedWeekIndex: Int?
    @Published var currentMonthYear: String = ""
    @Published var isLoading: Bool = false
    @Published var error: String?

    // Date-based lookups (from CalendarViewModel)
    private var episodesByDate: [String: [EpisodeRef]] = [:]
    private var dailyProviders: [String: [ProviderBadge]] = [:]
    private var showsByTmdbId: [Int: ShowMetadata] = [:]

    // Resubscription tracking (will be API-driven later)
    private var resubscriptionDates: [String: [ProviderBadge]] = [:] // dateString -> providers to resubscribe

    // Provider color mapping (hardcoded for now, could be moved to configuration)
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

    private static let weeksBuffer = 16 // ±8 weeks from today
    private let calendar = Calendar.current

    // MARK: - Initialization

    func reload(api: ApiClient) async {
        isLoading = true
        error = nil

        do {
            // Calculate date range (±8 weeks from today)
            let today = Date()
            guard let startDate = calendar.date(byAdding: .weekOfYear, value: -8, to: today),
                  let endDate = calendar.date(byAdding: .weekOfYear, value: 8, to: today) else {
                throw NSError(domain: "SimplifiedCalendar", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to calculate date range"])
            }

            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"

            let startDateString = formatter.string(from: startDate)
            let endDateString = formatter.string(from: endDate)

            print("📅 Simplified Calendar: Loading data from \(startDateString) to \(endDateString)")

            // Fetch TV guide data using TVGuide2 API (which properly includes episode details)
            print("📅 Starting getTVGuide2Data call...")
            let tvGuide2Data = try await api.getTVGuide2Data(
                startDate: startDateString,
                endDate: endDateString,
                country: CountryManager.get()
            )

            print("📺 TV Guide2 Response: \(tvGuide2Data.providers.count) providers")
            print("📅 Finished getTVGuide2Data call")

            // Build episodesByDate and dailyProviders
            buildDateMaps(from: tvGuide2Data)

            // Calculate mock resubscription dates first
            calculateMockResubscriptionDates(startDate: startDate, endDate: endDate)

            // Generate weeks (will include resubscription providers)
            generateWeeks(from: startDate, to: endDate)

            // Set initial month header
            updateMonthHeader(for: today)

        } catch {
            print("❌ Simplified Calendar reload error: \(error)")
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Data Building

    private func buildDateMaps(from tvGuide2Data: TVGuide2Data) {
        episodesByDate = [:]
        dailyProviders = [:]
        showsByTmdbId = [:]

        let dayFormatter = DateFormatter()
        dayFormatter.dateFormat = "yyyy-MM-dd"
        dayFormatter.timeZone = .current

        // TVGuide2Data structure: providers -> shows -> episodes
        for provider in tvGuide2Data.providers {
            for show in provider.shows {
                // Store show metadata
                if showsByTmdbId[show.tmdbId] == nil {
                    showsByTmdbId[show.tmdbId] = ShowMetadata(
                        tmdbId: show.tmdbId,
                        title: show.title,
                        posterPath: show.posterPath
                    )
                }

                for episode in show.episodes {
                    // Debug logging
                    print("🔍 Episode for \(show.title): S\(episode.seasonNumber)E\(episode.episodeNumber) - \(episode.title)")
                    print("   Overview: \(episode.overview ?? "nil")")

                    // airDate in TVGuide2Episode is already yyyy-MM-dd format
                    let dayKey = episode.airDate

                    // Add episode reference
                    let episodeRef = EpisodeRef(
                        id: episode.id,
                        tmdbId: episode.tmdbId,
                        seasonNumber: episode.seasonNumber,
                        episodeNumber: episode.episodeNumber,
                        title: episode.title,
                        airDate: episode.airDate,
                        overview: episode.overview
                    )

                    var episodes = episodesByDate[dayKey] ?? []
                    if !episodes.contains(episodeRef) {
                        episodes.append(episodeRef)
                    }
                    episodesByDate[dayKey] = episodes

                    // Add provider badge for this show's streaming service
                    let providerBadge = ProviderBadge(
                        id: provider.id,
                        name: provider.name,
                        logo: provider.logoPath
                    )

                    var providers = dailyProviders[dayKey] ?? []
                    if !providers.contains(providerBadge) {
                        providers.append(providerBadge)
                    }
                    dailyProviders[dayKey] = providers
                }
            }
        }

        print("📊 Simplified Calendar: Built \(episodesByDate.count) days with episodes, \(dailyProviders.count) days with providers")
    }

    // MARK: - Week Generation

    private func generateWeeks(from startDate: Date, to endDate: Date) {
        weeks = []

        // Find the Monday of the week containing startDate
        var currentWeekStart = calendar.dateComponents([.calendar, .yearForWeekOfYear, .weekOfYear], from: startDate)
        currentWeekStart.weekday = 2 // Monday
        guard var weekStart = calendar.date(from: currentWeekStart) else { return }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        let today = calendar.startOfDay(for: Date())

        while weekStart <= endDate {
            var weekDays: [DayData] = []

            for dayOffset in 0..<7 {
                guard let dayDate = calendar.date(byAdding: .day, value: dayOffset, to: weekStart) else { continue }
                let dayStart = calendar.startOfDay(for: dayDate)
                let dateString = formatter.string(from: dayDate)

                let dayNumber = calendar.component(.day, from: dayDate)
                let dayMonth = calendar.component(.month, from: dayDate)
                let currentMonth = calendar.component(.month, from: Date())
                let inCurrentMonth = dayMonth == currentMonth
                let isPast = dayStart < today

                // Get providers and create pips
                let providers = dailyProviders[dateString] ?? []
                let pips = createEpisodePips(for: dateString, providers: providers)

                // Get resubscription providers for this day
                let resubProviders = getResubscriptionProviders(for: dateString)

                let dayData = DayData(
                    date: dayDate,
                    dateString: dateString,
                    dayNumber: dayNumber,
                    inCurrentMonth: inCurrentMonth,
                    isPast: isPast,
                    providers: providers,
                    episodePips: pips,
                    resubscriptionProviders: resubProviders
                )

                weekDays.append(dayData)
            }

            weeks.append(WeekData(days: weekDays, startDate: weekStart))

            guard let nextWeek = calendar.date(byAdding: .weekOfYear, value: 1, to: weekStart) else { break }
            weekStart = nextWeek
        }

        print("📆 Generated \(weeks.count) weeks")
    }

    private func createEpisodePips(for dateString: String, providers: [ProviderBadge]) -> [ProviderPip] {
        let episodes = episodesByDate[dateString] ?? []
        guard !episodes.isEmpty else { return [] }

        // Create pips based on provider colors (max 3)
        var pips: [ProviderPip] = []
        for provider in providers.prefix(3) {
            let color = providerColors[provider.id] ?? .gray
            pips.append(ProviderPip(providerColor: color, providerId: provider.id))
        }

        return pips
    }

    // MARK: - Selection & Locking

    func selectDay(_ dayData: DayData) {
        if selectedDate == dayData.dateString {
            // Deselect if tapping same day
            selectedDate = nil
            lockedWeekIndex = nil
        } else {
            // Select new day
            selectedDate = dayData.dateString

            // Find which week contains this day
            if let weekIndex = weeks.firstIndex(where: { week in
                week.days.contains(where: { $0.dateString == dayData.dateString })
            }) {
                lockedWeekIndex = weekIndex
            }
        }
    }

    func isSelected(_ dayData: DayData) -> Bool {
        selectedDate == dayData.dateString
    }

    func isWeekLocked(_ weekIndex: Int) -> Bool {
        lockedWeekIndex == weekIndex
    }

    // MARK: - Episode Cards

    func getEpisodeCards(for dateString: String) async -> [EpisodeCardData] {
        print("📋 getEpisodeCards called for date: \(dateString)")
        let episodes = episodesByDate[dateString] ?? []
        print("📋 Found \(episodes.count) episode refs for \(dateString)")

        // Since we're now using TVGuide2Data, episodes already have all the data we need
        var episodeCards: [EpisodeCardData] = []

        for episode in episodes {
            print("  - Episode: tmdbId=\(episode.tmdbId), S\(episode.seasonNumber)E\(episode.episodeNumber), title=\(episode.title), overview=\(episode.overview ?? "nil")")

            guard let showMetadata = showsByTmdbId[episode.tmdbId] else {
                print("⚠️ No show metadata found for tmdbId: \(episode.tmdbId)")
                continue
            }

            let synopsis = episode.overview?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let displaySynopsis = synopsis.isEmpty ? "Synopsis not yet available for this episode." : synopsis

            let episodeCard = EpisodeCardData(
                id: episode.id,
                showTitle: showMetadata.title,
                posterPath: showMetadata.posterPath,
                episodeNumber: "S\(episode.seasonNumber)E\(episode.episodeNumber)",
                episodeTitle: episode.title,
                synopsis: displaySynopsis,
                tmdbId: episode.tmdbId
            )
            episodeCards.append(episodeCard)
        }

        print("📋 Returning \(episodeCards.count) episode cards")
        return episodeCards
    }

    // MARK: - Month Header

    func updateMonthHeader(for date: Date) {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        currentMonthYear = formatter.string(from: date)
    }

    // MARK: - Helpers

    static func key(for date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = .current
        return f.string(from: date)
    }

    /// Find the week index containing today's date
    func findTodayWeekIndex() -> Int? {
        let todayString = Self.key(for: Date())
        return weeks.firstIndex { week in
            week.days.contains { $0.dateString == todayString }
        }
    }

    /// Select today's date
    func selectToday() {
        let todayString = Self.key(for: Date())

        // Find the day data for today
        for (weekIndex, week) in weeks.enumerated() {
            if let todayData = week.days.first(where: { $0.dateString == todayString }) {
                selectDay(todayData)
                return
            }
        }
    }

    /// Get all unique providers across all dates
    func getAllProviders() -> [ProviderBadge] {
        var providerMap: [Int: ProviderBadge] = [:]
        for providers in dailyProviders.values {
            for provider in providers {
                providerMap[provider.id] = provider
            }
        }
        return Array(providerMap.values).sorted { $0.name < $1.name }
    }

    /// Get color for a provider ID
    func colorForProvider(_ providerId: Int) -> Color {
        return providerColors[providerId] ?? .gray
    }

    /// Get provider badges for resubscription on a specific date
    func getResubscriptionProviders(for dateString: String) -> [ProviderBadge] {
        return resubscriptionDates[dateString] ?? []
    }

    // MARK: - Mock Resubscription Logic

    /// Calculate mock resubscription dates
    /// Hardcoded billing dates for each provider that repeat monthly
    /// TODO: Replace with API-driven resubscription dates
    private func calculateMockResubscriptionDates(startDate: Date, endDate: Date) {
        resubscriptionDates = [:]

        // Hardcoded billing day of month for each provider
        let providerBillingDays: [Int: Int] = [
            8: 15,        // Netflix - 15th of each month
            119: 3,       // Amazon Prime - 3rd of each month
            337: 12,      // Disney+ - 12th of each month
            15: 7,        // Hulu - 7th of each month
            1899: 21,     // HBO Max - 21st of each month
            2: 5,         // Apple TV+ - 5th of each month
            531: 10,      // Paramount+ - 10th of each month
            283: 19       // Crunchyroll - 19th of each month
        ]

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        // Get all unique providers from dailyProviders
        var allProviders: [Int: ProviderBadge] = [:]
        for providers in dailyProviders.values {
            for provider in providers {
                allProviders[provider.id] = provider
            }
        }

        print("🔍 Found \(allProviders.count) unique providers: \(allProviders.keys.sorted())")

        // Iterate through each day in the date range
        var currentDate = startDate
        while currentDate <= endDate {
            let thisDayOfMonth = calendar.component(.day, from: currentDate)
            let dateString = formatter.string(from: currentDate)

            // Check if this day matches any provider's billing day
            for (providerId, billingDay) in providerBillingDays {
                guard let provider = allProviders[providerId] else { continue }

                // Match day of month (accounting for months with fewer days)
                let isLastDayOfMonth = thisDayOfMonth == calendar.range(of: .day, in: .month, for: currentDate)?.count
                if thisDayOfMonth == billingDay || (billingDay > 28 && isLastDayOfMonth) {
                    if resubscriptionDates[dateString] == nil {
                        resubscriptionDates[dateString] = []
                    }
                    if !resubscriptionDates[dateString]!.contains(provider) {
                        resubscriptionDates[dateString]?.append(provider)
                        print("💳 Added \(provider.name) billing on \(dateString) (day \(thisDayOfMonth))")
                    }
                }
            }

            guard let nextDate = calendar.date(byAdding: .day, value: 1, to: currentDate) else { break }
            currentDate = nextDate
        }

        print("📅 Calculated \(resubscriptionDates.count) resubscription dates with monthly recurrence")
    }
}
