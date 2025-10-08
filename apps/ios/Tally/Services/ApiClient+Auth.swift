//
//  ApiClient+Auth.swift
//  Tally
//
//  Authentication-related API methods
//

import Foundation

// MARK: - Auth Models

/// User information returned from login
private struct UserInfo: Decodable {
    let id: String
    let email: String
    let displayName: String
    let avatarUrl: String?
}

/// Login response structure
private struct LoginResponse: Decodable {
    let user: UserInfo
    let token: String
    let message: String
}

/// API wrapper for login response
private struct LoginApiResponse: Decodable {
    let success: Bool
    let data: LoginResponse
}

/// Legacy login response formats (for backward compatibility)
private struct LoginResponseA: Decodable { let token: String }
private struct LoginResponseB: Decodable { let accessToken: String }

/// Login request body
private struct LoginRequest: Encodable {
    let email: String
    let password: String
}

// MARK: - Auth Extension

extension ApiClient {
    /// Login and return authenticated user info
    func login(email: String, password: String) async throws -> AuthenticatedUser {
        let (data, http) = try await postJSON("/api/users/login", body: LoginRequest(email: email, password: password))
        guard http.statusCode == 200 else {
            #if DEBUG
            if let body = String(data: data, encoding: .utf8) { print("Login error body:", body) }
            #endif
            if http.statusCode == 401 { throw ApiError.unauthorized }
            throw ApiError.badStatus(http.statusCode)
        }

        // Try to decode the actual API response format first (with wrapper)
        if let apiResponse = try? JSONDecoder().decode(LoginApiResponse.self, from: data) {
            let response = apiResponse.data
            return AuthenticatedUser(
                id: response.user.id,
                email: response.user.email,
                displayName: response.user.displayName,
                token: response.token
            )
        }

        // Fallback to direct decode for backward compatibility
        if let response = try? JSONDecoder().decode(LoginResponse.self, from: data) {
            return AuthenticatedUser(
                id: response.user.id,
                email: response.user.email,
                displayName: response.user.displayName,
                token: response.token
            )
        }

        // Fallback to old formats for backward compatibility
        if let r = try? JSONDecoder().decode(LoginResponseA.self, from: data) {
            return AuthenticatedUser(id: "", email: email, displayName: "", token: r.token)
        }
        if let r2 = try? JSONDecoder().decode(LoginResponseB.self, from: data) {
            return AuthenticatedUser(id: "", email: email, displayName: "", token: r2.accessToken)
        }

        throw ApiError.cannotParse
    }
}
