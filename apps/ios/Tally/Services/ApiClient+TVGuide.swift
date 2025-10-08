//
//  ApiClient+TVGuide.swift
//  Tally
//
//  TV Guide data API methods and models
//

import Foundation

// MARK: - TVGuide2 Response Model
private struct TVGuide2Response: Codable {
    let success: Bool
    let data: TVGuide2Data
}

// MARK: - TV Guide Response Model
private struct TVGuideResponse: Codable {
    let success: Bool
    let data: TVGuideData
}

// MARK: - TVGuide Extension

extension ApiClient {
    /// Get TV Guide data for grid view (providers x dates)
    @MainActor
    func getTVGuide2Data(startDate: String? = nil, endDate: String? = nil, country: String? = nil) async throws -> TVGuide2Data {
        // Build the data by combining watchlist shows with episode data
        let watchingShows = try await getWatchlist(status: .watching)
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"

        let today = Date()
        // Expand date range to capture more episodes - check past 7 days and next 60 days
        let startDateObj = Calendar.current.date(byAdding: .day, value: -7, to: today) ?? today
        let endDateObj = Calendar.current.date(byAdding: .day, value: 60, to: today) ?? today
        let start = startDate ?? dateFormatter.string(from: startDateObj)
        let end = endDate ?? dateFormatter.string(from: endDateObj)

        var providerGroups: [Int: TVGuide2Provider] = [:]
        var totalEpisodes = 0

        for (index, userShow) in watchingShows.enumerated() {
            guard let tmdbId = userShow.show.tmdbId else { continue }

            // Use proper country code - fallback to US if not provided
            let showCountry = country ?? "US"

            // Start with more recent seasons (typically where new episodes air)
            // Only fetch seasons that are likely to have current episodes
            var allEpisodes: [TVGuide2Episode] = []
            let seasonsToCheck = getRelevantSeasons(for: userShow.show)

            // Add small delay between requests to avoid overwhelming the API
            if index > 0 {
                try await Task.sleep(nanoseconds: 100_000_000) // 100ms delay
            }

            for season in seasonsToCheck {
                do {
                    let seasonData = try await getSeasonRaw(tmdbId: tmdbId, season: season, country: showCountry)

                    // Convert episodes to TVGuide2Episode format
                    let tvGuide2Episodes = seasonData.episodes.compactMap { episode -> TVGuide2Episode? in
                        guard let airDate = episode.airDate,
                              airDate >= start && airDate <= end else { return nil }

                        // Create a manual TVGuide2Episode since we need more control
                        let tvGuide2Episode = TVGuide2Episode.createManually(
                            tmdbId: tmdbId,
                            seasonNumber: season,
                            episodeNumber: episode.episodeNumber,
                            airDate: airDate,
                            title: episode.name ?? "Episode \(episode.episodeNumber)",
                            overview: episode.overview,
                            isWatched: false, // TODO: Get from progress API
                            rating: nil
                        )
                        return tvGuide2Episode
                    }

                    allEpisodes.append(contentsOf: tvGuide2Episodes)
                    totalEpisodes += tvGuide2Episodes.count

                    // Small delay between season requests
                    if season != seasonsToCheck.last {
                        try await Task.sleep(nanoseconds: 50_000_000) // 50ms delay
                    }

                } catch ApiError.badStatus(let statusCode) where statusCode >= 500 {
                    #if DEBUG
                    print("Server error (\(statusCode)) fetching season \(season) for show \(userShow.show.title) - skipping")
                    #endif
                    continue
                } catch ApiError.badStatus(404) {
                    #if DEBUG
                    print("Season \(season) not found for show \(userShow.show.title) - skipping")
                    #endif
                    continue
                } catch {
                    #if DEBUG
                    print("Failed to fetch season \(season) for show \(userShow.show.title): \(error)")
                    #endif
                    continue
                }
            }

            // Only include shows that have episodes in the date range
            if !allEpisodes.isEmpty {
                // Group by streaming provider
                let providerId = userShow.streamingProvider?.id ?? 0
                let providerName = userShow.streamingProvider?.name ?? "Unknown"
                let logoPath = userShow.streamingProvider?.logoPath

                #if DEBUG
                if let logoPath = logoPath, !logoPath.isEmpty {
                    print("TVGuide2: provider \(providerName) (id: \(providerId)) logoPath=\(logoPath)")
                } else {
                    print("TVGuide2: provider \(providerName) (id: \(providerId)) missing logoPath")
                }
                #endif

                let tvGuide2Show = TVGuide2Show.createManually(
                    tmdbId: tmdbId,
                    title: userShow.show.title,
                    posterPath: userShow.show.posterPath,
                    episodes: allEpisodes,
                    countryCode: showCountry,
                    bufferDays: 3
                )

                if let existingProvider = providerGroups[providerId] {
                    var updatedShows = existingProvider.shows
                    updatedShows.append(tvGuide2Show)
                    providerGroups[providerId] = TVGuide2Provider.createManually(
                        id: existingProvider.id,
                        name: existingProvider.name,
                        logoPath: existingProvider.logoPath,
                        shows: updatedShows
                    )
                } else {
                    providerGroups[providerId] = TVGuide2Provider.createManually(
                        id: providerId,
                        name: providerName,
                        logoPath: logoPath,
                        shows: [tvGuide2Show]
                    )
                }
            }
        }

        let finalData = TVGuide2Data(
            providers: Array(providerGroups.values).sorted { $0.name < $1.name },
            startDate: start,
            endDate: end,
            totalShows: watchingShows.count,
            totalEpisodes: totalEpisodes
        )

        #if DEBUG
        print("\n=== TVGuide2 FINAL SUMMARY ===")
        print("Date Range: \(start) to \(end)")
        print("Total Watching Shows: \(watchingShows.count)")
        print("Providers with Episodes: \(finalData.providers.count)")
        print("Total Episodes Found: \(totalEpisodes)")

        for provider in finalData.providers {
            print("\n📺 \(provider.name): \(provider.shows.count) shows")
            for show in provider.shows {
                print("  • \(show.title): \(show.episodes.count) episodes")
                for episode in show.episodes.prefix(3) {
                    print("    - S\(episode.seasonNumber)E\(episode.episodeNumber) on \(episode.airDate)")
                }
                if show.episodes.count > 3 {
                    print("    ... and \(show.episodes.count - 3) more")
                }
            }
        }

        if finalData.providers.isEmpty {
            print("⚠️  NO PROVIDERS WITH EPISODES FOUND")
        }
        print("=== END SUMMARY ===\n")
        #endif

        return finalData
    }

    /// Generate date columns for TV guide grid
    func generateDateColumns(from startDate: String, to endDate: String) -> [TVGuide2DateColumn] {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"

        let dayFormatter = DateFormatter()
        dayFormatter.dateFormat = "EEE"

        let numberFormatter = DateFormatter()
        numberFormatter.dateFormat = "dd"

        guard let start = dateFormatter.date(from: startDate),
              let end = dateFormatter.date(from: endDate) else { return [] }

        var columns: [TVGuide2DateColumn] = []
        var currentDate = start

        while currentDate <= end {
            let dateString = dateFormatter.string(from: currentDate)
            let dayOfWeek = dayFormatter.string(from: currentDate).uppercased()
            let dayNumber = numberFormatter.string(from: currentDate)

            columns.append(TVGuide2DateColumn(
                date: dateString,
                dayOfWeek: dayOfWeek,
                dayNumber: dayNumber
            ))

            currentDate = Calendar.current.date(byAdding: .day, value: 1, to: currentDate) ?? currentDate
        }

        return columns
    }

    /// Get TV Guide data (list format)
    @MainActor
    func getTVGuide(startDate: String? = nil, endDate: String? = nil, country: String? = nil) async throws -> TVGuideData {
        var comps = URLComponents(url: baseURL.appendingPathComponent("/api/tv-guide"), resolvingAgainstBaseURL: false)!
        var queryItems: [URLQueryItem] = []

        if let startDate = startDate {
            queryItems.append(URLQueryItem(name: "startDate", value: startDate))
        }
        if let endDate = endDate {
            queryItems.append(URLQueryItem(name: "endDate", value: endDate))
        }
        if let country = country {
            queryItems.append(URLQueryItem(name: "country", value: country))
        }

        if !queryItems.isEmpty {
            comps.queryItems = queryItems
        }

        var req = URLRequest(url: comps.url!)
        req.httpMethod = "GET"
        addAuthHeaders(&req)

        do {
            let (data, resp) = try await session.data(for: req)
            guard let http = resp as? HTTPURLResponse else { throw ApiError.badStatus(-1) }
            guard (200..<300).contains(http.statusCode) else {
                if http.statusCode == 401 { throw ApiError.unauthorized }
                #if DEBUG
                if let body = String(data: data, encoding: .utf8) { print("TV Guide error:", body) }
                #endif
                throw ApiError.badStatus(http.statusCode)
            }

            #if DEBUG
            if let responseString = String(data: data, encoding: .utf8) {
                print("TV Guide API Response:", responseString)
            }
            #endif

            let response = try JSONDecoder().decode(TVGuideResponse.self, from: data)
            return response.data
        } catch {
            throw mapToApiError(error)
        }
    }

    // MARK: - Private Helpers

    private func getRelevantSeasons(for show: Show) -> [Int] {
        // Optimization: Only check the latest season as it tells us if there are current episodes
        // This dramatically reduces API calls while maintaining effectiveness

        if let totalSeasons = show.totalSeasons, totalSeasons > 0 {
            // Only check the most recent season
            return [totalSeasons]
        } else {
            // If we don't know total seasons, check season 1 only as a conservative start
            return [1]
        }
    }
}
