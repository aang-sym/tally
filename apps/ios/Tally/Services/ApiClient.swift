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

// MARK: - TVGuide2 Models (UIKit Excel-like Grid)
struct TVGuide2Episode: Codable, Identifiable, Hashable {
    let id: String
    let episodeNumber: Int
    let seasonNumber: Int
    let airDate: String
    let title: String
    let overview: String?
    let isWatched: Bool
    let tmdbId: Int
    let rating: Double?

    enum CodingKeys: String, CodingKey {
        case episodeNumber = "episode_number"
        case seasonNumber = "season_number"
        case airDate = "air_date"
        case title, overview, isWatched = "watched", tmdbId, rating
    }

    init(id: String, episodeNumber: Int, seasonNumber: Int, airDate: String, title: String, overview: String?, isWatched: Bool, tmdbId: Int, rating: Double?) {
        self.id = id
        self.episodeNumber = episodeNumber
        self.seasonNumber = seasonNumber
        self.airDate = airDate
        self.title = title
        self.overview = overview
        self.isWatched = isWatched
        self.tmdbId = tmdbId
        self.rating = rating
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        episodeNumber = try container.decode(Int.self, forKey: .episodeNumber)
        seasonNumber = try container.decode(Int.self, forKey: .seasonNumber)
        airDate = try container.decode(String.self, forKey: .airDate)
        title = try container.decode(String.self, forKey: .title)
        overview = try container.decodeIfPresent(String.self, forKey: .overview)
        isWatched = try container.decodeIfPresent(Bool.self, forKey: .isWatched) ?? false
        tmdbId = try container.decode(Int.self, forKey: .tmdbId)
        rating = try container.decodeIfPresent(Double.self, forKey: .rating)
        id = "\(tmdbId)-s\(seasonNumber)e\(episodeNumber)"
    }

    static func createManually(
        tmdbId: Int,
        seasonNumber: Int,
        episodeNumber: Int,
        airDate: String,
        title: String,
        overview: String?,
        isWatched: Bool,
        rating: Double?
    ) -> TVGuide2Episode {
        return TVGuide2Episode(
            id: "\(tmdbId)-s\(seasonNumber)e\(episodeNumber)",
            episodeNumber: episodeNumber,
            seasonNumber: seasonNumber,
            airDate: airDate,
            title: title,
            overview: overview,
            isWatched: isWatched,
            tmdbId: tmdbId,
            rating: rating
        )
    }
}

struct TVGuide2Show: Codable, Identifiable, Hashable {
    let id: String
    let tmdbId: Int
    let title: String
    let posterPath: String?
    let episodes: [TVGuide2Episode]
    let countryCode: String?
    let bufferDays: Int?

    enum CodingKeys: String, CodingKey {
        case tmdbId = "tmdb_id"
        case title
        case posterPath = "poster_path"
        case episodes
        case countryCode = "country_code"
        case bufferDays = "buffer_days"
    }

    init(id: String, tmdbId: Int, title: String, posterPath: String?, episodes: [TVGuide2Episode], countryCode: String?, bufferDays: Int?) {
        self.id = id
        self.tmdbId = tmdbId
        self.title = title
        self.posterPath = posterPath
        self.episodes = episodes
        self.countryCode = countryCode
        self.bufferDays = bufferDays
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        tmdbId = try container.decode(Int.self, forKey: .tmdbId)
        title = try container.decode(String.self, forKey: .title)
        posterPath = try container.decodeIfPresent(String.self, forKey: .posterPath)
        episodes = try container.decode([TVGuide2Episode].self, forKey: .episodes)
        countryCode = try container.decodeIfPresent(String.self, forKey: .countryCode)
        bufferDays = try container.decodeIfPresent(Int.self, forKey: .bufferDays)
        id = "\(tmdbId)"
    }

    static func createManually(
        tmdbId: Int,
        title: String,
        posterPath: String?,
        episodes: [TVGuide2Episode],
        countryCode: String?,
        bufferDays: Int?
    ) -> TVGuide2Show {
        return TVGuide2Show(
            id: "\(tmdbId)",
            tmdbId: tmdbId,
            title: title,
            posterPath: posterPath,
            episodes: episodes,
            countryCode: countryCode,
            bufferDays: bufferDays
        )
    }
}

struct TVGuide2Provider: Codable, Identifiable, Hashable {
    let id: Int
    let name: String
    let logoPath: String?
    let shows: [TVGuide2Show]

    enum CodingKeys: String, CodingKey {
        case id, name
        case logoPath = "logo_path"
        case shows
    }

    init(id: Int, name: String, logoPath: String?, shows: [TVGuide2Show]) {
        self.id = id
        self.name = name
        self.logoPath = logoPath
        self.shows = shows
    }

    static func createManually(
        id: Int,
        name: String,
        logoPath: String?,
        shows: [TVGuide2Show]
    ) -> TVGuide2Provider {
        return TVGuide2Provider(
            id: id,
            name: name,
            logoPath: logoPath,
            shows: shows
        )
    }
}

struct TVGuide2DateColumn: Codable, Identifiable, Hashable {
    let id: String
    let date: String
    let dayOfWeek: String
    let dayNumber: String

    init(date: String, dayOfWeek: String, dayNumber: String) {
        self.date = date
        self.dayOfWeek = dayOfWeek
        self.dayNumber = dayNumber
        self.id = date
    }
}

struct TVGuide2Data: Codable {
    let providers: [TVGuide2Provider]
    let startDate: String
    let endDate: String
    let totalShows: Int
    let totalEpisodes: Int
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

class ApiClient: ObservableObject {
    let baseURL = URL(string: "http://localhost:4000")!
    var token: String?
    var currentUser: AuthenticatedUser?

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

    var session: URLSession {
        let cfg = URLSessionConfiguration.default
        cfg.timeoutIntervalForRequest = 10
        cfg.waitsForConnectivity = true
        return URLSession(configuration: cfg)
    }

    func mapToApiError(_ error: Error) -> ApiError {
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

    func addAuthHeaders(_ req: inout URLRequest) {
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token, !token.isEmpty {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
    }

    // Generic GET that attaches headers (incl. Authorization when present)
    func getData(from path: String) async throws -> (Data, HTTPURLResponse) {
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
    func postJSON<T: Encodable>(_ path: String, body: T) async throws -> (Data, HTTPURLResponse) {
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
}
