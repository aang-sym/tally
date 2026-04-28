import SwiftUI

// MARK: - Show Detail View

struct ShowDetailView: View {
    let userShow: UserShow
    let api: ApiClient

    @State private var progress: ShowProgressData?
    @State private var isLoadingProgress = false
    @State private var progressError: String?
    @State private var expandedSeason: Int?
    @State private var selectedEpisodeDetail: EpisodeDetailModel?
    @State private var watchedEps: [String: Bool] = [:]
    @Environment(\.dismiss) private var dismiss

    private var show: Show { userShow.show }

    private var watchedCount: Int { watchedEps.values.filter { $0 }.count }
    private var totalEpisodeCount: Int { show.totalEpisodes ?? 0 }

    var body: some View {
        ZStack {
            Color.tallyBg.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 0) {
                    heroBackdrop
                    whereToWatch
                        .padding(.top, 18)
                        .padding(.horizontal, 14)
                    tallyInsightCard
                        .padding(.top, 20)
                        .padding(.horizontal, 14)
                    progressSection
                        .padding(.top, 24)
                        .padding(.horizontal, 14)
                    seasonsSection
                        .padding(.top, 24)
                        .padding(.horizontal, 14)
                    aboutSection
                        .padding(.top, 24)
                        .padding(.horizontal, 14)
                    Spacer().frame(height: 50)
                }
            }
            .scrollIndicators(.hidden)
            .ignoresSafeArea(edges: .top)
        }
        .navigationBarHidden(true)
        .task { await loadProgress() }
        .sheet(item: $selectedEpisodeDetail) { detail in
            EpisodeDetailSheet(episode: detail, api: api) {
                Task { await loadProgress() }
            }
            .presentationDetents([.medium, .large])
        }
    }

    // MARK: - Hero Backdrop

    private var heroBackdrop: some View {
        ZStack(alignment: .bottom) {
            // Gradient background
            LinearGradient(
                gradient: Gradient(stops: [
                    .init(color: Color(hex: "#0d0820"), location: 0),
                    .init(color: Color(hex: "#1a0a30"), location: 0.5),
                    .init(color: .tallyBg, location: 1),
                ]),
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(minHeight: 340)

            // Orb glow from service color
            Circle()
                .fill(
                    RadialGradient(
                        gradient: Gradient(colors: [serviceColor.opacity(0.18), .clear]),
                        center: .center, startRadius: 0, endRadius: 150
                    )
                )
                .frame(width: 300, height: 300)
                .offset(x: -40, y: -60)
                .blur(radius: 2)
                .allowsHitTesting(false)

            // Poster + title lockup
            HStack(alignment: .bottom, spacing: 14) {
                AsyncImage(url: posterURL) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.white.opacity(0.06))
                }
                .frame(width: 100, height: 150)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .shadow(color: .black.opacity(0.6), radius: 32, y: 8)

                VStack(alignment: .leading, spacing: 5) {
                    Text(show.title)
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.tallyText)
                        .kerning(-0.6)
                        .lineLimit(2)

                    HStack(spacing: 6) {
                        if let year = show.firstAirDate?.prefix(4) {
                            Text(String(year))
                        }
                        if let status = show.status {
                            Text("·")
                            Text(status)
                        }
                    }
                    .font(.system(size: 12, weight: .regular, design: .monospaced))
                    .foregroundColor(.tallyText3)

                    if let seasons = show.totalSeasons {
                        Text("\(seasons) season\(seasons == 1 ? "" : "s")")
                            .font(.system(size: 12, weight: .regular, design: .monospaced))
                            .foregroundColor(.tallyText3)
                    }
                }
                .padding(.bottom, 4)

                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 16)
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [.tallyBg, .clear]),
                    startPoint: .bottom,
                    endPoint: .top
                )
                .frame(height: 160)
            , alignment: .bottom)
        }
        .overlay(alignment: .topLeading) {
            // Back button
            Button(action: { dismiss() }) {
                Circle()
                    .fill(Color.black.opacity(0.35))
                    .overlay(
                        Circle().strokeBorder(Color.white.opacity(0.18), lineWidth: 0.5)
                    )
                    .frame(width: 36, height: 36)
                    .overlay(
                        Image(systemName: "chevron.left")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(Color.white.opacity(0.8))
                    )
            }
            .buttonStyle(.plain)
            .padding(.leading, 14)
            .padding(.top, 56)
        }
    }

    // MARK: - Where to Watch

    private var whereToWatch: some View {
        HStack(spacing: 10) {
            if let provider = userShow.streamingProvider {
                serviceCard(name: provider.name, logoURL: logoURL(provider.logoPath), isPrimary: true)
            } else {
                serviceCard(name: "Unknown", logoURL: nil, isPrimary: true)
            }
        }
    }

    private func serviceCard(name: String, logoURL: URL?, isPrimary: Bool) -> some View {
        HStack(spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(serviceColor.opacity(0.13))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .strokeBorder(serviceColor.opacity(0.34), lineWidth: 0.5)
                    )
                    .frame(width: 36, height: 36)

                if let url = logoURL {
                    AsyncImage(url: url) { image in
                        image.resizable().scaledToFit()
                    } placeholder: {
                        Text(String(name.prefix(1)))
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(serviceColor)
                    }
                    .frame(width: 24, height: 24)
                } else {
                    Text(String(name.prefix(1)))
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(serviceColor)
                }
            }

            VStack(alignment: .leading, spacing: 1) {
                Text(name)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.tallyText)
                Text("Included")
                    .font(.system(size: 10, weight: .regular, design: .monospaced))
                    .foregroundColor(.tallyText3)
            }

            Spacer()
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(isPrimary ? serviceColor.opacity(0.07) : Color.white.opacity(0.04))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(isPrimary ? serviceColor.opacity(0.27) : Color.white.opacity(0.10), lineWidth: 0.5)
        )
    }

    // MARK: - Tally Insight Card

    private var tallyInsightCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            TallySectionLabel(text: "Tally insight", accent: true)

            GhostContainer(radius: 22) {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(alignment: .top, spacing: 12) {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.tallyAccent.opacity(0.18))
                            .frame(width: 40, height: 40)
                            .overlay(
                                Image(systemName: "pause.rectangle")
                                    .font(.system(size: 16))
                                    .foregroundColor(.tallyAccent)
                            )

                        VStack(alignment: .leading, spacing: 4) {
                            Text(insightTitle)
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.tallyText)
                                .lineLimit(2)
                            Text(insightSubtitle)
                                .font(.system(size: 12, weight: .regular, design: .monospaced))
                                .foregroundColor(.tallyText3)
                                .lineLimit(2)
                        }
                    }
                    .padding(18)

                    FadeSeparator().padding(.horizontal, 16)

                    // Savings + mini bar
                    HStack(alignment: .bottom) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text("YOU SAVE")
                                .font(.system(size: 10, weight: .regular, design: .monospaced))
                                .tracking(1.2)
                                .foregroundColor(.tallyText3)
                            Text("$0.00")
                                .font(.system(size: 36, weight: .bold, design: .rounded))
                                .foregroundColor(.tallyAccent)
                                .kerning(-1)
                            Text("if you pause this service")
                                .font(.system(size: 10, weight: .regular, design: .monospaced))
                                .foregroundColor(.tallyText3)
                        }

                        Spacer()

                        MonthBar(gapMonths: [])
                            .frame(width: 100)
                    }
                    .padding(.horizontal, 18)
                    .padding(.vertical, 16)

                    // CTA
                    TallyAccentButton(label: "Set pause reminder") { }
                        .padding(.horizontal, 18)
                        .padding(.bottom, 18)
                }
            }
        }
    }

    // MARK: - Progress Section

    private var progressSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            TallySectionLabel(text: "Your progress")

            GhostContainer(radius: 20) {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(currentSeasonLabel)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.tallyText)
                        Spacer()
                        Text("\(watchedCount)/\(totalEpisodeCount)")
                            .font(.system(size: 11, weight: .regular, design: .monospaced))
                            .foregroundColor(.tallyText3)
                    }

                    if let progress {
                        let seasonNums = progress.seasons.keys.compactMap { Int($0) }.sorted()
                        HStack(spacing: 8) {
                            ForEach(seasonNums, id: \.self) { sNum in
                                let eps = progress.seasons[String(sNum)] ?? []
                                seasonBlock(seasonNumber: sNum, episodes: eps)
                            }
                        }
                    } else if isLoadingProgress {
                        ProgressView().tint(.tallyAccent).frame(maxWidth: .infinity)
                    }
                }
                .padding(16)
            }
        }
    }

    private func seasonBlock(seasonNumber: Int, episodes: [SeasonEpisodeState]) -> some View {
        VStack(spacing: 3) {
            Text("S\(seasonNumber)")
                .font(.system(size: 7, weight: .regular, design: .monospaced))
                .foregroundColor(.tallyText3)
            HStack(spacing: 2) {
                ForEach(episodes.sorted { $0.episodeNumber < $1.episodeNumber }, id: \.episodeNumber) { ep in
                    let key = "\(seasonNumber)-\(ep.episodeNumber)"
                    let isWatched = ep.status == "watched"
                    RoundedRectangle(cornerRadius: 2)
                        .fill(isWatched ? Color.tallyAccent : Color.white.opacity(0.06))
                        .frame(height: 18)
                        .onTapGesture {
                            Task { await toggleEpisode(seasonNumber: seasonNumber, episode: ep) }
                        }
                }
            }
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Seasons Section

    private var seasonsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            TallySectionLabel(text: "Seasons & episodes")

            if let progress {
                let seasonNums = progress.seasons.keys.compactMap { Int($0) }.sorted()
                GhostContainer(radius: 20) {
                    VStack(spacing: 0) {
                        ForEach(Array(seasonNums.enumerated()), id: \.element) { idx, sNum in
                            let eps = progress.seasons[String(sNum)] ?? []
                            SeasonAccordion(
                                seasonNumber: sNum,
                                episodes: eps,
                                isExpanded: expandedSeason == sNum,
                                tmdbId: show.tmdbId ?? 0,
                                api: api,
                                onToggleExpand: {
                                    withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                        expandedSeason = expandedSeason == sNum ? nil : sNum
                                    }
                                },
                                onProgressChanged: { Task { await loadProgress() } },
                                onEpisodeTapped: { detail in selectedEpisodeDetail = detail },
                                show: show
                            )
                            if idx < seasonNums.count - 1 {
                                FadeSeparator()
                            }
                        }
                    }
                }
            } else if isLoadingProgress {
                ProgressView().tint(.tallyAccent).frame(maxWidth: .infinity).padding(.vertical, 32)
            } else if let err = progressError {
                Text(err)
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundColor(.tallyText3)
                    .padding(.vertical, 16)
            }
        }
    }

    // MARK: - About Section

    private var aboutSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            TallySectionLabel(text: "About")

            GhostContainer(radius: 20) {
                VStack(alignment: .leading, spacing: 12) {
                    if let overview = show.overview {
                        Text(overview)
                            .font(.system(size: 14))
                            .foregroundColor(.tallyText2)
                            .lineSpacing(4)
                    }

                    if let status = show.status {
                        HStack(spacing: 6) {
                            genrePill(status)
                        }
                    }
                }
                .padding(16)
            }
        }
    }

    private func genrePill(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 10, weight: .regular, design: .monospaced))
            .foregroundColor(.tallyText2)
            .padding(.horizontal, 9)
            .padding(.vertical, 3)
            .background(Color.white.opacity(0.05))
            .overlay(
                Capsule().strokeBorder(Color.white.opacity(0.10), lineWidth: 0.5)
            )
            .clipShape(Capsule())
    }

    // MARK: - Helpers

    private var posterURL: URL? {
        guard let path = show.posterPath else { return nil }
        if path.hasPrefix("http") { return URL(string: path) }
        return URL(string: "https://image.tmdb.org/t/p/w185\(path)")
    }

    private func logoURL(_ path: String?) -> URL? {
        guard let p = path else { return nil }
        if p.hasPrefix("http") { return URL(string: p) }
        return URL(string: "https://image.tmdb.org/t/p/w92\(p)")
    }

    private var serviceColor: Color {
        guard let name = userShow.streamingProvider?.name.lowercased() else { return Color.tallyAccent }
        if name.contains("netflix") { return Color(hex: "#E50914") }
        if name.contains("disney") { return Color(hex: "#2B8FFF") }
        if name.contains("prime") || name.contains("amazon") { return Color(hex: "#29AAFF") }
        if name.contains("max") { return Color(hex: "#A67BFF") }
        if name.contains("hulu") { return Color(hex: "#1CE783") }
        if name.contains("apple") { return Color(hex: "#FFFFFF") }
        if name.contains("paramount") { return Color(hex: "#0068FF") }
        return Color.tallyAccent
    }

    private var currentSeasonLabel: String {
        guard let progress else { return "Loading..." }
        let latest = progress.seasons.keys.compactMap { Int($0) }.sorted().last ?? 1
        let eps = progress.seasons[String(latest)] ?? []
        let watched = eps.filter { $0.status == "watched" }.count
        return "Season \(latest) · \(watched)/\(eps.count) watched"
    }

    private var insightTitle: String {
        "Pause window analysis"
    }

    private var insightSubtitle: String {
        "Check your Plan tab for savings opportunities on this service."
    }

    @MainActor
    private func loadProgress() async {
        guard let tmdbId = show.tmdbId else { return }
        isLoadingProgress = true
        progressError = nil
        defer { isLoadingProgress = false }
        do {
            progress = try await api.getShowProgress(tmdbId: tmdbId)
            // Populate watchedEps state
            if let progress {
                for (season, eps) in progress.seasons {
                    for ep in eps {
                        let key = "\(season)-\(ep.episodeNumber)"
                        watchedEps[key] = ep.status == "watched"
                    }
                }
            }
        } catch {
            progressError = "Couldn't load episode progress."
        }
    }

    @MainActor
    private func toggleEpisode(seasonNumber: Int, episode: SeasonEpisodeState) async {
        let key = "\(seasonNumber)-\(episode.episodeNumber)"
        let isWatched = episode.status == "watched"
        let newStatus = isWatched ? "unwatched" : "watched"
        watchedEps[key] = !isWatched
        guard let tmdbId = show.tmdbId else { return }
        do {
            _ = try await api.setEpisodeProgress(
                tmdbId: tmdbId,
                seasonNumber: seasonNumber,
                episodeNumber: episode.episodeNumber,
                status: newStatus
            )
        } catch {
            watchedEps[key] = isWatched // revert
        }
    }
}

// MARK: - Season Accordion

private struct SeasonAccordion: View {
    let seasonNumber: Int
    let episodes: [SeasonEpisodeState]
    let isExpanded: Bool
    let tmdbId: Int
    let api: ApiClient
    let onToggleExpand: () -> Void
    let onProgressChanged: () -> Void
    let onEpisodeTapped: (EpisodeDetailModel) -> Void
    let show: Show

    private var watchedCount: Int { episodes.filter { $0.status == "watched" }.count }
    private var allWatched: Bool { watchedCount == episodes.count && !episodes.isEmpty }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            Button(action: onToggleExpand) {
                HStack(spacing: 10) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.tallyText3)
                        .rotationEffect(.degrees(isExpanded ? 90 : 0))
                        .animation(.spring(response: 0.3), value: isExpanded)

                    Text("Season \(seasonNumber)")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.tallyText)

                    Spacer()

                    Text(allWatched ? "✓" : "\(watchedCount)/\(episodes.count)")
                        .font(.system(size: 11, weight: .regular, design: .monospaced))
                        .foregroundColor(allWatched ? Color(hex: "#1ce783") : .tallyText3)
                }
                .padding(.horizontal, 15)
                .padding(.vertical, 14)
            }
            .buttonStyle(.plain)

            // Episodes
            if isExpanded {
                VStack(spacing: 0) {
                    ForEach(episodes.sorted { $0.episodeNumber < $1.episodeNumber }, id: \.episodeNumber) { ep in
                        FadeSeparator()
                        EpisodeAccordionRow(
                            episode: ep,
                            seasonNumber: seasonNumber,
                            tmdbId: tmdbId,
                            api: api,
                            onToggled: onProgressChanged,
                            onTapped: {
                                onEpisodeTapped(EpisodeDetailModel(
                                    tmdbId: tmdbId,
                                    showTitle: show.title,
                                    seasonNumber: seasonNumber,
                                    episode: ep,
                                    posterPath: show.posterPath
                                ))
                            }
                        )
                    }
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }
}

// MARK: - Episode Row

private struct EpisodeAccordionRow: View {
    let episode: SeasonEpisodeState
    let seasonNumber: Int
    let tmdbId: Int
    let api: ApiClient
    let onToggled: () -> Void
    let onTapped: () -> Void

    @State private var isUpdating = false

    private var isWatched: Bool { episode.status == "watched" }

    var body: some View {
        HStack(spacing: 10) {
            Button {
                guard !isUpdating else { return }
                Task { await toggleWatched() }
            } label: {
                ZStack {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(isWatched ? Color.tallyAccent : Color.clear)
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .strokeBorder(isWatched ? Color.clear : Color.white.opacity(0.15), lineWidth: 1.5)
                        )
                        .frame(width: 22, height: 22)

                    if isWatched {
                        Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.tallyBg)
                    }
                }
            }
            .buttonStyle(.plain)
            .opacity(isUpdating ? 0.4 : 1)

            Text("E\(episode.episodeNumber)")
                .font(.system(size: 11, weight: .regular, design: .monospaced))
                .foregroundColor(.tallyText3)
                .frame(width: 26, alignment: .leading)

            Text("Episode \(episode.episodeNumber)")
                .font(.system(size: 14))
                .foregroundColor(isWatched ? .tallyText3 : .tallyText)
                .lineLimit(1)

            Spacer()
        }
        .padding(.horizontal, 15)
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
            // silent fail
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    ShowDetailView(
        userShow: UserShow(
            id: "us-1",
            status: .watching,
            showRating: nil,
            notes: nil,
            show: Show(
                id: "show-1",
                tmdbId: 95396,
                title: "Invincible",
                overview: "Mark Grayson is a normal teenager except for the fact that his father is the most powerful superhero on the planet.",
                posterPath: nil,
                firstAirDate: "2021-03-25",
                status: "Returning Series",
                totalSeasons: 4,
                totalEpisodes: 32
            ),
            streamingProvider: nil
        ),
        api: ApiClient()
    )
}
#endif
