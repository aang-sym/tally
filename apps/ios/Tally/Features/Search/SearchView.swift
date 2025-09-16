//
//  SearchView.swift
//  Tally
//
//  Search interface for finding and adding TV shows
//

import SwiftUI

struct SearchView: View {
    @ObservedObject var api: ApiClient
    @StateObject private var viewModel = SearchViewModel()
    @State private var showingAddedAlert = false
    @State private var lastAddedShowTitle = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search input section
                VStack(spacing: 16) {
                    HStack {
                        TextField("Search for TV shows...", text: $viewModel.query)
                            .textFieldStyle(.roundedBorder)
                            .textInputAutocapitalization(.words)
                            .autocorrectionDisabled()
                            .onSubmit {
                                viewModel.performSearch(api: api)
                            }

                        Button("Search") {
                            viewModel.performSearch(api: api)
                        }
                        .buttonStyle(.bordered)
                        .disabled(viewModel.query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || viewModel.isLoading)
                    }
                }
                .padding()
                .background(Color(.systemGroupedBackground))

                // Content area
                Group {
                    if viewModel.isLoading {
                        LoadingView()
                    } else if let errorMessage = viewModel.error {
                        ErrorView(message: errorMessage) {
                            viewModel.clearError()
                        }
                    } else if viewModel.results.isEmpty && !viewModel.query.isEmpty {
                        EmptyResultsView(query: viewModel.query)
                    } else if viewModel.results.isEmpty {
                        EmptyStateView()
                    } else {
                        ResultsList()
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .navigationTitle("Search")
            .alert("Added to Watchlist", isPresented: $showingAddedAlert) {
                Button("OK") { }
            } message: {
                Text("'\(lastAddedShowTitle)' has been added to your watchlist")
            }
        }
        .environmentObject(viewModel)
    }

    // MARK: - Loading View
    private func LoadingView() -> some View {
        VStack(spacing: 12) {
            ProgressView()
                .scaleEffect(1.2)
            Text("Searching...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Error View
    private func ErrorView(message: String, onRetry: @escaping () -> Void) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 32))
                .foregroundStyle(.orange)

            Text(message)
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)

            Button("Dismiss") {
                onRetry()
            }
            .buttonStyle(.bordered)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }

    // MARK: - Empty Results View
    private func EmptyResultsView(query: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 32))
                .foregroundStyle(.secondary)

            Text("No results found")
                .font(.headline)

            Text("Try searching for a different show or check your spelling")
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }

    // MARK: - Empty State View
    private func EmptyStateView() -> some View {
        VStack(spacing: 12) {
            Image(systemName: "tv")
                .font(.system(size: 32))
                .foregroundStyle(.secondary)

            Text("Search for TV Shows")
                .font(.headline)

            Text("Enter a show name above to find and add shows to your watchlist")
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }

    // MARK: - Results List
    private func ResultsList() -> some View {
        List(viewModel.results) { show in
            SearchResultRow(
                show: show,
                onAdd: {
                    Task {
                        await viewModel.addToWatchlist(api: api, show: show)
                        if viewModel.error == nil {
                            lastAddedShowTitle = show.title
                            showingAddedAlert = true
                        }
                    }
                }
            )
        }
        .listStyle(.plain)
    }
}

// MARK: - Search Result Row
private struct SearchResultRow: View {
    let show: Show
    let onAdd: () -> Void
    @EnvironmentObject private var viewModel: SearchViewModel

    var body: some View {
        HStack(spacing: 12) {
            // Poster image
            AsyncImage(url: posterURL) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Rectangle()
                    .fill(Color(.systemGray5))
                    .overlay {
                        Image(systemName: "tv")
                            .foregroundStyle(.secondary)
                    }
            }
            .frame(width: 60, height: 90)
            .clipped()
            .cornerRadius(8)

            // Show details
            VStack(alignment: .leading, spacing: 4) {
                Text(show.title)
                    .font(.headline)
                    .lineLimit(2)

                if let year = releaseYear {
                    Text(year)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                if let overview = show.overview, !overview.isEmpty {
                    Text(overview)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                }
            }

            Spacer()

            // Add button
            Button("Add") {
                onAdd()
            }
            .buttonStyle(.bordered)
            .disabled(show.tmdbId == nil)
        }
        .padding(.vertical, 4)
    }

    private var posterURL: URL? {
        guard let path = show.posterPath, !path.isEmpty else { return nil }
        return URL(string: path)
    }

    private var releaseYear: String? {
        guard let dateString = show.firstAirDate,
              dateString.count >= 4 else { return nil }
        return String(dateString.prefix(4))
    }
}

// MARK: - Previews
#Preview {
    let api = ApiClient()
    return SearchView(api: api)
}

#Preview("With Results") {
    let api = ApiClient()
    let view = SearchView(api: api)

    // Mock some results for preview
    let mockShows = [
        Show(
            id: "1",
            tmdbId: 1399,
            title: "Game of Thrones",
            overview: "Seven noble families fight for control of the mythical land of Westeros.",
            posterPath: nil,
            firstAirDate: "2011-04-17",
            status: nil,
            totalSeasons: nil,
            totalEpisodes: nil
        ),
        Show(
            id: "2",
            tmdbId: 1396,
            title: "Breaking Bad",
            overview: "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine.",
            posterPath: nil,
            firstAirDate: "2008-01-20",
            status: nil,
            totalSeasons: nil,
            totalEpisodes: nil
        )
    ]

    return view
}