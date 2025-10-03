//
//  SimplifiedCalendarViewModel.swift
//  Tally
//
//  Simplified vertical scrolling calendar with week-based layout
//

import Foundation
import SwiftUI

// MARK: - Models

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

            // Fetch TV guide data
            let tvGuideResponse = try await api.getTVGuide(
                startDate: startDateString,
                endDate: endDateString,
                country: CountryManager.get()
            )

            print("📺 TV Guide Response: \(tvGuideResponse.services.count) services, \(tvGuideResponse.totalShows) shows, \(tvGuideResponse.totalEpisodes) episodes")

            // Build episodesByDate and dailyProviders
            buildDateMaps(from: tvGuideResponse)

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

    private func buildDateMaps(from tvGuideData: TVGuideData) {
        episodesByDate = [:]
        dailyProviders = [:]

        let isoDateFormatter = DateFormatter()
        isoDateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
        isoDateFormatter.timeZone = TimeZone(abbreviation: "UTC")

        let dayFormatter = DateFormatter()
        dayFormatter.dateFormat = "yyyy-MM-dd"
        dayFormatter.timeZone = .current

        for serviceGroup in tvGuideData.services {
            for show in serviceGroup.shows {
                for episode in show.upcomingEpisodes {
                    // Convert ISO date to yyyy-MM-dd
                    let dayKey: String
                    if let isoDate = isoDateFormatter.date(from: episode.airDate) {
                        dayKey = dayFormatter.string(from: isoDate)
                    } else if episode.airDate.contains("T") {
                        dayKey = String(episode.airDate.prefix(10))
                    } else {
                        dayKey = episode.airDate
                    }

                    // Add episode reference
                    let episodeRef = EpisodeRef(
                        id: "\(show.tmdbId)-s\(episode.seasonNumber ?? 1)e\(episode.episodeNumber ?? 0)",
                        tmdbId: show.tmdbId,
                        seasonNumber: episode.seasonNumber ?? 1,
                        episodeNumber: episode.episodeNumber ?? 0,
                        title: episode.title,
                        airDate: episode.airDate
                    )

                    var episodes = episodesByDate[dayKey] ?? []
                    if !episodes.contains(episodeRef) {
                        episodes.append(episodeRef)
                    }
                    episodesByDate[dayKey] = episodes

                    // Add provider badges
                    for service in show.streamingServices {
                        let providerBadge = ProviderBadge(
                            id: service.id,
                            name: service.name,
                            logo: service.logo
                        )

                        var providers = dailyProviders[dayKey] ?? []
                        if !providers.contains(providerBadge) {
                            providers.append(providerBadge)
                        }
                        dailyProviders[dayKey] = providers
                    }
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
        let episodes = episodesByDate[dateString] ?? []

        // Group episodes by show (tmdbId)
        var showEpisodes: [Int: [EpisodeRef]] = [:]
        for episode in episodes {
            var list = showEpisodes[episode.tmdbId] ?? []
            list.append(episode)
            showEpisodes[episode.tmdbId] = list
        }

        // Create cards (need to fetch show details for title and poster)
        // For now, return placeholder data
        return episodes.map { episode in
            EpisodeCardData(
                id: episode.id,
                showTitle: episode.title, // Placeholder (this is episode title, not show title)
                posterPath: nil,
                episodeNumber: "S\(episode.seasonNumber)E\(episode.episodeNumber)",
                episodeTitle: episode.title,
                synopsis: "Episode synopsis coming soon...",
                tmdbId: episode.tmdbId
            )
        }
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
}
