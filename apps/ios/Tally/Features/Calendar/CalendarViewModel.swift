//
//  CalendarViewModel.swift
//  Tally
//
//  ViewModel for calendar functionality with provider indicators per day
//

import SwiftUI
import Foundation

@MainActor
class CalendarViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var country: String = CountryManager.get()
    @Published var monthAnchor: Date = Calendar.current.startOfMonth(for: Date()) ?? Date()
    @Published var isLoading = false
    @Published var error: String?

    // Calendar data
    @Published var dailyProviders: [String: [Provider]] = [:]

    // Internal properties
    var api: ApiClient?
    private var cache: [String: [String: [Provider]]] = [:]  // [monthKey: [dayKey: providers]]

    // MARK: - Computed Properties

    var visibleDays: [CalendarDay] {
        generateCalendarDays()
    }

    var monthTitle: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM"
        return formatter.string(from: monthAnchor)
    }

    var yearTitle: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy"
        return formatter.string(from: monthAnchor)
    }

    var weekDayNames: [String] {
        let formatter = DateFormatter()
        return formatter.shortWeekdaySymbols
    }

    // MARK: - Cache Key Helpers

    private func monthKey(for date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM"
        return "\(formatter.string(from: date))-\(country)"
    }

    private func dayKey(for date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    // MARK: - Public Methods

    func setCountry(_ newCountry: String) {
        country = newCountry
        CountryManager.set(newCountry)
    }

    func previousMonth() {
        monthAnchor = Calendar.current.date(byAdding: .month, value: -1, to: monthAnchor) ?? monthAnchor
    }

    func nextMonth() {
        monthAnchor = Calendar.current.date(byAdding: .month, value: 1, to: monthAnchor) ?? monthAnchor
    }

    func goToToday() {
        monthAnchor = Calendar.current.startOfMonth(for: Date()) ?? Date()
    }

    func clearError() {
        error = nil
    }

    // MARK: - Data Loading

    func loadForMonth() async {
        guard let api = api else { return }

        let key = monthKey(for: monthAnchor)

        // Check cache first
        if let cachedData = cache[key] {
            dailyProviders = cachedData
            return
        }

        isLoading = true
        error = nil

        do {
            // Fetch user's watching shows
            let watchingShows = try await api.getWatchlist(status: .watching)

            // Build daily providers dictionary
            var newDailyProviders: [String: [Provider]] = [:]

            // Process each watching show
            for userShow in watchingShows.prefix(20) { // Limit to 20 shows for MVP
                guard let tmdbId = userShow.show.tmdbId else { continue }

                do {
                    // Get show analysis to find providers
                    let analysis = try await api.analyzeShow(tmdbId: tmdbId, country: country)

                    // Convert WatchProviders to Providers
                    let providers = analysis.watchProviders?.compactMap { watchProvider in
                        Provider(
                            id: watchProvider.providerId,
                            name: watchProvider.name,
                            logo: watchProvider.logo
                        )
                    } ?? []

                    // Get season information to find episode air dates
                    for season in analysis.seasonInfo {
                        guard season.seasonNumber > 0 else { continue } // Skip specials

                        do {
                            let seasonData = try await api.getSeasonRaw(
                                tmdbId: tmdbId,
                                season: season.seasonNumber,
                                country: country
                            )

                            // Process episodes and their air dates
                            for episode in seasonData.episodes {
                                guard let airDateString = episode.airDate,
                                      let airDate = parseAirDate(airDateString),
                                      isDateInCurrentMonth(airDate) else { continue }

                                let dayKey = dayKey(for: airDate)

                                // Add providers for this day if not already present
                                if newDailyProviders[dayKey] == nil {
                                    newDailyProviders[dayKey] = []
                                }

                                // Add unique providers for this day
                                for provider in providers {
                                    if !newDailyProviders[dayKey]!.contains(where: { $0.id == provider.id }) {
                                        newDailyProviders[dayKey]!.append(provider)
                                    }
                                }
                            }
                        } catch {
                            // Continue processing other seasons if one fails
                            print("Failed to load season \(season.seasonNumber) for show \(tmdbId): \(error)")
                        }
                    }
                } catch {
                    // Continue processing other shows if one fails
                    print("Failed to analyze show \(tmdbId): \(error)")
                }
            }

            // Update UI and cache
            dailyProviders = newDailyProviders
            cache[key] = newDailyProviders

        } catch {
            self.error = mapErrorToUserFriendlyMessage(error)
        }

        isLoading = false
    }

    // MARK: - Helper Methods

    private func generateCalendarDays() -> [CalendarDay] {
        let calendar = Calendar.current
        let startOfMonth = monthAnchor

        // Get first day of the month and the weekday it falls on
        let firstWeekday = calendar.component(.weekday, from: startOfMonth)
        let daysFromPreviousMonth = firstWeekday - 1

        // Calculate start date (may include days from previous month)
        let startDate = calendar.date(byAdding: .day, value: -daysFromPreviousMonth, to: startOfMonth) ?? startOfMonth

        // Generate 42 days (6 weeks)
        var days: [CalendarDay] = []
        for i in 0..<42 {
            if let date = calendar.date(byAdding: .day, value: i, to: startDate) {
                let dayKey = dayKey(for: date)
                let providers = dailyProviders[dayKey] ?? []
                days.append(CalendarDay(date: date, providers: providers))
            }
        }

        return days
    }

    private func parseAirDate(_ dateString: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: dateString)
    }

    private func isDateInCurrentMonth(_ date: Date) -> Bool {
        let calendar = Calendar.current
        let dateComponents = calendar.dateComponents([.year, .month], from: date)
        let monthComponents = calendar.dateComponents([.year, .month], from: monthAnchor)

        return dateComponents.year == monthComponents.year &&
               dateComponents.month == monthComponents.month
    }

    private func mapErrorToUserFriendlyMessage(_ error: Error) -> String {
        if let apiError = error as? ApiError {
            switch apiError {
            case .unauthorized:
                return "Please log in to view your calendar"
            case .network:
                return "Network error. Please check your connection"
            case .timeout:
                return "Request timed out. Please try again"
            case .badStatus(let code):
                return "Server error (\(code)). Please try again"
            case .cannotParse:
                return "Invalid response from server"
            case .underlying(let underlyingError):
                return "Error: \(underlyingError.localizedDescription)"
            }
        }

        return "Something went wrong. Please try again"
    }
}

// MARK: - Supporting Types

struct CalendarDay {
    let date: Date
    let providers: [Provider]
}

struct Provider: Identifiable {
    let id: Int
    let name: String
    let logo: String?
}

// MARK: - Calendar Extensions

extension Calendar {
    func startOfMonth(for date: Date) -> Date? {
        let components = dateComponents([.year, .month], from: date)
        return self.date(from: components)
    }
}