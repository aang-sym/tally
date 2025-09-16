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
        .onAppear {
            viewModel.api = api
        }
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
            .listRowSeparator(.hidden)
            .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
        }
        .listStyle(.plain)
    }
}

// MARK: - Search Result Row
private struct SearchResultRow: View {
    let show: Show
    let onAdd: () -> Void
    @EnvironmentObject private var viewModel: SearchViewModel
    @State private var selectedSeason: Int = 1

    private var isExpanded: Bool {
        guard let tmdbId = show.tmdbId else { return false }
        return viewModel.expandedShowIds.contains(String(tmdbId))
    }

    private var isLoadingDetails: Bool {
        guard let tmdbId = show.tmdbId else { return false }
        return viewModel.loadingDetails.contains(String(tmdbId))
    }

    private var showDetails: ShowExpandedData? {
        guard let tmdbId = show.tmdbId else { return nil }
        return viewModel.showDetails[String(tmdbId)]
    }

    var body: some View {
        VStack(spacing: 0) {
            // Main row (always visible)
            Button(action: {
                guard let api = viewModel.api else { return }
                viewModel.toggleExpansion(for: show, api: api)
            }) {
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
                            .foregroundColor(.primary)

                        if let year = releaseYear {
                            Text(year)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }

                        if let overview = show.overview, !overview.isEmpty {
                            Text(overview)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(isExpanded ? nil : 3)
                        }
                    }

                    Spacer()

                    // Expand indicator
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .foregroundStyle(.secondary)
                        .font(.caption)
                }
                .padding(.vertical, 4)
            }
            .buttonStyle(.plain)

            // Expanded details section
            if isExpanded {
                VStack(spacing: 12) {
                    Divider()

                    if isLoadingDetails {
                        HStack {
                            ProgressView()
                                .scaleEffect(0.8)
                            Text("Loading details...")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 8)
                    } else if let details = showDetails {
                        ExpandedDetailsView(
                            details: details,
                            selectedSeason: $selectedSeason,
                            onAddToWatching: {
                                Task {
                                    guard let tmdbId = show.tmdbId else { return }
                                    guard let api = viewModel.api else { return }
                                    await viewModel.addToWatching(api: api, tmdbId: tmdbId, season: selectedSeason)
                                }
                            }
                        )
                    } else {
                        HStack {
                            Image(systemName: "exclamationmark.triangle")
                                .foregroundStyle(.orange)
                            Text("Failed to load details")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 8)
                    }
                }
                .padding(.horizontal, 8)
                .padding(.bottom, 8)
            }
        }
        .background(Color(.systemBackground))
        .cornerRadius(8)
        .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
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

// MARK: - Expanded Details View
private struct ExpandedDetailsView: View {
    let details: ShowExpandedData
    @Binding var selectedSeason: Int
    let onAddToWatching: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Season selector
            if !details.seasons.isEmpty {
                HStack {
                    Text("Season:")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    Picker("Season", selection: $selectedSeason) {
                        ForEach(details.seasons, id: \.seasonNumber) { season in
                            Text("Season \(season.seasonNumber) (\(season.episodeCount) episodes)")
                                .tag(season.seasonNumber)
                        }
                    }
                    .pickerStyle(.menu)
                    .accentColor(.blue)

                    Spacer()

                    Button("Add to Watching") {
                        onAddToWatching()
                    }
                    .buttonStyle(.borderedProminent)
                    .font(.caption)
                }
            }

            // Current season episodes
            if let currentSeason = details.seasons.first(where: { $0.seasonNumber == selectedSeason }) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Episodes (\(currentSeason.episodes.count))")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    LazyVStack(spacing: 4) {
                        ForEach(Array(currentSeason.episodes.prefix(5)), id: \.id) { episode in
                            EpisodeRowView(episode: episode)
                        }

                        if currentSeason.episodes.count > 5 {
                            Text("... and \(currentSeason.episodes.count - 5) more episodes")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .padding(.top, 4)
                        }
                    }
                }
            } else {
                Text("No episode data available")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 8)
            }
        }
        .onAppear {
            // Set default selected season to the first available season
            if selectedSeason == 1 && !details.seasons.isEmpty {
                selectedSeason = details.seasons.first?.seasonNumber ?? 1
            }
        }
    }
}

// MARK: - Episode Row View
private struct EpisodeRowView: View {
    let episode: Episode

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text("E\(episode.episodeNumber)")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundStyle(.secondary)

                    if let name = episode.name {
                        Text(name)
                            .font(.caption)
                            .lineLimit(1)
                    }

                    Spacer()

                    if let airDate = episode.airDate {
                        Text(formatAirDate(airDate))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }

                if let airDate = episode.airDate {
                    if isAiringNext(airDate) {
                        Text("Airing Next")
                            .font(.caption2)
                            .fontWeight(.medium)
                            .foregroundStyle(.blue)
                    } else if hasAired(airDate) {
                        Text("Aired")
                            .font(.caption2)
                            .foregroundStyle(.green)
                    } else {
                        Text("Upcoming")
                            .font(.caption2)
                            .foregroundStyle(.orange)
                    }
                }
            }

            Spacer()
        }
        .padding(.vertical, 2)
        .padding(.horizontal, 8)
        .background(Color(.systemGray6))
        .cornerRadius(4)
    }

    private func formatAirDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        guard let date = formatter.date(from: dateString) else {
            return dateString
        }

        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }

    private func hasAired(_ dateString: String) -> Bool {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        guard let airDate = formatter.date(from: dateString) else {
            return false
        }

        return airDate <= Date()
    }

    private func isAiringNext(_ dateString: String) -> Bool {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        guard let airDate = formatter.date(from: dateString) else {
            return false
        }

        let now = Date()
        let calendar = Calendar.current

        // Check if it's within the next 7 days and hasn't aired yet
        if airDate > now {
            let daysDifference = calendar.dateComponents([.day], from: now, to: airDate).day ?? 0
            return daysDifference <= 7
        }

        return false
    }
}

// MARK: - Previews
#Preview {
    let api = ApiClient()
    return SearchView(api: api)
}

#Preview("With Results") {
    let api = ApiClient()
    return SearchView(api: api)
}