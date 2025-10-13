//
//  Subscription.swift
//  Tally
//
//  Subscription models matching API response structure from GET /api/users/:id/subscriptions
//

import Foundation

// MARK: - Service Price

struct ServicePrice: Codable, Identifiable, Hashable {
    let tier: String
    let amount: Double
    let currency: String
    let billingFrequency: String
    let active: Bool
    let notes: String?
    let providerName: String?

    var id: String { "\(providerName ?? "")-\(tier)-\(amount)" }

    enum CodingKeys: String, CodingKey {
        case tier, amount, currency
        case billingFrequency = "billing_frequency"
        case active, notes
        case providerName = "provider_name"
    }

    /// Formatted price string (e.g., "$14.99")
    var formattedPrice: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency
        return formatter.string(from: NSNumber(value: amount)) ?? "\(currency) \(amount)"
    }
}

// MARK: - Streaming Service

struct StreamingService: Codable, Identifiable, Hashable {
    let id: String
    let tmdbProviderId: Int
    let name: String
    let logoPath: String?
    let homepage: String?
    let prices: [ServicePrice]
    let defaultPrice: ServicePrice?

    enum CodingKeys: String, CodingKey {
        case id
        case tmdbProviderId = "tmdb_provider_id"
        case name
        case logoPath = "logo_path"
        case homepage
        case prices
        case defaultPrice = "default_price"
    }

    /// Full logo URL for display
    var logoURL: URL? {
        guard let path = logoPath else { return nil }
        // If already a full URL, use it
        if path.starts(with: "http") {
            return URL(string: path)
        }
        // Otherwise build TMDB image URL
        return URL(string: "https://image.tmdb.org/t/p/w92\(path)")
    }
}

// MARK: - Subscription

struct Subscription: Codable, Identifiable, Hashable {
    let id: String
    let userId: String?
    let serviceId: String
    let monthlyCost: Double
    let isActive: Bool
    let tier: String?
    let startedDate: String?
    let endedDate: String?
    let createdAt: String?
    let updatedAt: String?
    let service: StreamingService?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case serviceId = "service_id"
        case monthlyCost = "monthly_cost"
        case isActive = "is_active"
        case tier
        case startedDate = "started_date"
        case endedDate = "ended_date"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case service
    }

    // MARK: - Computed Properties

    /// Service name from nested service object
    var serviceName: String {
        service?.name ?? "Unknown Service"
    }

    /// Formatted monthly cost
    var formattedCost: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale.current
        return formatter.string(from: NSNumber(value: monthlyCost)) ?? "$\(monthlyCost)"
    }

    /// Days until renewal (if started_date exists and subscription is active)
    var daysUntilRenewal: Int? {
        guard isActive, let startedDateStr = startedDate else { return nil }

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate, .withDashSeparatorInDate]

        guard let started = formatter.date(from: startedDateStr) else { return nil }

        // Calculate next billing date (30 days from start, then every 30 days)
        let calendar = Calendar.current
        let now = Date()

        // Find how many billing cycles have passed
        let daysSinceStart = calendar.dateComponents([.day], from: started, to: now).day ?? 0
        let cyclesPassed = daysSinceStart / 30

        // Next billing date
        guard let nextBilling = calendar.date(byAdding: .day, value: (cyclesPassed + 1) * 30, to: started) else {
            return nil
        }

        return calendar.dateComponents([.day], from: now, to: nextBilling).day
    }

    /// Human-readable renewal string (e.g., "Renews in 12 days")
    var renewalText: String {
        guard isActive else { return "Inactive" }
        guard let days = daysUntilRenewal else { return "Active" }

        if days == 0 {
            return "Renews today"
        } else if days == 1 {
            return "Renews tomorrow"
        } else if days < 0 {
            return "Active" // Past due or irregular billing
        } else {
            return "Renews in \(days) days"
        }
    }
}

// MARK: - API Response Models

struct SubscriptionsResponse: Codable {
    let success: Bool
    let data: SubscriptionsData
}

struct SubscriptionsData: Codable {
    let subscriptions: [Subscription]
    let totalActive: Int

    enum CodingKeys: String, CodingKey {
        case subscriptions
        case totalActive = "totalActive"
    }
}

// MARK: - Preview Helpers

#if DEBUG
extension Subscription {
    static let preview = Subscription(
        id: "sub-1",
        userId: "user-1",
        serviceId: "netflix",
        monthlyCost: 15.99,
        isActive: true,
        tier: "Standard",
        startedDate: "2024-01-15",
        endedDate: nil,
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        service: StreamingService(
            id: "netflix",
            tmdbProviderId: 8,
            name: "Netflix",
            logoPath: "/9A1JSVmSxsyaBK4SUFsYVqbAYfW.jpg",
            homepage: "https://www.netflix.com",
            prices: [
                ServicePrice(
                    tier: "Standard",
                    amount: 15.99,
                    currency: "USD",
                    billingFrequency: "monthly",
                    active: true,
                    notes: nil,
                    providerName: "Netflix"
                )
            ],
            defaultPrice: ServicePrice(
                tier: "Standard",
                amount: 15.99,
                currency: "USD",
                billingFrequency: "monthly",
                active: true,
                notes: nil,
                providerName: "Netflix"
            )
        )
    )

    static let previews: [Subscription] = [
        preview,
        Subscription(
            id: "sub-2",
            userId: "user-1",
            serviceId: "disney",
            monthlyCost: 7.99,
            isActive: true,
            tier: "Standard with Ads",
            startedDate: "2024-02-01",
            endedDate: nil,
            createdAt: "2024-02-01T10:00:00Z",
            updatedAt: "2024-02-01T10:00:00Z",
            service: StreamingService(
                id: "disney",
                tmdbProviderId: 337,
                name: "Disney Plus",
                logoPath: "/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg",
                homepage: "https://www.disneyplus.com",
                prices: [],
                defaultPrice: ServicePrice(
                    tier: "Standard with Ads",
                    amount: 7.99,
                    currency: "USD",
                    billingFrequency: "monthly",
                    active: true,
                    notes: nil,
                    providerName: "Disney Plus"
                )
            )
        ),
        Subscription(
            id: "sub-3",
            userId: "user-1",
            serviceId: "hbo",
            monthlyCost: 9.99,
            isActive: false,
            tier: "Standard",
            startedDate: "2023-12-01",
            endedDate: "2024-06-01",
            createdAt: "2023-12-01T10:00:00Z",
            updatedAt: "2024-06-01T10:00:00Z",
            service: StreamingService(
                id: "hbo",
                tmdbProviderId: 384,
                name: "Max",
                logoPath: "/zxrVdFjIjLqkfnwyghnfywTn3Lh.jpg",
                homepage: "https://www.max.com",
                prices: [],
                defaultPrice: ServicePrice(
                    tier: "Standard",
                    amount: 9.99,
                    currency: "USD",
                    billingFrequency: "monthly",
                    active: true,
                    notes: nil,
                    providerName: "Max"
                )
            )
        )
    ]
}
#endif
