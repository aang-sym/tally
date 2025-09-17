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
private struct WatchlistCreateResponseData: Codable {
    let userShow: UserShow
}

private struct WatchlistCreateResponse: Codable {
    let success: Bool
    let data: WatchlistCreateResponseData
}

// Response wrapper for search endpoint
private struct SearchResponse: Codable {
    let success: Bool
    let query: String
    let country: String
    let results: [SearchResult]
}

// MARK: - Show Details Models for expandable search
struct Episode: Codable, Identifiable {
    let id: String
    let episodeNumber: Int
    let name: String?
    let airDate: String?
    let overview: String?
    let runtime: Int?
    let stillPath: String?

    enum CodingKeys: String, CodingKey {
        case id
        case episodeNumber = "episode_number"
        case name
        case airDate = "air_date"
        case overview
        case runtime
        case stillPath = "still_path"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        episodeNumber = try container.decode(Int.self, forKey: .episodeNumber)
        name = try container.decodeIfPresent(String.self, forKey: .name)
        airDate = try container.decodeIfPresent(String.self, forKey: .airDate)
        overview = try container.decodeIfPresent(String.self, forKey: .overview)
        runtime = try container.decodeIfPresent(Int.self, forKey: .runtime)
        stillPath = try container.decodeIfPresent(String.self, forKey: .stillPath)
        // Generate a unique ID since the API might not provide one
        id = "\(episodeNumber)"
    }
}

struct Season: Codable, Identifiable {
    let id: String
    let seasonNumber: Int
    let name: String?
    let episodeCount: Int
    let airDate: String?
    let posterPath: String?
    let overview: String?
    let episodes: [Episode]

    enum CodingKeys: String, CodingKey {
        case seasonNumber = "season_number"
        case name
        case episodeCount = "episode_count"
        case airDate = "air_date"
        case posterPath = "poster_path"
        case overview
        case episodes
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        seasonNumber = try container.decode(Int.self, forKey: .seasonNumber)
        name = try container.decodeIfPresent(String.self, forKey: .name)
        episodeCount = try container.decode(Int.self, forKey: .episodeCount)
        airDate = try container.decodeIfPresent(String.self, forKey: .airDate)
        posterPath = try container.decodeIfPresent(String.self, forKey: .posterPath)
        overview = try container.decodeIfPresent(String.self, forKey: .overview)
        episodes = try container.decode([Episode].self, forKey: .episodes)
        // Generate a unique ID
        id = "\(seasonNumber)"
    }
}

// Response models for /analyze endpoint
struct ReleasePattern: Codable {
    let pattern: String
    let confidence: Double?
}

struct AnalysisResult: Codable {
    let showDetails: AnalysisShowDetails
    let seasonInfo: [SeasonInfo]
    let pattern: ReleasePattern?
    let confidence: Double?
    let reasoning: String?
    let watchProviders: [WatchProvider]?
}

struct AnalysisShowDetails: Codable {
    let id: Int
    let title: String
    let overview: String?
    let poster: String?
    let status: String?
    let firstAirDate: String?
    let lastAirDate: String?

    enum CodingKeys: String, CodingKey {
        case id, title, overview, poster, status
        case firstAirDate = "firstAirDate"
        case lastAirDate = "lastAirDate"
    }
}

struct SeasonInfo: Codable {
    let seasonNumber: Int
    let episodeCount: Int
    let airDate: String?

    enum CodingKeys: String, CodingKey {
        case seasonNumber, episodeCount, airDate
    }
}

struct WatchProvider: Codable {
    let providerId: Int
    let name: String
    let logo: String?
    let type: String?

    enum CodingKeys: String, CodingKey {
        case providerId = "providerId"
        case name, logo, type
    }
}

// Provider selection payload for saving user's chosen streaming provider
struct ProviderSelection: Codable {
    let id: Int
    let name: String
    let logo_path: String
}

private struct AnalyzeResponse: Codable {
    let success: Bool
    let showId: Int
    let country: String
    let analysis: AnalysisResult
}

// Response models for /season/:season/raw endpoint
struct SeasonRawData: Codable {
    let season: SeasonData
}

struct SeasonData: Codable {
    let seasonNumber: Int
    let episodes: [Episode]

    enum CodingKeys: String, CodingKey {
        case seasonNumber = "season_number"
        case episodes
    }
}

private struct SeasonRawResponse: Codable {
    let success: Bool
    let showId: Int
    let season: Int
    let country: String
    let raw: SeasonRawData
}

private struct SearchResult: Codable {
    let id: Int
    let title: String
    let overview: String?
    let poster: String?
    let firstAirDate: String?
    let year: Int?
    let popularity: Double?

    enum CodingKeys: String, CodingKey {
        case id, title, overview, poster, year, popularity
        case firstAirDate = "firstAirDate"
    }
}

// MARK: - TV Guide Models
struct TVGuideEpisode: Codable, Identifiable {
    let id: String
    let episodeNumber: Int?
    let seasonNumber: Int?
    let airDate: String
    let title: String
    let overview: String?
    let isWatched: Bool
    let tmdbId: Int

    enum CodingKeys: String, CodingKey {
        case episodeNumber, seasonNumber, airDate, title, overview, isWatched, tmdbId
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        episodeNumber = try container.decodeIfPresent(Int.self, forKey: .episodeNumber)
        seasonNumber = try container.decodeIfPresent(Int.self, forKey: .seasonNumber)
        airDate = try container.decode(String.self, forKey: .airDate)
        title = try container.decode(String.self, forKey: .title)
        overview = try container.decodeIfPresent(String.self, forKey: .overview)
        isWatched = try container.decode(Bool.self, forKey: .isWatched)
        tmdbId = try container.decode(Int.self, forKey: .tmdbId)
        // Generate unique ID
        let season = seasonNumber ?? 1
        let episode = episodeNumber ?? 0
        id = "\(tmdbId)-s\(season)e\(episode)"
    }
}

struct TVGuideStreamingService: Codable, Identifiable {
    let id: Int
    let name: String
    let logo: String?
    let color: String?
    let textColor: String?
}

struct TVGuideShow: Codable, Identifiable {
    let id: String
    let tmdbId: Int
    let title: String
    let poster: String?
    let overview: String?
    let status: String?
    let streamingServices: [TVGuideStreamingService]
    let nextEpisodeDate: String?
    let activeWindow: TVGuideActiveWindow?
    let upcomingEpisodes: [TVGuideEpisode]
    let userProgress: TVGuideUserProgress?
    let pattern: String?
    let confidence: Double?
    let bufferDays: Int?
    let country: String?

    enum CodingKeys: String, CodingKey {
        case tmdbId, title, poster, overview, status, streamingServices, nextEpisodeDate, activeWindow, upcomingEpisodes, userProgress, pattern, confidence, bufferDays, country
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        tmdbId = try container.decode(Int.self, forKey: .tmdbId)
        title = try container.decode(String.self, forKey: .title)
        poster = try container.decodeIfPresent(String.self, forKey: .poster)
        overview = try container.decodeIfPresent(String.self, forKey: .overview)
        status = try container.decodeIfPresent(String.self, forKey: .status)
        streamingServices = try container.decode([TVGuideStreamingService].self, forKey: .streamingServices)
        nextEpisodeDate = try container.decodeIfPresent(String.self, forKey: .nextEpisodeDate)
        activeWindow = try container.decodeIfPresent(TVGuideActiveWindow.self, forKey: .activeWindow)
        upcomingEpisodes = try container.decode([TVGuideEpisode].self, forKey: .upcomingEpisodes)
        userProgress = try container.decodeIfPresent(TVGuideUserProgress.self, forKey: .userProgress)
        pattern = try container.decodeIfPresent(String.self, forKey: .pattern)
        confidence = try container.decodeIfPresent(Double.self, forKey: .confidence)
        bufferDays = try container.decodeIfPresent(Int.self, forKey: .bufferDays)
        country = try container.decodeIfPresent(String.self, forKey: .country)
        // Generate unique ID
        id = "\(tmdbId)"
    }
}

struct TVGuideActiveWindow: Codable {
    let start: String
    let end: String
}

struct TVGuideUserProgress: Codable {
    let currentSeason: Int
    let currentEpisode: Int
    let watchedEpisodes: [String]
}

struct TVGuideServiceGroup: Codable {
    let service: TVGuideStreamingService
    let shows: [TVGuideShow]
}

struct TVGuideDateRange: Codable {
    let startDate: String
    let endDate: String
}

struct TVGuideData: Codable {
    let services: [TVGuideServiceGroup]
    let dateRange: TVGuideDateRange
    let totalShows: Int
    let totalEpisodes: Int
}

private struct TVGuideResponse: Codable {
    let success: Bool
    let data: TVGuideData
}

class ApiClient: ObservableObject {
    private let baseURL = URL(string: "http://localhost:4000")!
    private var token: String?
    private var currentUser: AuthenticatedUser?

    init(token: String? = nil) {
        self.token = token
    }

#if DEBUG
    /// Inject a JWT only (used when you don't need user-specific endpoints).
    public func setTokenForPreview(_ token: String) {
        self.token = token
    }

    /// Inject both token and a lightweight user so user-scoped endpoints (like /users/:id/...) work in previews.
    public func setPreviewAuth(token: String,
                               userId: String = "preview-user",
                               email: String = "preview@example.com",
                               displayName: String = "Preview User") {
        self.token = token
        self.currentUser = AuthenticatedUser(id: userId,
                                             email: email,
                                             displayName: displayName,
                                             token: token)
    }
#endif

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

    // MARK: - Search
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
                    // TMDB service unavailable
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
                    id: UUID().uuidString, // Generate unique ID for iOS
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

    // MARK: - Show Analysis for expandable search
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

            #if DEBUG
            if let responseString = String(data: data, encoding: .utf8) {
                print("Season Raw API Response:", responseString)
            }
            #endif

            let response = try JSONDecoder().decode(SeasonRawResponse.self, from: data)
            return response.raw.season
        } catch {
            throw mapToApiError(error)
        }
    }

    // Enhanced addToWatchlist method that supports specifying season
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
            return try JSONDecoder().decode(WatchlistCreateResponse.self, from: data).data.userShow
        } catch {
            throw mapToApiError(error)
        }
    }

    // MARK: - Episode Progress
    struct ProgressSetResponse: Codable {
        let success: Bool
        let data: ProgressSetData
    }

    struct ProgressSetData: Codable {
        let updatedCount: Int
        let totalRequested: Int
        let status: String
        let message: String
    }

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

    // Read back server progress grouped by season
    struct ShowProgressResponse: Codable {
        let success: Bool
        let data: ShowProgressData
    }

    struct ShowProgressData: Codable {
        let seasons: [String: [SeasonEpisodeState]]
    }

    struct SeasonEpisodeState: Codable {
        let episodeNumber: Int
        let status: String
    }

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

    // Save user's selected streaming provider for a watchlist item (user_show)
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

    // MARK: - TV Guide
    @MainActor
    func getTVGuide(startDate: String? = nil, endDate: String? = nil, country: String? = nil) async throws -> TVGuideData {
        var comps = URLComponents(url: baseURL.appendingPathComponent("/api/tv-guide"), resolvingAgainstBaseURL: false)!
        var queryItems: [URLQueryItem] = []

        if let startDate = startDate {
            queryItems.append(URLQueryItem(name: "startDate", value: startDate))
        }
        if let endDate = endDate {
            queryItems.append(URLQueryItem(name: "endDate", value: endDate))
        }
        if let country = country {
            queryItems.append(URLQueryItem(name: "country", value: country))
        }

        if !queryItems.isEmpty {
            comps.queryItems = queryItems
        }

        var req = URLRequest(url: comps.url!)
        req.httpMethod = "GET"
        addAuthHeaders(&req)

        do {
            let (data, resp) = try await session.data(for: req)
            guard let http = resp as? HTTPURLResponse else { throw ApiError.badStatus(-1) }
            guard (200..<300).contains(http.statusCode) else {
                if http.statusCode == 401 { throw ApiError.unauthorized }
                #if DEBUG
                if let body = String(data: data, encoding: .utf8) { print("TV Guide error:", body) }
                #endif
                throw ApiError.badStatus(http.statusCode)
            }

            #if DEBUG
            if let responseString = String(data: data, encoding: .utf8) {
                print("TV Guide API Response:", responseString)
            }
            #endif

            let response = try JSONDecoder().decode(TVGuideResponse.self, from: data)
            return response.data
        } catch {
            throw mapToApiError(error)
        }
    }
}
