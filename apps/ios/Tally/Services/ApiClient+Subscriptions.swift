//
//  ApiClient+Subscriptions.swift
//  Tally
//
//  Health and subscription-related API methods
//

import Foundation

// MARK: - Subscriptions Models

/// Subscriptions API response structure
private struct SubscriptionsResponse: Decodable {
    let success: Bool
    let data: SubscriptionsData
}

private struct SubscriptionsData: Decodable {
    let subscriptions: [Subscription]
    let totalActive: Int
}

/// Legacy response structures (for backward compatibility)
private struct DataEnvelope: Decodable {
    let data: [Subscription]
}

private struct NestedEnvelope: Decodable {
    struct Inner: Decodable {
        let subscriptions: [Subscription]
    }
    let data: Inner
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

        // Fallback to old formats for backward compatibility
        if let direct = try? JSONDecoder().decode([Subscription].self, from: data) {
            return direct
        }
        if let env = try? JSONDecoder().decode(DataEnvelope.self, from: data) {
            return env.data
        }
        if let env2 = try? JSONDecoder().decode(NestedEnvelope.self, from: data) {
            return env2.data.subscriptions
        }

        throw ApiError.cannotParse
    }
}
