//
//  ApiClient+Search.swift
//  Tally
//
//  Search and show analysis API methods
//

import Foundation

// MARK: - Search Models

/// Search API response wrapper
private struct SearchResponse: Codable {
    let success: Bool
    let query: String
    let country: String
    let results: [SearchResult]
}

/// Individual search result
private struct SearchResult: Codable {
    let id: Int
    let title: String
    let overview: String?
    let poster: String?
    let firstAirDate: String?
}

/// Show analysis API response wrapper
private struct AnalyzeResponse: Codable {
    let success: Bool
    let showId: Int
    let country: String
    let analysis: AnalysisResult
}

/// Season raw data API response wrapper
private struct SeasonRawResponse: Codable {
    let success: Bool
    let showId: Int
    let season: Int
    let country: String
    let raw: SeasonRawData
}

// MARK: - Search Extension

extension ApiClient {
    /// Search for shows by query string
    @MainActor
    func searchShows(query: String, country: String = "US") async throws -> [Show] {
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return []
        }

        var comps = URLComponents(url: baseURL.appendingPathComponent("/api/tmdb/search"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [
            URLQueryItem(name: "query", value: query),
            URLQueryItem(name: "country", value: country)
        ]

        var req = URLRequest(url: comps.url!)
        req.httpMethod = "GET"
        addAuthHeaders(&req)

        do {
            let (data, resp) = try await session.data(for: req)
            guard let http = resp as? HTTPURLResponse else { throw ApiError.badStatus(-1) }
            guard (200..<300).contains(http.statusCode) else {
                if http.statusCode == 401 { throw ApiError.unauthorized }
                if http.statusCode == 503 {
                    throw ApiError.underlying(NSError(domain: "TMDBServiceUnavailable", code: 503, userInfo: [NSLocalizedDescriptionKey: "Search service temporarily unavailable"]))
                }
                #if DEBUG
                if let body = String(data: data, encoding: .utf8) { print("Search error:", body) }
                #endif
                throw ApiError.badStatus(http.statusCode)
            }

            #if DEBUG
            if let responseString = String(data: data, encoding: .utf8) {
                print("Search API Response:", responseString)
            }
            #endif

            let searchResponse = try JSONDecoder().decode(SearchResponse.self, from: data)

            // Convert SearchResult to Show format
            let shows = searchResponse.results.map { result in
                Show(
                    id: UUID().uuidString,
                    tmdbId: result.id,
                    title: result.title,
                    overview: result.overview,
                    posterPath: result.poster,
                    firstAirDate: result.firstAirDate,
                    status: nil,
                    totalSeasons: nil,
                    totalEpisodes: nil
                )
            }

            return shows
        } catch {
            throw mapToApiError(error)
        }
    }

    /// Analyze a show for streaming providers and release patterns
    @MainActor
    func analyzeShow(tmdbId: Int, country: String = "US") async throws -> AnalysisResult {
        var comps = URLComponents(url: baseURL.appendingPathComponent("/api/tmdb/show/\(tmdbId)/analyze"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "country", value: country)]

        var req = URLRequest(url: comps.url!)
        req.httpMethod = "GET"
        addAuthHeaders(&req)

        do {
            let (data, resp) = try await session.data(for: req)
            guard let http = resp as? HTTPURLResponse else { throw ApiError.badStatus(-1) }
            guard (200..<300).contains(http.statusCode) else {
                if http.statusCode == 401 { throw ApiError.unauthorized }
                if http.statusCode == 503 {
                    throw ApiError.underlying(NSError(domain: "TMDBServiceUnavailable", code: 503, userInfo: [NSLocalizedDescriptionKey: "Show analysis service temporarily unavailable"]))
                }
                #if DEBUG
                if let body = String(data: data, encoding: .utf8) { print("Show analysis error:", body) }
                #endif
                throw ApiError.badStatus(http.statusCode)
            }

            #if DEBUG
            if let responseString = String(data: data, encoding: .utf8) {
                print("Show Analysis API Response:", responseString)
            }
            #endif

            let response = try JSONDecoder().decode(AnalyzeResponse.self, from: data)
            return response.analysis
        } catch {
            throw mapToApiError(error)
        }
    }

    /// Get raw season data for a show
    @MainActor
    func getSeasonRaw(tmdbId: Int, season: Int, country: String = "US") async throws -> SeasonData {
        var comps = URLComponents(url: baseURL.appendingPathComponent("/api/tmdb/show/\(tmdbId)/season/\(season)/raw"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "country", value: country)]

        var req = URLRequest(url: comps.url!)
        req.httpMethod = "GET"
        addAuthHeaders(&req)

        do {
            let (data, resp) = try await session.data(for: req)
            guard let http = resp as? HTTPURLResponse else { throw ApiError.badStatus(-1) }
            guard (200..<300).contains(http.statusCode) else {
                if http.statusCode == 401 { throw ApiError.unauthorized }
                if http.statusCode == 503 {
                    throw ApiError.underlying(NSError(domain: "TMDBServiceUnavailable", code: 503, userInfo: [NSLocalizedDescriptionKey: "Season data service temporarily unavailable"]))
                }
                #if DEBUG
                if let body = String(data: data, encoding: .utf8) { print("Season raw error:", body) }
                #endif
                throw ApiError.badStatus(http.statusCode)
            }

            let response = try JSONDecoder().decode(SeasonRawResponse.self, from: data)
            return response.raw.season
        } catch {
            throw mapToApiError(error)
        }
    }
}
