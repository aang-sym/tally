//
//  ApiClient+Watchlist.swift
//  Tally
//
//  Watchlist/MyShows CRUD operations
//

import Foundation

// MARK: - Watchlist Models

/// Response wrapper for watchlist list endpoint
private struct WatchlistListResponse: Codable {
    let success: Bool
    let data: ShowsData
    struct ShowsData: Codable {
        let shows: [UserShow]
    }
}

/// Response wrapper for watchlist create endpoint
private struct WatchlistCreateResponse: Codable {
    let success: Bool
    let data: WatchlistCreateResponseData
}

private struct WatchlistCreateResponseData: Codable {
    let userShow: UserShow
}

// MARK: - Watchlist Extension

extension ApiClient {
    /// Get user's watchlist, optionally filtered by status
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

    /// Add a show to watchlist
    @MainActor
    func addToWatchlist(tmdbId: Int, status: ShowStatus = .watchlist) async throws -> UserShow {
        guard currentUser != nil else {
            throw ApiError.unauthorized
        }

        var req = URLRequest(url: baseURL.appendingPathComponent("/api/watchlist"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        addAuthHeaders(&req)
        let body: [String: Any] = ["tmdbId": tmdbId, "status": status.rawValue]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        do {
            let (data, resp) = try await session.data(for: req)
            guard let http = resp as? HTTPURLResponse else { throw ApiError.badStatus(-1) }
            guard (200..<300).contains(http.statusCode) else {
                if http.statusCode == 401 { throw ApiError.unauthorized }
                throw ApiError.badStatus(http.statusCode)
            }
            return try JSONDecoder().decode(WatchlistCreateResponse.self, from: data).data.userShow
        } catch {
            throw mapToApiError(error)
        }
    }

    /// Update show status (watchlist, watching, completed, dropped)
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

    /// Remove show from watchlist
    @MainActor
    func removeFromWatchlist(id: String) async throws {
        var req = URLRequest(url: baseURL.appendingPathComponent("/api/watchlist"))
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
