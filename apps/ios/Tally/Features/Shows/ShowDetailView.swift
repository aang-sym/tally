import SwiftUI

// MARK: - Show Detail View

struct ShowDetailView: View {
    let userShow: UserShow
    let api: ApiClient

    @State private var progress: ShowProgressData?
    @State private var isLoadingProgress = false
    @State private var progressError: String?
    @State private var expandedSeasons: Set<Int> = [1]
    @State private var selectedEpisodeDetail: EpisodeDetailModel?

    private var show: Show { userShow.show }

    private var watchedCount: Int {
        progress?.seasons.values.flatMap { $0 }.filter { $0.status == "watched" }.count ?? 0
    }

    private var totalEpisodeCount: Int {
        show.totalEpisodes ?? 0
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                headerSection
                    .padding(.horizontal)
                    .padding(.top)

                if let error = progressError {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding()
                } else if isLoadingProgress && progress == nil {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 32)
                } else if let progress {
                    seasonsSection(progress: progress)
                }
            }
        }
        .navigationTitle(show.title)
        .navigationBarTitleDisplayMode(.large)
        .task { await loadProgress() }
        .sheet(item: $selectedEpisodeDetail) { detail in
            EpisodeDetailSheet(episode: detail, api: api) {
                Task { await loadProgress() }
            }
            .presentationDetents([.medium, .large])
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack(alignment: .top, spacing: 16) {
            AsyncImage(url: posterURL) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.secondary.opacity(0.2))
            }
            .frame(width: 90, height: 135)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 6) {
                Text(show.title)
                    .font(.headline)
                    .lineLimit(2)

                if let status = show.status {
                    Label(status, systemImage: statusIcon(status))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if let provider = userShow.streamingProvider {
                    Label(provider.name, systemImage: "play.rectangle")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if totalEpisodeCount > 0 {
                    progressBar
                }
            }
        }
        .padding(.bottom)
    }

    private var progressBar: some View {
        VStack(alignment: .leading, spacing: 4) {
            let fraction = totalEpisodeCount > 0 ? Double(watchedCount) / Double(totalEpisodeCount) : 0
            ProgressView(value: fraction)
                .tint(.blue)
            Text("\(watchedCount) / \(totalEpisodeCount) episodes watched")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Seasons

    private func seasonsSection(progress: ShowProgressData) -> some View {
        let seasonNumbers = progress.seasons.keys.compactMap { Int($0) }.sorted()
        return VStack(spacing: 0) {
            ForEach(seasonNumbers, id: \.self) { season in
                SeasonSection(
                    seasonNumber: season,
                    episodes: progress.seasons[String(season)] ?? [],
                    isExpanded: expandedSeasons.contains(season),
                    tmdbId: show.tmdbId ?? 0,
                    showTitle: show.title,
                    posterPath: show.posterPath,
                    api: api,
                    onProgressChanged: { Task { await loadProgress() } },
                    onEpisodeTapped: { detail in selectedEpisodeDetail = detail }
                )
                .onTapGesture {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        if expandedSeasons.contains(season) {
                            expandedSeasons.remove(season)
                        } else {
                            expandedSeasons.insert(season)
                        }
                    }
                }
                Divider()
            }
        }
        .padding(.top, 8)
    }

    // MARK: - Helpers

    private var posterURL: URL? {
        guard let path = show.posterPath else { return nil }
        if path.starts(with: "http") { return URL(string: path) }
        return URL(string: "https://image.tmdb.org/t/p/w185\(path)")
    }

    private func statusIcon(_ status: String) -> String {
        switch status.lowercased() {
        case "returning series": return "arrow.clockwise"
        case "ended": return "checkmark.circle"
        case "canceled": return "xmark.circle"
        default: return "tv"
        }
    }

    @MainActor
    private func loadProgress() async {
        guard let tmdbId = show.tmdbId else { return }
        isLoadingProgress = true
        progressError = nil
        defer { isLoadingProgress = false }
        do {
            progress = try await api.getShowProgress(tmdbId: tmdbId)
        } catch {
            progressError = "Couldn't load episode progress."
        }
    }
}

// MARK: - Season Section

private struct SeasonSection: View {
    let seasonNumber: Int
    let episodes: [SeasonEpisodeState]
    let isExpanded: Bool
    let tmdbId: Int
    let showTitle: String
    let posterPath: String?
    let api: ApiClient
    let onProgressChanged: () -> Void
    let onEpisodeTapped: (EpisodeDetailModel) -> Void

    private var watchedCount: Int { episodes.filter { $0.status == "watched" }.count }

    var body: some View {
        VStack(spacing: 0) {
            // Season header (always visible, tappable to expand)
            HStack {
                Text("Season \(seasonNumber)")
                    .font(.subheadline.bold())
                Spacer()
                Text("\(watchedCount)/\(episodes.count)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal)
            .padding(.vertical, 12)
            .contentShape(Rectangle())

            // Episode list (only when expanded)
            if isExpanded {
                VStack(spacing: 0) {
                    ForEach(episodes.sorted { $0.episodeNumber < $1.episodeNumber }, id: \.episodeNumber) { ep in
                        EpisodeRow(
                            episode: ep,
                            seasonNumber: seasonNumber,
                            tmdbId: tmdbId,
                            api: api,
                            onToggled: onProgressChanged,
                            onTapped: {
                                onEpisodeTapped(EpisodeDetailModel(
                                    tmdbId: tmdbId,
                                    showTitle: showTitle,
                                    seasonNumber: seasonNumber,
                                    episode: ep,
                                    posterPath: posterPath
                                ))
                            }
                        )
                        .padding(.horizontal)
                        Divider().padding(.leading)
                    }
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }
}

// MARK: - Episode Row

private struct EpisodeRow: View {
    let episode: SeasonEpisodeState
    let seasonNumber: Int
    let tmdbId: Int
    let api: ApiClient
    let onToggled: () -> Void
    let onTapped: () -> Void

    @State private var isUpdating = false

    private var isWatched: Bool { episode.status == "watched" }

    var body: some View {
        HStack(spacing: 12) {
            Button {
                guard !isUpdating else { return }
                Task { await toggleWatched() }
            } label: {
                Image(systemName: isWatched ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(isWatched ? .blue : .secondary)
                    .opacity(isUpdating ? 0.4 : 1)
            }
            .buttonStyle(.plain)

            Text("E\(episode.episodeNumber)")
                .font(.subheadline)
                .foregroundStyle(isWatched ? .primary : .secondary)
                .frame(minWidth: 32, alignment: .leading)

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 10)
        .contentShape(Rectangle())
        .onTapGesture { onTapped() }
    }

    @MainActor
    private func toggleWatched() async {
        isUpdating = true
        defer { isUpdating = false }
        let newStatus = isWatched ? "unwatched" : "watched"
        do {
            _ = try await api.setEpisodeProgress(
                tmdbId: tmdbId,
                seasonNumber: seasonNumber,
                episodeNumber: episode.episodeNumber,
                status: newStatus
            )
            onToggled()
        } catch {
            // Silent fail — progress reload will correct state
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        ShowDetailView(
            userShow: UserShow(
                id: "us-1",
                status: .watching,
                showRating: nil,
                notes: nil,
                show: Show(
                    id: "show-1",
                    tmdbId: 1396,
                    title: "Breaking Bad",
                    overview: "A chemistry teacher turned drug manufacturer.",
                    posterPath: nil,
                    firstAirDate: "2008-01-20",
                    status: "Ended",
                    totalSeasons: 5,
                    totalEpisodes: 62
                ),
                streamingProvider: nil
            ),
            api: ApiClient()
        )
    }
}
