//
//  SearchViewModel.swift
//  Tally
//
//  Search feature view model for managing search state and operations
//

import Foundation

@MainActor
class SearchViewModel: ObservableObject {
    @Published var query: String = ""
    @Published var results: [Show] = []
    @Published var isLoading: Bool = false
    @Published var error: String? = nil

    private var currentSearchTask: Task<Void, Never>? = nil

    deinit {
        currentSearchTask?.cancel()
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