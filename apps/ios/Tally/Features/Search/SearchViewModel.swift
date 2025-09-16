//
//  SearchViewModel.swift
//  Tally
//
//  Search feature view model for managing search state and operations
//

import Foundation

// Combined data structure for show analysis + season data
struct ShowExpandedData {
    let analysis: AnalysisResult
    let seasons: [ExpandedSeason] // Built from season raw data (episodes may be lazily loaded)
}

// Helper to convert episodes to ExpandedSeason format
struct ExpandedSeason {
    let seasonNumber: Int
    let name: String?
    let episodeCount: Int
    let episodes: [Episode]
}

@MainActor
class SearchViewModel: ObservableObject {
    @Published var query: String = ""
    @Published var results: [Show] = []
    @Published var isLoading: Bool = false
    @Published var error: String? = nil

    // Expandable rows functionality
    @Published var expandedShowIds: Set<String> = []
    @Published var showDetails: [String: ShowExpandedData] = [:] // TMDB ID -> ShowExpandedData
    @Published var loadingDetails: Set<String> = [] // TMDB IDs currently loading
    @Published var loadingSeason: Set<String> = [] // Keys: "<tmdbId>-s<season>" currently loading episodes
    @Published var settingProgressFor: Set<String> = [] // keys: "<tmdbId>-s<season>-e<episode>"
    @Published var localProgress: [String: Int] = [:] // keys: "<tmdbId>-s<season>" -> last watched episode number
    @Published var serverProgress: [String: Int] = [:]

    private var currentSearchTask: Task<Void, Never>? = nil
    private var detailsTasks: [String: Task<Void, Never>] = [:] // TMDB ID -> Task
    private var debounceTask: Task<Void, Never>? = nil

    // Store reference to API client for internal operations
    weak var api: ApiClient?

    deinit {
        currentSearchTask?.cancel()
        // Cancel all details tasks
        for task in detailsTasks.values {
            task.cancel()
        }
    }

    func performSearch(api: ApiClient) {
        // Cancel any existing search
        currentSearchTask?.cancel()

        // Clear previous error
        error = nil

        // Validate query
        let trimmedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedQuery.isEmpty else {
            results = []
            return
        }

        // Start loading
        isLoading = true

        currentSearchTask = Task {
            do {
                // Perform search
                let searchResults = try await api.searchShows(query: trimmedQuery)

                // Check if task was cancelled
                guard !Task.isCancelled else { return }

                // Update results
                results = searchResults
                isLoading = false

                #if DEBUG
                print("Search completed for '\(trimmedQuery)': \(searchResults.count) results")
                #endif
            } catch {
                // Check if task was cancelled
                guard !Task.isCancelled else { return }

                // Handle error
                self.error = mapErrorToUserFriendlyMessage(error)
                self.results = []
                self.isLoading = false

                #if DEBUG
                print("Search failed for '\(trimmedQuery)': \(error)")
                #endif
            }
        }
    }

    func scheduleSearch(api: ApiClient, debounceMs: UInt64 = 400) {
        // Cancel previous debounce
        debounceTask?.cancel()
        debounceTask = Task { [weak self] in
            // Debounce delay
            try? await Task.sleep(nanoseconds: debounceMs * 1_000_000)
            guard !Task.isCancelled, let self = self else { return }
            await self.performSearch(api: api)
        }
    }

    func addToWatchlist(api: ApiClient, show: Show) async {
        guard let tmdbId = show.tmdbId else {
            error = "Cannot add this show - missing required information"
            return
        }

        do {
            _ = try await api.addToWatchlist(tmdbId: tmdbId, status: .watchlist)

            #if DEBUG
            print("Successfully added '\(show.title)' to watchlist")
            #endif
        } catch {
            self.error = mapErrorToUserFriendlyMessage(error)

            #if DEBUG
            print("Failed to add '\(show.title)' to watchlist: \(error)")
            #endif
        }
    }

    func clearError() {
        error = nil
    }

    func toggleExpansion(for show: Show, api: ApiClient) {
        guard let tmdbId = show.tmdbId else {
            error = "Cannot expand show - missing required information"
            return
        }

        let tmdbIdString = String(tmdbId)

        // If already expanded, collapse
        if expandedShowIds.contains(tmdbIdString) {
            expandedShowIds.remove(tmdbIdString)

            // Cancel any ongoing details task for this show
            if let task = detailsTasks[tmdbIdString] {
                task.cancel()
                detailsTasks.removeValue(forKey: tmdbIdString)
            }

            loadingDetails.remove(tmdbIdString)
            return
        }

        // Expand the row
        expandedShowIds.insert(tmdbIdString)

        // If we already have details cached, no need to fetch again
        if showDetails[tmdbIdString] != nil {
            return
        }

        // Start loading details
        loadingDetails.insert(tmdbIdString)

        let task = Task {
            do {
                // Step 1: Get analysis data (show details + season list)
                let analysis = try await api.analyzeShow(tmdbId: tmdbId)

                // Check if task was cancelled
                guard !Task.isCancelled else { return }

                // Step 2: Get the latest season episodes
                var seasons: [ExpandedSeason] = []
                if !analysis.seasonInfo.isEmpty {
                    // Pre-populate all seasons from analysis (episodes loaded lazily)
                    seasons = analysis.seasonInfo.map { info in
                        ExpandedSeason(
                            seasonNumber: info.seasonNumber,
                            name: "Season \(info.seasonNumber)",
                            episodeCount: info.episodeCount,
                            episodes: []
                        )
                    }.sorted { $0.seasonNumber < $1.seasonNumber }

                    // Load latest season episodes immediately
                    let latestSeasonNumber = analysis.seasonInfo.map { $0.seasonNumber }.max() ?? 1
                    await loadSeasonEpisodesInternal(api: api, tmdbId: tmdbId, seasonNumber: latestSeasonNumber, existingSeasons: &seasons)
                }

                // Check if task was cancelled
                guard !Task.isCancelled else { return }

                // Combine analysis + season data
                let expandedData = ShowExpandedData(
                    analysis: analysis,
                    seasons: seasons
                )

                // Update cached details
                showDetails[tmdbIdString] = expandedData
                loadingDetails.remove(tmdbIdString)
                detailsTasks.removeValue(forKey: tmdbIdString)

                #if DEBUG
                print("Successfully loaded details for show: \(show.title)")
                #endif
            } catch {
                // Check if task was cancelled
                guard !Task.isCancelled else { return }

                // Handle error
                self.error = mapErrorToUserFriendlyMessage(error)
                loadingDetails.remove(tmdbIdString)
                detailsTasks.removeValue(forKey: tmdbIdString)

                #if DEBUG
                print("Failed to load details for \(show.title): \(error)")
                #endif
            }
        }

        detailsTasks[tmdbIdString] = task
    }

    func addToWatching(api: ApiClient, tmdbId: Int, season: Int) async {
        do {
            _ = try await api.addToWatching(tmdbId: tmdbId, season: season)

            #if DEBUG
            print("Successfully added show to watching with season \(season)")
            #endif
        } catch {
            self.error = mapErrorToUserFriendlyMessage(error)

            #if DEBUG
            print("Failed to add show to watching: \(error)")
            #endif
        }
    }

    private func loadSeasonEpisodesInternal(api: ApiClient, tmdbId: Int, seasonNumber: Int, existingSeasons: inout [ExpandedSeason]) async {
        let key = "\(tmdbId)-s\(seasonNumber)"
        if loadingSeason.contains(key) { return }
        loadingSeason.insert(key)
        defer { loadingSeason.remove(key) }

        do {
            let seasonData = try await api.getSeasonRaw(tmdbId: tmdbId, season: seasonNumber)
            if let idx = existingSeasons.firstIndex(where: { $0.seasonNumber == seasonNumber }) {
                existingSeasons[idx] = ExpandedSeason(
                    seasonNumber: seasonData.seasonNumber,
                    name: "Season \(seasonData.seasonNumber)",
                    episodeCount: seasonData.episodes.count,
                    episodes: seasonData.episodes
                )
            }
        } catch {
            #if DEBUG
            print("Failed to fetch season \(seasonNumber) episodes: \(error)")
            #endif
        }
    }

    func ensureSeasonEpisodesLoaded(api: ApiClient, tmdbId: Int, seasonNumber: Int) async {
        let tmdbIdString = String(tmdbId)
        guard var data = showDetails[tmdbIdString] else { return }
        if let season = data.seasons.first(where: { $0.seasonNumber == seasonNumber }), !season.episodes.isEmpty {
            return
        }
        var seasonsCopy = data.seasons
        await loadSeasonEpisodesInternal(api: api, tmdbId: tmdbId, seasonNumber: seasonNumber, existingSeasons: &seasonsCopy)
        data = ShowExpandedData(analysis: data.analysis, seasons: seasonsCopy)
        showDetails[tmdbIdString] = data
    }

    func setProgressUpToEpisode(api: ApiClient, tmdbId: Int, season: Int, episode: Int) async {
        let key = "\(tmdbId)-s\(season)-e\(episode)"
        if settingProgressFor.contains(key) { return }
        settingProgressFor.insert(key)
        defer { settingProgressFor.remove(key) }

        do {
            // Ensure show status is watching
            _ = try? await api.addToWatching(tmdbId: tmdbId)

            // Mark all episodes up to the tapped one as watched
            _ = try await api.setEpisodeProgress(
                tmdbId: tmdbId,
                seasonNumber: season,
                episodeNumber: episode,
                status: "watched"
            )

            // Locally reflect progress
            let seasonKey = "\(tmdbId)-s\(season)"
            localProgress[seasonKey] = max(localProgress[seasonKey] ?? 0, episode)
        } catch {
            self.error = mapErrorToUserFriendlyMessage(error)
        }
    }

    func readbackProgress(api: ApiClient, tmdbId: Int) async {
        do {
            let data = try await api.getShowProgress(tmdbId: tmdbId)
            // data.seasons keys are season numbers as strings
            for (seasonKey, items) in data.seasons {
                let seasonNum = Int(seasonKey) ?? 0
                var lastWatched = 0
                for item in items {
                    if item.status == "watched" {
                        lastWatched = max(lastWatched, item.episodeNumber)
                    }
                }
                let key = "\(tmdbId)-s\(seasonNum)"
                serverProgress[key] = lastWatched
            }
        } catch {
            #if DEBUG
            print("Readback progress failed: \(error)")
            #endif
        }
    }

    private func mapErrorToUserFriendlyMessage(_ error: Error) -> String {
        if let apiError = error as? ApiError {
            switch apiError {
            case .unauthorized:
                return "Please log in to search and add shows to your watchlist"
            case .timeout:
                return "Search timed out. Please check your connection and try again"
            case .network:
                return "No internet connection. Please check your network and try again"
            case .badStatus(503):
                return "Search service is temporarily unavailable. Please try again later"
            case .badStatus(let code):
                return "Server error (\(code)). Please try again later"
            case .cannotParse:
                return "Could not process search results. Please try again"
            case .underlying(let underlyingError):
                if let nsError = underlyingError as NSError?,
                   nsError.domain == "TMDBServiceUnavailable" {
                    return "Search service is temporarily unavailable. Please try again later"
                }
                return underlyingError.localizedDescription
            }
        }
        return error.localizedDescription
    }
}
