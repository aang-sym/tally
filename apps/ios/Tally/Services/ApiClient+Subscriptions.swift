//
//  ApiClient+Subscriptions.swift
//  Tally
//
//  Health and subscription-related API methods
//

import Foundation

// MARK: - Streaming Services Response

private struct StreamingServicesResponse: Decodable {
    let success: Bool
    let data: StreamingServicesData

    struct StreamingServicesData: Decodable {
        let services: [StreamingService]
        let count: Int
    }
}

// MARK: - Add Subscription Request/Response

struct AddSubscriptionRequest: Encodable {
    let service_id: String
    let monthly_cost: Double
    let tier: String?
    let is_active: Bool
}

// MARK: - Subscriptions Extension

extension ApiClient {
    /// Health check endpoint
    func health() async throws -> Health {
        let (data, http) = try await getData(from: "/api/health")
        guard http.statusCode == 200 else { throw ApiError.badStatus(http.statusCode) }
        return try JSONDecoder().decode(Health.self, from: data)
    }

    /// Get user's subscriptions
    func subscriptions() async throws -> [Subscription] {
        guard let userId = currentUser?.id else {
            throw ApiError.unauthorized
        }

        let (data, http) = try await getData(from: "/api/users/\(userId)/subscriptions")
        guard http.statusCode == 200 else {
            if http.statusCode == 401 { throw ApiError.unauthorized }
            #if DEBUG
            if let body = String(data: data, encoding: .utf8) {
                print("Subscriptions error body:", body)
            }
            #endif
            throw ApiError.badStatus(http.statusCode)
        }

        // Try current API response format
        if let response = try? JSONDecoder().decode(SubscriptionsResponse.self, from: data) {
            return response.data.subscriptions
        }

        // Fallback: try direct array format
        if let direct = try? JSONDecoder().decode([Subscription].self, from: data) {
            return direct
        }

        throw ApiError.cannotParse
    }

    /// Fetch available streaming services (for add-subscription flow)
    func streamingServices(countryCode: String? = nil) async throws -> [StreamingService] {
        var path = "/api/streaming-services"
        if let country = countryCode {
            path += "?country=\(country)"
        }
        let (data, http) = try await getData(from: path)
        guard http.statusCode == 200 else { throw ApiError.badStatus(http.statusCode) }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        if let response = try? decoder.decode(StreamingServicesResponse.self, from: data) {
            return response.data.services
        }
        throw ApiError.cannotParse
    }

    /// Add a new subscription for the current user
    func addSubscription(serviceId: String, monthlyCost: Double, tier: String?) async throws -> Subscription {
        guard let userId = currentUser?.id else { throw ApiError.unauthorized }

        let body = AddSubscriptionRequest(
            service_id: serviceId,
            monthly_cost: monthlyCost,
            tier: tier,
            is_active: true
        )
        let (data, http) = try await postJSON("/api/users/\(userId)/subscriptions", body: body)
        guard http.statusCode == 201 || http.statusCode == 200 else {
            #if DEBUG
            if let body = String(data: data, encoding: .utf8) { print("Add subscription error:", body) }
            #endif
            throw ApiError.badStatus(http.statusCode)
        }

        // Response is { success, data: { subscription: {...} } }
        struct AddResponse: Decodable {
            struct Inner: Decodable { let subscription: Subscription }
            let success: Bool
            let data: Inner
        }
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        if let response = try? decoder.decode(AddResponse.self, from: data) {
            return response.data.subscription
        }
        throw ApiError.cannotParse
    }
}
