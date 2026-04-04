import SwiftUI

// MARK: - Episode Detail Sheet
// Displayed when a user taps an episode in ShowDetailView or the calendar.
// Shows episode metadata and lets the user mark it watched/unwatched.

struct EpisodeDetailSheet: View {
    let episode: EpisodeDetailModel
    let api: ApiClient
    var onProgressChanged: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @State private var isWatched: Bool
    @State private var isUpdating = false
    @State private var errorMessage: String?

    init(episode: EpisodeDetailModel, api: ApiClient, onProgressChanged: (() -> Void)? = nil) {
        self.episode = episode
        self.api = api
        self.onProgressChanged = onProgressChanged
        self._isWatched = State(initialValue: episode.isWatched)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Still image or poster fallback
                    stillImage

                    VStack(alignment: .leading, spacing: 12) {
                        // Episode identifier + title
                        VStack(alignment: .leading, spacing: 4) {
                            Text(episode.identifier)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(episode.title)
                                .font(.title2.bold())
                        }

                        // Metadata row
                        HStack(spacing: 16) {
                            if let airDate = episode.airDate {
                                Label(airDate, systemImage: "calendar")
                            }
                            if let runtime = episode.runtime {
                                Label("\(runtime) min", systemImage: "clock")
                            }
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)

                        // Overview
                        if let overview = episode.overview, !overview.isEmpty {
                            Text(overview)
                                .font(.body)
                                .foregroundStyle(.primary)
                        }
                    }
                    .padding(.horizontal)

                    // Mark watched button
                    watchButton
                        .padding(.horizontal)

                    if let error = errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                            .padding(.horizontal)
                    }

                    Spacer(minLength: 40)
                }
            }
            .navigationTitle(episode.showTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    // MARK: - Still Image

    private var stillImage: some View {
        Group {
            if let stillURL = episode.stillURL {
                AsyncImage(url: stillURL) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    posterFallback
                }
            } else if let posterURL = episode.posterURL {
                AsyncImage(url: posterURL) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    posterFallback
                }
            } else {
                posterFallback
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 200)
        .clipped()
    }

    private var posterFallback: some View {
        Rectangle()
            .fill(Color.secondary.opacity(0.2))
            .overlay {
                Image(systemName: "tv")
                    .font(.system(size: 48))
                    .foregroundStyle(.secondary)
            }
    }

    // MARK: - Watch Button

    private var watchButton: some View {
        Button {
            guard !isUpdating else { return }
            Task { await toggleWatched() }
        } label: {
            HStack {
                Image(systemName: isWatched ? "checkmark.circle.fill" : "circle")
                Text(isWatched ? "Watched" : "Mark as Watched")
                    .fontWeight(.semibold)
                if isUpdating {
                    Spacer()
                    ProgressView()
                        .tint(.white)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(isWatched ? Color.secondary.opacity(0.2) : Color.blue)
            .foregroundStyle(isWatched ? .primary : .white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .disabled(isUpdating)
    }

    // MARK: - Toggle

    @MainActor
    private func toggleWatched() async {
        isUpdating = true
        errorMessage = nil
        let newStatus = isWatched ? "unwatched" : "watched"
        // Optimistic update
        isWatched.toggle()
        do {
            _ = try await api.setEpisodeProgress(
                tmdbId: episode.tmdbId,
                seasonNumber: episode.seasonNumber,
                episodeNumber: episode.episodeNumber,
                status: newStatus
            )
            onProgressChanged?()
        } catch {
            // Revert on failure
            isWatched.toggle()
            errorMessage = "Couldn't update progress. Try again."
        }
        isUpdating = false
    }
}

// MARK: - Episode Detail Model
// Adapts both CalendarEpisode and ShowDetailView's SeasonEpisodeState
// into a single shape for this sheet.

struct EpisodeDetailModel: Identifiable {
    let id: String
    let tmdbId: Int
    let showTitle: String
    let seasonNumber: Int
    let episodeNumber: Int
    let title: String
    let overview: String?
    let airDate: String?
    let runtime: Int?
    let stillPath: String?
    let posterPath: String?
    let isWatched: Bool

    var identifier: String { "S\(seasonNumber)E\(episodeNumber)" }

    var stillURL: URL? {
        guard let path = stillPath else { return nil }
        return URL(string: "https://image.tmdb.org/t/p/w780\(path)")
    }

    var posterURL: URL? {
        guard let path = posterPath else { return nil }
        if path.starts(with: "http") { return URL(string: path) }
        return URL(string: "https://image.tmdb.org/t/p/w342\(path)")
    }

    /// Init from CalendarEpisode
    init(from calEpisode: CalendarEpisode) {
        self.id = calEpisode.id
        self.tmdbId = calEpisode.show.tmdbId ?? 0
        self.showTitle = calEpisode.show.title
        self.seasonNumber = calEpisode.seasonNumber
        self.episodeNumber = calEpisode.episode.episodeNumber
        self.title = calEpisode.episodeTitle
        self.overview = calEpisode.synopsis == "No description available." ? nil : calEpisode.synopsis
        self.airDate = calEpisode.episode.airDate
        self.runtime = calEpisode.episode.runtime
        self.stillPath = calEpisode.episode.stillPath
        self.posterPath = calEpisode.show.posterPath
        self.isWatched = false // Calendar episodes don't carry watch state
    }

    /// Init from ShowDetailView context
    init(tmdbId: Int, showTitle: String, seasonNumber: Int, episode: SeasonEpisodeState, posterPath: String?) {
        self.id = "\(tmdbId)-s\(seasonNumber)e\(episode.episodeNumber)"
        self.tmdbId = tmdbId
        self.showTitle = showTitle
        self.seasonNumber = seasonNumber
        self.episodeNumber = episode.episodeNumber
        self.title = "Episode \(episode.episodeNumber)"
        self.overview = nil
        self.airDate = nil
        self.runtime = nil
        self.stillPath = nil
        self.posterPath = posterPath
        self.isWatched = episode.status == "watched"
    }
}

// MARK: - Preview

#Preview {
    EpisodeDetailSheet(
        episode: EpisodeDetailModel(from: CalendarEpisode.preview),
        api: ApiClient()
    )
}
