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

    init(
        date: Date,
        dateString: String,
        dayNumber: Int,
        inCurrentMonth: Bool,
        isPast: Bool,
        providers: [ProviderBadge],
        episodePips: [ProviderPip]
    ) {
        self.id = UUID()
        self.date = date
        self.dateString = dateString
        self.dayNumber = dayNumber
        self.inCurrentMonth = inCurrentMonth
        self.isPast = isPast
        self.providers = providers
        self.episodePips = episodePips
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

    // Provider color mapping (hardcoded for now, could be moved to configuration)
    private let providerColors: [Int: Color] = [
        8: Color.red,        // Netflix
        119: Color.blue,     // Amazon Prime
        337: Color.purple,   // Disney+
        15: Color.green,     // Hulu
        1899: Color.purple,  // HBO Max
        2: Color.gray,       // Apple TV+
        531: Color.blue,     // Paramount+
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

            // Generate weeks
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

                let dayData = DayData(
                    date: dayDate,
                    dateString: dateString,
                    dayNumber: dayNumber,
                    inCurrentMonth: inCurrentMonth,
                    isPast: isPast,
                    providers: providers,
                    episodePips: pips
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
}
