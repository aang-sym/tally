//
//  ApiClient+Auth.swift
//  Tally
//
//  Authentication-related API methods
//

import Foundation

// MARK: - Auth Models

/// User object in Supabase Auth response
private struct AuthUser: Decodable {
    let id: String
    let email: String?
}

/// Response from /api/auth/login and /api/auth/register
private struct AuthResponse: Decodable {
    let success: Bool
    let token: String
    let user: AuthUser
}

/// Login/register request body
private struct AuthRequest: Encodable {
    let email: String
    let password: String
}

// MARK: - Auth Extension

extension ApiClient {
    /// Login and return authenticated user info
    func login(email: String, password: String) async throws -> AuthenticatedUser {
        let (data, http) = try await postJSON("/api/auth/login", body: AuthRequest(email: email, password: password))
        guard http.statusCode == 200 else {
            #if DEBUG
            if let body = String(data: data, encoding: .utf8) { print("Login error body:", body) }
            #endif
            if http.statusCode == 401 { throw ApiError.unauthorized }
            throw ApiError.badStatus(http.statusCode)
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        if let response = try? decoder.decode(AuthResponse.self, from: data) {
            return AuthenticatedUser(
                id: response.user.id,
                email: response.user.email ?? email,
                displayName: response.user.email ?? email,
                token: response.token
            )
        }

        throw ApiError.cannotParse
    }

    /// Register a new account and return authenticated user info
    func register(email: String, password: String) async throws -> AuthenticatedUser {
        let (data, http) = try await postJSON("/api/auth/register", body: AuthRequest(email: email, password: password))
        guard http.statusCode == 201 else {
            #if DEBUG
            if let body = String(data: data, encoding: .utf8) { print("Register error body:", body) }
            #endif
            if http.statusCode == 400 { throw ApiError.badStatus(400) }
            throw ApiError.badStatus(http.statusCode)
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        if let response = try? decoder.decode(AuthResponse.self, from: data) {
            return AuthenticatedUser(
                id: response.user.id,
                email: response.user.email ?? email,
                displayName: response.user.email ?? email,
                token: response.token
            )
        }

        throw ApiError.cannotParse
    }
}
