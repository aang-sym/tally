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

struct MonthData: Identifiable {
    let id: UUID
    let monthYear: String  // "MMMM yyyy" format
    let weeks: [WeekData]
    let startDate: Date

    init(monthYear: String, weeks: [WeekData], startDate: Date) {
        self.id = UUID()
        self.monthYear = monthYear
        self.weeks = weeks
        self.startDate = startDate
    }
}

struct WeekData: Identifiable {
    let id: UUID
    let days: [DayData?]  // Optional to support empty cells
    let startDate: Date

    init(days: [DayData?], startDate: Date) {
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
    let providerId: Int?
    let providerLogo: String?
    let providerName: String?
    let providerColor: Color?
    let recurringDay: Int? // Day of month provider renews (1-31)
}

// MARK: - ViewModel

@MainActor
final class SimplifiedCalendarViewModel: ObservableObject {
    @Published var months: [MonthData] = []
    @Published var selectedDate: String?
    @Published var lockedWeekIndex: (monthIndex: Int, weekIndex: Int)?
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

    // MARK: - Month/Week Generation

    private func generateWeeks(from startDate: Date, to endDate: Date) {
        months = []

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let monthFormatter = DateFormatter()
        monthFormatter.dateFormat = "MMMM yyyy"
        let today = calendar.startOfDay(for: Date())

        // Group weeks by month for proper alignment
        var currentMonth = calendar.dateComponents([.year, .month], from: startDate)

        while let monthDate = calendar.date(from: currentMonth),
              monthDate <= endDate {

            // Get first and last day of this month
            guard let firstDayOfMonth = calendar.date(from: currentMonth),
                  let range = calendar.range(of: .day, in: .month, for: firstDayOfMonth),
                  let lastDayOfMonth = calendar.date(byAdding: .day, value: range.count - 1, to: firstDayOfMonth) else {
                // Move to next month
                currentMonth.month! += 1
                continue
            }

            // Get weekday of first day (1 = Sunday, 2 = Monday, etc.)
            let firstWeekday = calendar.component(.weekday, from: firstDayOfMonth)
            // Convert to Monday-based (0 = Monday, 6 = Sunday)
            let leadingBlanks = (firstWeekday + 5) % 7

            // Create weeks for this month
            var monthWeeks: [WeekData] = []
            var currentDay = firstDayOfMonth
            var dayOfMonth = 1

            while currentDay <= lastDayOfMonth {
                var weekDays: [DayData?] = []

                // For first week, add leading blanks
                if dayOfMonth == 1 {
                    for _ in 0..<leadingBlanks {
                        weekDays.append(nil)
                    }
                }

                // Add days for this week
                while weekDays.count < 7 && currentDay <= lastDayOfMonth {
                    let dayStart = calendar.startOfDay(for: currentDay)
                    let dateString = formatter.string(from: currentDay)
                    let dayNumber = calendar.component(.day, from: currentDay)
                    let isPast = dayStart < today

                    // Get providers and create pips
                    let providers = dailyProviders[dateString] ?? []
                    let pips = createEpisodePips(for: dateString, providers: providers)
                    let resubProviders = getResubscriptionProviders(for: dateString)

                    let dayData = DayData(
                        date: currentDay,
                        dateString: dateString,
                        dayNumber: dayNumber,
                        inCurrentMonth: true,
                        isPast: isPast,
                        providers: providers,
                        episodePips: pips,
                        resubscriptionProviders: resubProviders
                    )

                    weekDays.append(dayData)

                    guard let nextDay = calendar.date(byAdding: .day, value: 1, to: currentDay) else { break }
                    currentDay = nextDay
                    dayOfMonth += 1
                }

                // For last week, add trailing blanks
                while weekDays.count < 7 {
                    weekDays.append(nil)
                }

                monthWeeks.append(WeekData(days: weekDays, startDate: firstDayOfMonth))
            }

            // Create MonthData with all weeks for this month
            let monthYearString = monthFormatter.string(from: firstDayOfMonth)
            months.append(MonthData(monthYear: monthYearString, weeks: monthWeeks, startDate: firstDayOfMonth))

            // Move to next month
            currentMonth.month! += 1
        }

        print("📆 Generated \(months.count) months with weeks")
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

    func selectDay(_ dayData: DayData, monthIndex: Int, weekIndex: Int) {
        if selectedDate == dayData.dateString {
            // Deselect if tapping same day
            selectedDate = nil
            lockedWeekIndex = nil
        } else {
            // Select new day
            selectedDate = dayData.dateString
            lockedWeekIndex = (monthIndex, weekIndex)
        }
    }

    func isSelected(_ dayData: DayData) -> Bool {
        selectedDate == dayData.dateString
    }

    func isWeekLocked(monthIndex: Int, weekIndex: Int) -> Bool {
        guard let locked = lockedWeekIndex else { return false }
        return locked.monthIndex == monthIndex && locked.weekIndex == weekIndex
    }

    // MARK: - Episode Cards

    func getEpisodeCards(for dateString: String) async -> [EpisodeCardData] {
        print("📋 getEpisodeCards called for date: \(dateString)")
        let episodes = episodesByDate[dateString] ?? []
        print("📋 Found \(episodes.count) episode refs for \(dateString)")

        // Get providers for this date
        let providers = dailyProviders[dateString] ?? []
        let primaryProvider = providers.first

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

            // Get recurring day and color for the provider
            var recurringDay: Int? = nil
            var providerColor: Color? = nil
            if let provider = primaryProvider {
                recurringDay = getRecurringDay(for: provider.id)
                providerColor = colorForProvider(provider.id)
            }

            let episodeCard = EpisodeCardData(
                id: episode.id,
                showTitle: showMetadata.title,
                posterPath: showMetadata.posterPath,
                episodeNumber: "S\(episode.seasonNumber)E\(episode.episodeNumber)",
                episodeTitle: episode.title,
                synopsis: displaySynopsis,
                tmdbId: episode.tmdbId,
                providerId: primaryProvider?.id,
                providerLogo: primaryProvider?.logo,
                providerName: primaryProvider?.name,
                providerColor: providerColor,
                recurringDay: recurringDay
            )
            episodeCards.append(episodeCard)
        }

        print("📋 Returning \(episodeCards.count) episode cards")
        return episodeCards
    }

    // MARK: - Provider Helpers

    private func getRecurringDay(for providerId: Int) -> Int? {
        // Search through resubscriptionDates to find this provider's recurring day
        for (dateString, providers) in resubscriptionDates {
            if providers.contains(where: { $0.id == providerId }) {
                // Extract day from date string (format: "yyyy-MM-dd")
                let components = dateString.split(separator: "-")
                if components.count == 3, let day = Int(components[2]) {
                    return day
                }
            }
        }
        return nil
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

    /// Find the month and week index containing today's date
    func findTodayWeekIndex() -> (monthIndex: Int, weekIndex: Int)? {
        let todayString = Self.key(for: Date())

        for (monthIndex, month) in months.enumerated() {
            if let weekIndex = month.weeks.firstIndex(where: { week in
                week.days.contains { $0?.dateString == todayString }
            }) {
                return (monthIndex, weekIndex)
            }
        }
        return nil
    }

    /// Select today's date
    func selectToday() {
        let todayString = Self.key(for: Date())

        // Find the day data for today
        for (monthIndex, month) in months.enumerated() {
            for (weekIndex, week) in month.weeks.enumerated() {
                if let todayData = week.days.compactMap({ $0 }).first(where: { $0.dateString == todayString }) {
                    selectDay(todayData, monthIndex: monthIndex, weekIndex: weekIndex)
                    return
                }
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
                guard let provider = allProviders[providerId] else {
                    // Provider not found in allProviders - check if it should have been there
                    if thisDayOfMonth == billingDay {
                        print("⚠️ Provider \(providerId) not found for billing day \(billingDay) on \(dateString)")
                    }
                    continue
                }

                // Match day of month (accounting for months with fewer days)
                let isLastDayOfMonth = thisDayOfMonth == calendar.range(of: .day, in: .month, for: currentDate)?.count
                if thisDayOfMonth == billingDay || (billingDay > 28 && isLastDayOfMonth) {
                    if resubscriptionDates[dateString] == nil {
                        resubscriptionDates[dateString] = []
                    }
                    if !resubscriptionDates[dateString]!.contains(provider) {
                        resubscriptionDates[dateString]?.append(provider)
                        print("💳 Added \(provider.name) (id:\(provider.id)) billing on \(dateString) (day \(thisDayOfMonth)), logo: \(provider.logo ?? "nil")")
                    }
                }
            }

            guard let nextDate = calendar.date(byAdding: .day, value: 1, to: currentDate) else { break }
            currentDate = nextDate
        }

        print("📅 Calculated \(resubscriptionDates.count) resubscription dates with monthly recurrence")
    }
}
