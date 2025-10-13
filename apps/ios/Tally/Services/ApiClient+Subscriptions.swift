//
//  ApiClient+Subscriptions.swift
//  Tally
//
//  Health and subscription-related API methods
//

import Foundation

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
}
