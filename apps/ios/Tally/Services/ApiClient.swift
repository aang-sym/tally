//
//  ApiClient.swift
//  Tally
//
//  Created by Angus Symons on 12/9/2025.
//

import Foundation

struct Health: Decodable {
    let ok: Bool
    let timestamp: String
}

struct Subscription: Decodable, Identifiable {
    let id: String?
    let serviceName: String?
    let price: Double?
    let currency: String?
}

enum ApiError: Error, LocalizedError {
    case unauthorized
    case badStatus(Int)
    case cannotParse
    case timeout
    case network
    case underlying(Error)

    var errorDescription: String? {
        switch self {
        case .unauthorized: return "Unauthorized (401). Please sign in or provide a token."
        case .badStatus(let code): return "Server responded with status \(code)."
        case .cannotParse: return "Could not parse server response."
        case .timeout: return "The request timed out. Please check your connection."
        case .network: return "You're offline. Please check your internet connection."
        case .underlying(let err): return err.localizedDescription
        }
    }
}

// Helper types for login
private struct LoginRequest: Encodable { let email: String; let password: String }
private struct LoginResponseA: Decodable { let token: String }
private struct LoginResponseB: Decodable { let accessToken: String }

// Updated response structure for the actual API
private struct UserInfo: Decodable {
    let id: String
    let email: String
    let displayName: String
    let avatarUrl: String?
}

private struct LoginResponse: Decodable {
    let user: UserInfo
    let token: String
    let message: String
}

// Wrapper struct for the actual API response format
private struct LoginApiResponse: Decodable {
    let success: Bool
    let data: LoginResponse
}

struct AuthenticatedUser {
    let id: String
    let email: String
    let displayName: String
    let token: String
}

// MARK: - MyShows temporary models (will be moved to Core/Models later)
struct Show: Codable, Identifiable {
    let id: String
    let tmdbId: Int?
    let title: String
    let overview: String?
    let posterPath: String?
    let firstAirDate: String?
    let status: String?
    let totalSeasons: Int?
    let totalEpisodes: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case tmdbId = "tmdb_id"
        case title, overview
        case posterPath = "poster_path"
        case firstAirDate = "first_air_date"
        case status
        case totalSeasons = "total_seasons"
        case totalEpisodes = "total_episodes"
    }
}

enum ShowStatus: String, Codable, CaseIterable {
    case watchlist, watching, completed, dropped
}

struct StreamingProvider: Codable, Identifiable {
    let id: Int
    let name: String
    let logoPath: String?

    enum CodingKeys: String, CodingKey {
        case id, name
        case logoPath = "logo_path"
    }
}

struct UserShow: Codable, Identifiable {
    let id: String
    let status: ShowStatus
    let showRating: Double?
    let notes: String?
    let show: Show
    let streamingProvider: StreamingProvider?

    enum CodingKeys: String, CodingKey {
        case id, status
        case showRating = "show_rating"
        case notes, show
        case streamingProvider = "streaming_provider"
    }
}

// Response wrappers for watchlist endpoints
private struct WatchlistListResponse: Codable {
    let success: Bool
    let data: ShowsData
    struct ShowsData: Codable { let shows: [UserShow] }
}
private struct WatchlistCreateResponse: Codable {
    let success: Bool
    let data: UserShow
}

class ApiClient: ObservableObject {
    private let baseURL = URL(string: "http://localhost:4000")!
    private var token: String?
    private var currentUser: AuthenticatedUser?

    init(token: String? = nil) {
        self.token = token
    }

    // Set authentication credentials in place
    func setAuthentication(user: AuthenticatedUser) {
        self.token = user.token
        self.currentUser = user
    }

    private var session: URLSession {
        let cfg = URLSessionConfiguration.default
        cfg.timeoutIntervalForRequest = 10
        cfg.waitsForConnectivity = true
        return URLSession(configuration: cfg)
    }

    private func mapToApiError(_ error: Error) -> ApiError {
        if let urlErr = error as? URLError {
            switch urlErr.code {
            case .timedOut:
                return .timeout
            case .notConnectedToInternet, .networkConnectionLost, .cannotFindHost, .cannotConnectToHost, .dnsLookupFailed:
                return .network
            default:
                return .underlying(error)
            }
        }
        return .underlying(error)
    }

    private func addAuthHeaders(_ req: inout URLRequest) {
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token, !token.isEmpty {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
    }

    // Generic GET that attaches headers (incl. Authorization when present)
    private func getData(from path: String) async throws -> (Data, HTTPURLResponse) {
        let url = baseURL.appendingPathComponent(path)
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        addAuthHeaders(&req)
        do {
            let (data, resp) = try await session.data(for: req)
            guard let http = resp as? HTTPURLResponse else { throw ApiError.badStatus(-1) }
            return (data, http)
        } catch {
            throw mapToApiError(error)
        }
    }

    // Generic POST with a JSON Encodable body, returns (Data, HTTPURLResponse)
    private func postJSON<T: Encodable>(_ path: String, body: T) async throws -> (Data, HTTPURLResponse) {
        let url = baseURL.appendingPathComponent(path)
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token, !token.isEmpty {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        req.httpBody = try JSONEncoder().encode(body)
        do {
            let (data, resp) = try await session.data(for: req)
            guard let http = resp as? HTTPURLResponse else { throw ApiError.badStatus(-1) }
            return (data, http)
        } catch {
            throw mapToApiError(error)
        }
    }

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

    func health() async throws -> Health {
        let (data, http) = try await getData(from: "/api/health")
        guard http.statusCode == 200 else { throw ApiError.badStatus(http.statusCode) }
        return try JSONDecoder().decode(Health.self, from: data)
    }

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

        // The API returns: {"success": true, "data": {"subscriptions": [...], "totalActive": 0}}
        struct SubscriptionsResponse: Decodable {
            let success: Bool
            let data: SubscriptionsData
        }

        struct SubscriptionsData: Decodable {
            let subscriptions: [Subscription]
            let totalActive: Int
        }

        if let response = try? JSONDecoder().decode(SubscriptionsResponse.self, from: data) {
            return response.data.subscriptions
        }

        // Fallback to old formats for backward compatibility
        if let direct = try? JSONDecoder().decode([Subscription].self, from: data) {
            return direct
        }
        struct DataEnvelope: Decodable { let data: [Subscription] }
        if let env = try? JSONDecoder().decode(DataEnvelope.self, from: data) {
            return env.data
        }
        struct NestedEnvelope: Decodable { struct Inner: Decodable { let subscriptions: [Subscription] } ; let data: Inner }
        if let env2 = try? JSONDecoder().decode(NestedEnvelope.self, from: data) {
            return env2.data.subscriptions
        }
        throw ApiError.cannotParse
    }

    // MARK: - MyShows / Watchlist
    @MainActor
    func getWatchlist(status: ShowStatus? = nil) async throws -> [UserShow] {
        var comps = URLComponents(url: baseURL.appendingPathComponent("/api/watchlist"), resolvingAgainstBaseURL: false)!
        if let status { comps.queryItems = [URLQueryItem(name: "status", value: status.rawValue)] }
        var req = URLRequest(url: comps.url!)
        req.httpMethod = "GET"
        addAuthHeaders(&req)

        do {
            let (data, resp) = try await session.data(for: req)
            guard let http = resp as? HTTPURLResponse else { throw ApiError.badStatus(-1) }
            guard (200..<300).contains(http.statusCode) else {
                if http.statusCode == 401 { throw ApiError.unauthorized }
                #if DEBUG
                if let body = String(data: data, encoding: .utf8) { print("Watchlist error:", body) }
                #endif
                throw ApiError.badStatus(http.statusCode)
            }
            if let decoded = try? JSONDecoder().decode(WatchlistListResponse.self, from: data) {
                return decoded.data.shows
            }
            // Back-compat fallbacks
            if let direct = try? JSONDecoder().decode([UserShow].self, from: data) { return direct }
            struct Envelope: Codable { let data: [UserShow] }
            if let env = try? JSONDecoder().decode(Envelope.self, from: data) { return env.data }
            throw ApiError.cannotParse
        } catch {
            throw mapToApiError(error)
        }
    }

    @MainActor
    func addToWatchlist(tmdbId: Int, status: ShowStatus = .watchlist) async throws -> UserShow {
        var req = URLRequest(url: baseURL.appendingPathComponent("/api/watchlist"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        addAuthHeaders(&req)
        let body: [String: Any] = ["tmdb_id": tmdbId, "status": status.rawValue]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        do {
            let (data, resp) = try await session.data(for: req)
            guard let http = resp as? HTTPURLResponse else { throw ApiError.badStatus(-1) }
            guard (200..<300).contains(http.statusCode) else {
                if http.statusCode == 401 { throw ApiError.unauthorized }
                throw ApiError.badStatus(http.statusCode)
            }
            return try JSONDecoder().decode(WatchlistCreateResponse.self, from: data).data
        } catch {
            throw mapToApiError(error)
        }
    }

    @MainActor
    func updateShowStatus(id: String, status: ShowStatus) async throws {
        var req = URLRequest(url: baseURL.appendingPathComponent("/api/watchlist/\(id)/status"))
        req.httpMethod = "PUT"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        addAuthHeaders(&req)
        let body = ["status": status.rawValue]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        do {
            let (data, resp) = try await session.data(for: req)
            guard let http = resp as? HTTPURLResponse else { throw ApiError.badStatus(-1) }
            guard (200..<300).contains(http.statusCode) else {
                if http.statusCode == 401 { throw ApiError.unauthorized }
                #if DEBUG
                if let body = String(data: data, encoding: .utf8) { print("Update status error:", body) }
                #endif
                throw ApiError.badStatus(http.statusCode)
            }
        } catch {
            throw mapToApiError(error)
        }
    }

    @MainActor
    func removeFromWatchlist(id: String) async throws {
        var req = URLRequest(url: baseURL.appendingPathComponent("/api/watchlist/\(id)"))
        req.httpMethod = "DELETE"
        addAuthHeaders(&req)

        do {
            let (data, resp) = try await session.data(for: req)
            guard let http = resp as? HTTPURLResponse else { throw ApiError.badStatus(-1) }
            guard (200..<300).contains(http.statusCode) else {
                if http.statusCode == 401 { throw ApiError.unauthorized }
                #if DEBUG
                if let body = String(data: data, encoding: .utf8) { print("Remove error:", body) }
                #endif
                throw ApiError.badStatus(http.statusCode)
            }
        } catch {
            throw mapToApiError(error)
        }
    }
}
