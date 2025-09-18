import Foundation
import SwiftUI

struct EpisodeSlot: Identifiable, Hashable {
    let id: String
    let dayKey: String
    let serviceId: Int
    let showTmdbId: Int
    let seasonNumber: Int?
    let episodeNumber: Int?
    let title: String
    let providerColor: Color
    let providerTextColor: Color
}

@MainActor
final class TVGuideViewModel: ObservableObject {
    @Published var country: String = CountryManager.get()
    @Published var dateRange: (start: String, end: String) = TVGuideViewModel.defaultRange()
    @Published var isLoading: Bool = false
    @Published var error: String?

    @Published var data: TVGuideData?

    // Index: day -> serviceId -> [EpisodeSlot]
    @Published var index: [String: [Int: [EpisodeSlot]]] = [:]

    static func defaultRange() -> (String, String) {
        let cal = Calendar.current
        let now = Date()
        let start = cal.date(from: cal.dateComponents([.year, .month], from: now)) ?? now
        let days = cal.range(of: .day, in: .month, for: start)?.count ?? 30
        let end = cal.date(byAdding: .day, value: days - 1, to: start) ?? start
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; f.timeZone = .current
        return (f.string(from: start), f.string(from: end))
    }

    func dayKeys() -> [String] {
        guard let data else {
            return Self.keysBetween(start: dateRange.start, end: dateRange.end)
        }
        return Self.keysBetween(start: data.dateRange.startDate, end: data.dateRange.endDate)
    }

    static func keysBetween(start: String, end: String) -> [String] {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; f.timeZone = .current
        guard let s = f.date(from: start), let e = f.date(from: end) else { return [] }
        var d = s; var keys: [String] = []
        while d <= e { keys.append(f.string(from: d)); d = Calendar.current.date(byAdding: .day, value: 1, to: d)! }
        return keys
    }

    func reload(api: ApiClient) async {
        isLoading = true; error = nil
        do {
            let guide = try await api.getTVGuide(startDate: dateRange.start, endDate: dateRange.end, country: country)
            self.data = guide
            buildIndex()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    private func buildIndex() {
        index = [:]
        guard let data else { return }
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; f.timeZone = .current
        for group in data.services {
            let service = group.service
            let color = Color(hex: service.color ?? "#6B7280")
            let textColor = Color(hex: service.textColor ?? "#FFFFFF")
            for show in group.shows {
                for ep in show.upcomingEpisodes {
                    guard let date = f.date(from: ep.airDate) else { continue }
                    let key = f.string(from: date)
                    let slot = EpisodeSlot(
                        id: "\(show.tmdbId)-\(ep.seasonNumber ?? 0)-\(ep.episodeNumber ?? 0)-\(key)",
                        dayKey: key,
                        serviceId: service.id,
                        showTmdbId: show.tmdbId,
                        seasonNumber: ep.seasonNumber,
                        episodeNumber: ep.episodeNumber,
                        title: ep.title,
                        providerColor: color,
                        providerTextColor: textColor
                    )
                    var byService = index[key] ?? [:]
                    var list = byService[service.id] ?? []
                    if !list.contains(slot) { list.append(slot) }
                    byService[service.id] = list
                    index[key] = byService
                }
            }
        }
        // Sort deterministically per cell
        for (k, dict) in index {
            var newDict: [Int: [EpisodeSlot]] = [:]
            for (sid, items) in dict {
                newDict[sid] = items.sorted { (a, b) in
                    if (a.seasonNumber ?? 0) != (b.seasonNumber ?? 0) { return (a.seasonNumber ?? 0) < (b.seasonNumber ?? 0) }
                    if (a.episodeNumber ?? 0) != (b.episodeNumber ?? 0) { return (a.episodeNumber ?? 0) < (b.episodeNumber ?? 0) }
                    return a.title < b.title
                }
            }
            index[k] = newDict
        }
    }
}

extension Color {
    init(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("#") { s.removeFirst() }
        var v: UInt64 = 0; Scanner(string: s).scanHexInt64(&v)
        let r, g, b: Double
        switch s.count {
        case 6:
            r = Double((v >> 16) & 0xFF) / 255.0
            g = Double((v >> 8) & 0xFF) / 255.0
            b = Double(v & 0xFF) / 255.0
        default:
            r = 0.42; g = 0.45; b = 0.5
        }
        self = Color(red: r, green: g, blue: b)
    }
}
