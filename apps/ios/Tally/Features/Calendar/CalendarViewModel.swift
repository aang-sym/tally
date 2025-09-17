import Foundation
import SwiftUI

struct Calendar2Day: Identifiable {
    let id: String // yyyy-MM-dd
    let date: Date
    let inMonth: Bool
}

struct ProviderBadge: Identifiable, Hashable {
    let id: Int
    let name: String
    let logo: String?
}

@MainActor
final class CalendarViewModel: ObservableObject {
    @Published var country: String = CountryManager.get()
    @Published var monthAnchor: Date = CalendarViewModel.firstOfMonth(Date())
    @Published var days: [Calendar2Day] = []
    @Published var dailyProviders: [String: [ProviderBadge]] = [:]
    @Published var primaryProviderByDate: [String: ProviderBadge] = [:]
    @Published var isLoading: Bool = false
    @Published var error: String?

    // MARK: - Month helpers
    static func firstOfMonth(_ date: Date) -> Date {
        let cal = Calendar.current
        let comps = cal.dateComponents([.year, .month], from: date)
        return cal.date(from: comps) ?? date
    }

    func changeMonth(by delta: Int) {
        if let newDate = Calendar.current.date(byAdding: .month, value: delta, to: monthAnchor) {
            monthAnchor = CalendarViewModel.firstOfMonth(newDate)
        }
    }

    func makeMonthGrid() {
        let cal = Calendar.current
        let start = monthAnchor
        guard let range = cal.range(of: .day, in: .month, for: start) else { return }
        let firstWeekday = cal.component(.weekday, from: start) // 1=Sun ... 7=Sat
        let leading = (firstWeekday + 6) % 7 // 0..6 for Monday-first visual

        var grid: [Calendar2Day] = []
        if leading > 0, let prev = cal.date(byAdding: .day, value: -leading, to: start) {
            for i in 0..<leading {
                let d = cal.date(byAdding: .day, value: i, to: prev)!
                grid.append(Calendar2Day(id: Self.key(for: d), date: d, inMonth: false))
            }
        }
        for day in range {
            let d = cal.date(byAdding: .day, value: day - 1, to: start)!
            grid.append(Calendar2Day(id: Self.key(for: d), date: d, inMonth: true))
        }
        while grid.count % 7 != 0 { grid.append(nextDay(from: grid.last!.date, inMonth: false)) }
        while grid.count < 42 { grid.append(nextDay(from: grid.last!.date, inMonth: false)) }
        days = grid
    }

    private func nextDay(from date: Date, inMonth: Bool) -> Calendar2Day {
        let d = Calendar.current.date(byAdding: .day, value: 1, to: date)!
        return Calendar2Day(id: Self.key(for: d), date: d, inMonth: inMonth)
    }

    static func key(for date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = .current
        return f.string(from: date)
    }

    // MARK: - Data loading (minimal: first/last air dates + provider)
    func reload(api: ApiClient) async {
        isLoading = true
        error = nil
        makeMonthGrid()
        dailyProviders = [:]
        primaryProviderByDate = [:]
        do {
            let watching = try await api.getWatchlist(status: .watching)
            let subs = try? await api.subscriptions() // best-effort; may not have logos
            let monthBounds = visibleMonthRange()

            for userShow in watching.prefix(25) { // keep it snappy
                guard let tmdbId = userShow.show.tmdbId else { continue }

                // Prefer the user's selected provider when available
                var provider: ProviderBadge?
                if let p = userShow.streamingProvider {
                    provider = ProviderBadge(id: p.id, name: p.name, logo: p.logoPath)
                }

                // First/Last air dates
                var first = userShow.show.firstAirDate // yyyy-MM-dd
                var last: String? = nil

                if last == nil || provider == nil || first == nil {
                    let analysis = try await api.analyzeShow(tmdbId: tmdbId, country: country)
                    if first == nil { first = analysis.showDetails.firstAirDate }
                    if last == nil { last = analysis.showDetails.lastAirDate }
                    if provider == nil, let wp = analysis.watchProviders?.first {
                        provider = ProviderBadge(id: wp.providerId, name: wp.name, logo: wp.logo)
                    }
                }

                if let prov = provider {
                    place(badge: prov, first: first, last: last, within: monthBounds)
                }
            }
            // Fill pips for every in-month day from active subscriptions (overview style)
            if let subs = subs, !subs.isEmpty {
                let badges = subs.map { ProviderBadge(id: $0.serviceName?.hashValue ?? 0, name: $0.serviceName ?? "Provider", logo: nil) }
                for d in days where d.inMonth {
                    let k = Self.key(for: d.date)
                    var arr = dailyProviders[k] ?? []
                    // merge without duplicates
                    for b in badges { if !arr.contains(b) { arr.append(b) } }
                    dailyProviders[k] = arr
                }
            }

            // Calculate primary providers for each day
            calculatePrimaryProviders()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    // MARK: - Primary Provider Selection
    private func calculatePrimaryProviders() {
        for (dayKey, providers) in dailyProviders {
            if let primary = selectPrimaryProvider(from: providers) {
                primaryProviderByDate[dayKey] = primary
            }
        }
    }

    private func selectPrimaryProvider(from providers: [ProviderBadge]) -> ProviderBadge? {
        // Only consider days with 1-3 providers that have logos
        guard providers.count >= 1 && providers.count <= 3 else { return nil }

        let providersWithLogos = providers.filter { $0.logo != nil && !$0.logo!.isEmpty }
        guard !providersWithLogos.isEmpty else { return nil }

        // Sort by name length (more characters = more popular/detailed) then by ID for stability
        let sorted = providersWithLogos.sorted { lhs, rhs in
            if lhs.name.count != rhs.name.count {
                return lhs.name.count > rhs.name.count
            }
            return lhs.id < rhs.id
        }

        return sorted.first
    }

    // MARK: - Public accessors for UI
    func primaryProvider(for dayKey: String) -> ProviderBadge? {
        return primaryProviderByDate[dayKey]
    }

    func secondaryProviders(for dayKey: String) -> [ProviderBadge] {
        guard let providers = dailyProviders[dayKey],
              let primary = primaryProviderByDate[dayKey] else {
            return dailyProviders[dayKey] ?? []
        }

        return providers.filter { $0.id != primary.id }
    }

    private func place(badge: ProviderBadge, first: String?, last: String?, within range: (Date, Date)) {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
        if let s = first, let d = f.date(from: s), d >= range.0 && d <= range.1 { add(badge, for: d) }
        if let s = last, let d = f.date(from: s), d >= range.0 && d <= range.1 { add(badge, for: d) }
    }

    private func add(_ badge: ProviderBadge, for date: Date) {
        let k = Self.key(for: date)
        var arr = dailyProviders[k] ?? []
        if !arr.contains(badge) { arr.append(badge) }
        dailyProviders[k] = arr
    }

    private func visibleMonthRange() -> (Date, Date) {
        let cal = Calendar.current
        let start = monthAnchor
        let end = cal.date(byAdding: DateComponents(month: 1, day: -1), to: start) ?? start
        return (start, end)
    }
}
