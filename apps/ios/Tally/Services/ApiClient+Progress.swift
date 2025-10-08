//
//  ApiClient+Progress.swift
//  Tally
//
//  Episode progress tracking API methods
//

import Foundation

// MARK: - Progress Models

/// Progress set data
struct ProgressSetData: Codable {
    let updatedCount: Int
    let totalRequested: Int
    let status: String
    let message: String
}

/// Progress set API response
private struct ProgressSetResponse: Codable {
    let success: Bool
    let data: ProgressSetData
}

/// Show progress data
struct ShowProgressData: Codable {
    let seasons: [String: [SeasonEpisodeState]]
}

/// Show progress API response
private struct ShowProgressResponse: Codable {
    let success: Bool
    let data: ShowProgressData
}

/// Episode state within a season
struct SeasonEpisodeState: Codable {
    let episodeNumber: Int
    let status: String
}

// MARK: - Progress Extension

extension ApiClient {
    /// Add show to "watching" status (optionally with specific season)
    @MainActor
    func addToWatching(tmdbId: Int, season: Int? = nil) async throws -> UserShow {
        guard currentUser != nil else {
            throw ApiError.unauthorized
        }

        var req = URLRequest(url: baseURL.appendingPathComponent("/api/watchlist"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        addAuthHeaders(&req)

        var body: [String: Any] = ["tmdbId": tmdbId, "status": "watching"]
        if let season = season {
            body["season"] = season
        }
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        do {
            let (data, resp) = try await session.data(for: req)
            guard let http = resp as? HTTPURLResponse else { throw ApiError.badStatus(-1) }
            guard (200..<300).contains(http.statusCode) else {
                if http.statusCode == 401 { throw ApiError.unauthorized }
                throw ApiError.badStatus(http.statusCode)
            }
            // Reuses WatchlistCreateResponse from Watchlist extension
            return try JSONDecoder().decode(WatchlistCreateResponse.self, from: data).data.userShow
        } catch {
            throw mapToApiError(error)
        }
    }

    /// Set episode progress (watched/watching)
    @MainActor
    func setEpisodeProgress(tmdbId: Int, seasonNumber: Int, episodeNumber: Int, status: String = "watching") async throws -> ProgressSetData {
        var req = URLRequest(url: baseURL.appendingPathComponent("/api/watchlist/\(tmdbId)/progress"))
        req.httpMethod = "PUT"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        addAuthHeaders(&req)
        let body: [String: Any] = [
            "seasonNumber": seasonNumber,
            "episodeNumber": episodeNumber,
            "status": status
        ]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        do {
            let (data, resp) = try await session.data(for: req)
            guard let http = resp as? HTTPURLResponse else { throw ApiError.badStatus(-1) }
            guard (200..<300).contains(http.statusCode) else {
                if http.statusCode == 401 { throw ApiError.unauthorized }
                #if DEBUG
                if let body = String(data: data, encoding: .utf8) { print("Set progress error:", body) }
                #endif
                throw ApiError.badStatus(http.statusCode)
            }

            let response = try JSONDecoder().decode(ProgressSetResponse.self, from: data)
            return response.data
        } catch {
            throw mapToApiError(error)
        }
    }

    /// Get show progress (all seasons and episodes)
    @MainActor
    func getShowProgress(tmdbId: Int) async throws -> ShowProgressData {
        let url = baseURL.appendingPathComponent("/api/watchlist/\(tmdbId)/progress")
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        addAuthHeaders(&req)

        do {
            let (data, resp) = try await session.data(for: req)
            guard let http = resp as? HTTPURLResponse else { throw ApiError.badStatus(-1) }
            guard (200..<300).contains(http.statusCode) else {
                if http.statusCode == 401 { throw ApiError.unauthorized }
                throw ApiError.badStatus(http.statusCode)
            }
            return try JSONDecoder().decode(ShowProgressResponse.self, from: data).data
        } catch {
            throw mapToApiError(error)
        }
    }

    /// Update user's chosen streaming provider for a show
    @MainActor
    func updateStreamingProvider(userShowId: String, provider: ProviderSelection?) async throws {
        var req = URLRequest(url: baseURL.appendingPathComponent("/api/watchlist/\(userShowId)/provider"))
        req.httpMethod = "PUT"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        addAuthHeaders(&req)
        let body: [String: Any] = [
            "provider": provider != nil ? [
                "id": provider!.id,
                "name": provider!.name,
                "logo_path": provider!.logo_path
            ] : NSNull()
        ]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        do {
            let (data, resp) = try await session.data(for: req)
            guard let http = resp as? HTTPURLResponse else { throw ApiError.badStatus(-1) }
            guard (200..<300).contains(http.statusCode) else {
                if http.statusCode == 401 { throw ApiError.unauthorized }
                #if DEBUG
                if let s = String(data: data, encoding: .utf8) { print("Update provider error:", s) }
                #endif
                throw ApiError.badStatus(http.statusCode)
            }
            // Response body not used currently
        } catch {
            throw mapToApiError(error)
        }
    }
}

// MARK: - Internal Types (needed by Progress methods)

/// Reuses WatchlistCreateResponse from Watchlist extension
private struct WatchlistCreateResponse: Codable {
    let success: Bool
    let data: WatchlistCreateResponseData
}

private struct WatchlistCreateResponseData: Codable {
    let userShow: UserShow
}
