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
    @State private var searchQuery = ""
    @Environment(\.dismiss) private var dismiss

    // Get last selected tab from DashboardView (passed as parameter)
    var lastSelectedTab: Int = 0

    var body: some View {
        ZStack(alignment: .bottom) {
            // Background
            Color.background
                .ignoresSafeArea()

            // Purple to black gradient
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.15, green: 0.05, blue: 0.25),
                    Color.black
                ]),
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            // Content area
            VStack(spacing: 0) {
                Group {
                    if viewModel.isLoading {
                        LoadingView()
                    } else if let errorMessage = viewModel.error {
                        ErrorView(message: errorMessage) {
                            viewModel.clearError()
                        }
                    } else if viewModel.results.isEmpty && !searchQuery.isEmpty {
                        EmptyResultsView(query: searchQuery)
                    } else if viewModel.results.isEmpty {
                        EmptyStateView()
                    } else {
                        ResultsList()
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(.bottom, 80) // Space for bottom toolbar
            }

            // Bottom toolbar (same style as DashboardView)
            bottomToolbar

            // Bottom fade gradient
            LinearGradient(
                colors: [.clear, .black],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 100)
            .allowsHitTesting(false)
        }
        .navigationBarHidden(true)
        .alert("Added to Watchlist", isPresented: $showingAddedAlert) {
            Button("OK") { }
        } message: {
            Text("'\(lastAddedShowTitle)' has been added to your watchlist")
        }
        .overlay(alignment: .bottom) {
            if let msg = viewModel.toastMessage {
                Text(msg)
                    .font(.caption)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(.ultraThinMaterial)
                    .cornerRadius(14)
                    .padding(.bottom, 80)
                    .transition(.opacity)
            }
        }
        .environmentObject(viewModel)
        .onAppear {
            viewModel.api = api
        }
        .onChange(of: searchQuery) { _, newValue in
            viewModel.query = newValue
            if !newValue.isEmpty {
                viewModel.scheduleSearch(api: api)
            }
        }
    }

    // MARK: - Bottom Toolbar

    private var bottomToolbar: some View {
        HStack(spacing: 12) {
            // Collapsed tab button (shows last selected tab)
            Button(action: { dismiss() }) {
                tabIcon(for: lastSelectedTab)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .background(Circle().fill(Color.gray.opacity(0.3)))
            }

            // Expanded search bar
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 16))
                    .foregroundColor(.white.opacity(0.6))

                TextField("Search for shows...", text: $searchQuery)
                    .textFieldStyle(.plain)
                    .font(.system(size: 15))
                    .foregroundColor(.white)
                    .textInputAutocapitalization(.words)
                    .autocorrectionDisabled()

                if !searchQuery.isEmpty {
                    Button(action: {
                        searchQuery = ""
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.white.opacity(0.6))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 22)
                    .fill(Color.gray.opacity(0.3))
            )
        }
        .padding(.horizontal, Spacing.screenPadding)
        .padding(.bottom, 16)
    }

    private func tabIcon(for page: Int) -> some View {
        Group {
            if page == 0 {
                Text(currentDayOfMonth)
            } else if page == 1 {
                Image(systemName: "sparkles")
            } else {
                Image(systemName: "square.stack.3d.up")
            }
        }
    }

    private var currentDayOfMonth: String {
        let day = Calendar.current.component(.day, from: Date())
        return "\(day)"
    }

    // MARK: - Loading View
    private func LoadingView() -> some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)

            Text("Searching...")
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Error View
    private func ErrorView(message: String, onRetry: @escaping () -> Void) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 40))
                .foregroundColor(.error)

            Text(message)
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.xl)

            Button("Dismiss") {
                onRetry()
            }
            .font(.labelLarge)
            .foregroundColor(.white)
            .padding(.horizontal, Spacing.xl)
            .padding(.vertical, Spacing.md)
            .background(Color.tallyPrimary)
            .cornerRadius(Spacing.buttonCornerRadius)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Empty Results View
    private func EmptyResultsView(query: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 40))
                .foregroundColor(.textSecondary)

            Text("No results found")
                .font(.heading2)
                .foregroundColor(.textPrimary)

            Text("Try searching for a different show")
                .font(.bodyMedium)
                .multilineTextAlignment(.center)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Empty State View
    private func EmptyStateView() -> some View {
        VStack(spacing: 12) {
            Image(systemName: "tv")
                .font(.system(size: 32))
                .foregroundStyle(.secondary)

            Text("Search for TV Shows")
                .font(.heading2)
                .foregroundColor(.textPrimary)

            Text("Enter a show name to find and add shows to your watchlist")
                .font(.bodyMedium)
                .multilineTextAlignment(.center)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }

    // MARK: - Results List
    private func ResultsList() -> some View {
        ScrollView {
            VStack(spacing: Spacing.cardSpacing) {
                ForEach(viewModel.results) { show in
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
            }
            .screenPadding()
            .padding(.top, Spacing.md)
        }
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
                            .font(.system(size: 16, weight: .semibold))
                            .lineLimit(2)
                            .foregroundColor(.textPrimary)

                        if let year = releaseYear {
                            Text(year)
                                .font(.bodyMedium)
                                .foregroundColor(.textSecondary)
                        }

                        if let overview = show.overview, !overview.isEmpty {
                            Text(overview)
                                .font(.caption)
                                .foregroundColor(.textSecondary)
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
                            show: show,
                            details: details,
                            selectedSeason: $selectedSeason
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
        .padding(12)
        .glassEffect(.clear)
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
    let show: Show
    let details: ShowExpandedData
    @Binding var selectedSeason: Int
    @EnvironmentObject private var viewModel: SearchViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Season selector
            if !details.seasons.isEmpty {
                HStack(alignment: .firstTextBaseline) {
                    Text("Season")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    Menu {
                        ForEach(details.seasons.sorted { $0.seasonNumber > $1.seasonNumber }, id: \.seasonNumber) { season in
                            Button("Season \(season.seasonNumber) (\(season.episodeCount) episodes)") {
                                selectedSeason = season.seasonNumber
                                if let tmdbId = show.tmdbId, let api = viewModel.api {
                                    Task { await viewModel.ensureSeasonEpisodesLoaded(api: api, tmdbId: tmdbId, seasonNumber: season.seasonNumber) }
                                }
                            }
                        }
                    } label: {
                        VStack(alignment: .leading, spacing: 0) {
                            Text("Season \(selectedSeason)")
                                .font(.subheadline)
                                .foregroundColor(.blue)
                            if let season = details.seasons.first(where: { $0.seasonNumber == selectedSeason }) {
                                Text("(\(season.episodeCount) episodes)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }

                    Spacer()

                    // Add to Watchlist action (clock icon)
                    if let tmdbId = show.tmdbId {
                        Button {
                            Task {
                                if let api = viewModel.api {
                                    await viewModel.addToWatchlist(api: api, show: show)
                                }
                            }
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "clock")
                                Text("Watchlist")
                            }
                        }
                        .buttonStyle(.bordered)
                        .font(.caption)
                    }
                }
            }

            // Pattern badge + providers row
            VStack(alignment: .leading, spacing: 8) {
                if let pat = details.analysis.pattern {
                    HStack(spacing: 8) {
                        Text(pat.pattern.uppercased())
                            .font(.caption)
                            .fontWeight(.medium)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Color(.systemGray6))
                            .cornerRadius(6)
                        if let conf = pat.confidence {
                            Text("\(Int((conf * 100).rounded()))%")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                if let providers = details.analysis.watchProviders, !providers.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(Array(providers.prefix(12)), id: \.providerId) { p in
                                Button {
                                    if let tmdbId = show.tmdbId, let api = viewModel.api {
                                        Task { await viewModel.selectProvider(api: api, tmdbId: tmdbId, provider: p) }
                                    }
                                } label: {
                                    HStack(spacing: 6) {
                                        if let logo = p.logo, let url = URL(string: logo) {
                                            AsyncImage(url: url) { image in
                                                image.resizable().aspectRatio(contentMode: .fit)
                                            } placeholder: {
                                                Color(.systemGray5)
                                            }
                                            .frame(height: 20)
                                        } else {
                                            Image(systemName: "play.rectangle.fill").foregroundStyle(.secondary)
                                        }
                                        Text(p.name)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 6)
                                    .background(providerChipBackground(p))
                                    .cornerRadius(6)
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("Provider: \(p.name)")
                                .accessibilityHint("Sets streaming provider for this show")
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }
            }

            // Current season episodes
            if let currentSeason = details.seasons.first(where: { $0.seasonNumber == selectedSeason }) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Episodes (\(currentSeason.episodes.count))")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    // Episodes area (loading-aware)
                    if currentSeason.episodes.isEmpty,
                       let tmdbId = show.tmdbId,
                       viewModel.loadingSeason.contains("\(tmdbId)-s\(currentSeason.seasonNumber)") {
                        HStack { ProgressView(); Text("Loading episodes...").font(.caption).foregroundStyle(.secondary) }
                            .frame(height: 60)
                    } else {
                        // Scrollable list of episodes within the expanded card
                        ScrollView {
                            LazyVStack(spacing: 4) {
                                ForEach(currentSeason.episodes, id: \.id) { episode in
                                    EpisodeRowButton(episode: episode, tmdbId: show.tmdbId, season: currentSeason.seasonNumber)
                                }
                            }
                        }
                        .frame(height: 260)
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
            if !details.seasons.isEmpty {
                selectedSeason = details.seasons.map { $0.seasonNumber }.max() ?? 1
            }
            // Ensure episodes for selected season are loaded
            if let tmdbId = show.tmdbId, let api = viewModel.api {
                Task { await viewModel.ensureSeasonEpisodesLoaded(api: api, tmdbId: tmdbId, seasonNumber: selectedSeason) }
                Task { await viewModel.readbackProgress(api: api, tmdbId: tmdbId) }
            }
        }
        .onChange(of: viewModel.country) { _, _ in
            // After country change, make sure the currently selected season episodes are present
            if let tmdbId = show.tmdbId, let api = viewModel.api {
                Task { await viewModel.ensureSeasonEpisodesLoaded(api: api, tmdbId: tmdbId, seasonNumber: selectedSeason) }
            }
        }
    }

    private func providerChipBackground(_ p: WatchProvider) -> Color {
        guard let tmdbId = show.tmdbId else { return Color(.systemGray6) }
        if viewModel.savingProviderFor.contains(tmdbId) {
            return Color(.systemGray5)
        }
        if viewModel.selectedProviderByTmdb[tmdbId] == p.providerId {
            return Color(.systemBlue).opacity(0.2)
        }
        return Color(.systemGray6)
    }
}

// MARK: - Episode Row View
private struct EpisodeRowButton: View {
    let episode: Episode
    let tmdbId: Int?
    let season: Int
    @EnvironmentObject private var viewModel: SearchViewModel

    private var progressKey: String {
        guard let tmdbId = tmdbId else { return "" }
        return "\(tmdbId)-s\(season)-e\(episode.episodeNumber)"
    }

    private var seasonKey: String {
        guard let tmdbId = tmdbId else { return "" }
        return "\(tmdbId)-s\(season)"
    }

    private var isCompletedLocally: Bool {
        if let sp = viewModel.serverProgress[seasonKey] {
            return episode.episodeNumber <= sp
        }
        return (viewModel.localProgress[seasonKey] ?? 0) >= episode.episodeNumber
    }

    private var isUpNext: Bool {
        if let sp = viewModel.serverProgress[seasonKey] {
            return episode.episodeNumber == (sp + 1)
        }
        // With only local progress available
        let lw = viewModel.localProgress[seasonKey] ?? 0
        return episode.episodeNumber == (lw + 1)
    }

    var body: some View {
        Button(action: {
            guard let tmdbId = tmdbId, let api = viewModel.api else { return }
            Task { await viewModel.setProgressUpToEpisode(api: api, tmdbId: tmdbId, season: season, episode: episode.episodeNumber) }
        }) {
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

                    if isUpNext {
                        Text("Up Next")
                            .font(.caption2)
                            .fontWeight(.medium)
                            .foregroundStyle(.blue)
                    } else if let airDate = episode.airDate {
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

                if viewModel.settingProgressFor.contains(progressKey) {
                    ProgressView().scaleEffect(0.8)
                } else if isCompletedLocally {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                } else {
                    Image(systemName: "play.circle")
                        .foregroundStyle(.blue)
                }
            }
            .padding(.vertical, 2)
            .padding(.horizontal, 8)
            .background(isCompletedLocally ? Color(.systemGreen).opacity(0.25) : Color(.systemGray6))
            .cornerRadius(4)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Episode \(episode.episodeNumber)")
        .accessibilityHint("Sets watched up to this episode")
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
    SearchView(api: PreviewApiClient())
}

#Preview("With Results") {
    SearchView(api: PreviewApiClient())
}
