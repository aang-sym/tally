import Foundation

// MARK: - Plan API Models

struct PlanGap: Decodable {
    let from: String
    let until: String
    let days: Int
}

struct PlanUpcomingShow: Decodable {
    let title: String
    let nextAirDate: String?
    let posterPath: String?
    let tmdbId: Int?

    enum CodingKeys: String, CodingKey {
        case title
        case nextAirDate = "nextAirDate"
        case posterPath = "posterPath"
        case tmdbId = "tmdbId"
    }
}

struct PlanRecommendation: Decodable, Identifiable {
    let serviceId: String
    let serviceName: String
    let monthlyPrice: Double
    let logoPath: String?
    let pauseFrom: String?
    let pauseUntil: String?
    let allGaps: [PlanGap]
    let estimatedSavings: Double
    let whyPause: String?
    let whyPauseShow: String?
    let whyPauseDate: String?
    let showCount: Int
    let upcomingShows: [PlanUpcomingShow]

    var id: String { serviceId }

    var logoURL: URL? {
        guard let path = logoPath else { return nil }
        if path.hasPrefix("http") { return URL(string: path) }
        return URL(string: "https://image.tmdb.org/t/p/w92\(path)")
    }

    var pauseFromDate: Date? { pauseFrom.flatMap { ISO8601DateFormatter().date(from: $0) } }
    var pauseUntilDate: Date? { pauseUntil.flatMap { ISO8601DateFormatter().date(from: $0) } }

    // 0-based month indices for MonthBar
    var gapMonthIndices: [Int] {
        let cal = Calendar.current
        var months: Set<Int> = []
        for gap in allGaps {
            guard
                let from = ISO8601DateFormatter().date(from: gap.from),
                let until = ISO8601DateFormatter().date(from: gap.until)
            else { continue }
            var cursor = from
            while cursor <= until {
                months.insert(cal.component(.month, from: cursor) - 1)
                cursor = cal.date(byAdding: .month, value: 1, to: cursor) ?? until.addingTimeInterval(1)
            }
        }
        return Array(months).sorted()
    }

    var windowLabel: String {
        let fmt = DateFormatter()
        fmt.dateFormat = "MMM"
        guard let f = pauseFromDate, let u = pauseUntilDate else { return "" }
        let fm = fmt.string(from: f)
        let um = fmt.string(from: u)
        return fm == um ? fm : "\(fm) — \(um)"
    }

    var savingsFormatted: String {
        String(format: "+$%.0f", estimatedSavings)
    }
}

struct PlanResponse: Decodable {
    let success: Bool
    let data: PlanData

    struct PlanData: Decodable {
        let recommendations: [PlanRecommendation]
    }
}

// MARK: - PlanTabViewModel

@Observable
final class PlanTabViewModel {
    var recommendations: [PlanRecommendation] = []
    var isLoading = false
    var error: String?

    var totalSavings: Double {
        recommendations.reduce(0) { $0 + $1.estimatedSavings }
    }

    var totalSavingsFormatted: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: "en_US")
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: totalSavings)) ?? "$\(totalSavings)"
    }

    var gapsCount: Int { recommendations.filter { $0.estimatedSavings > 0 }.count }

    @MainActor
    func load(api: ApiClient) async {
        guard let userId = api.currentUser?.id else {
            error = "Not signed in"
            return
        }
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            let (data, http) = try await api.getData(from: "/api/users/\(userId)/plan")
            guard http.statusCode == 200 else { throw ApiError.badStatus(http.statusCode) }
            let decoded = try JSONDecoder().decode(PlanResponse.self, from: data)
            recommendations = decoded.data.recommendations
        } catch {
            self.error = error.localizedDescription
        }
    }
}
