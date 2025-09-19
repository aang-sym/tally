import SwiftUI

extension TVGuideView {
    // Flatten shows for the Show rail (one poster per show row)
    func showRows() -> [(service: TVGuideStreamingService, show: TVGuideShow)] {
        guard let groups = vm.data?.services else { return [] }
        var rows: [(TVGuideStreamingService, TVGuideShow)] = []
        for g in groups {
            // Only include shows that have upcoming episodes in the current range
            let filtered = g.shows.filter { !$0.upcomingEpisodes.isEmpty }
                .sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
            for s in filtered { rows.append((g.service, s)) }
        }
        return rows
    }

    // Tall provider cells; each segment spans its show count in the grid
    func providerSegments() -> [(service: TVGuideStreamingService, count: Int)] {
        guard let groups = vm.data?.services else { return [] }
        return groups.map { g in
            let count = g.shows.filter { !$0.upcomingEpisodes.isEmpty }.count
            return (g.service, max(1, count))
        }
    }

    // Map a show to episode markers for a given day
    func episodesFor(show: TVGuideShow, service: TVGuideStreamingService, dayKey: String) -> [EpisodeSlot] {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; f.timeZone = .current
        let color = Color(hex: service.color ?? "#6B7280")
        let text = Color(hex: service.textColor ?? "#FFFFFF")
        let eps = show.upcomingEpisodes.filter { ep in
            guard let d = f.date(from: ep.airDate) else { return false }
            return f.string(from: d) == dayKey
        }
        return eps.map { ep in
            EpisodeSlot(
                id: "\(service.id)-\(show.tmdbId)-\(ep.seasonNumber ?? 0)-\(ep.episodeNumber ?? 0)-\(dayKey)",
                dayKey: dayKey,
                serviceId: service.id,
                showTmdbId: show.tmdbId,
                seasonNumber: ep.seasonNumber,
                episodeNumber: ep.episodeNumber,
                title: ep.title,
                providerColor: color,
                providerTextColor: text
            )
        }
    }
}

