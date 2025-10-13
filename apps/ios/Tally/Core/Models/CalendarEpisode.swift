//
//  CalendarEpisode.swift
//  Tally
//
//  Model representing an episode airing on a specific date for calendar view
//

import Foundation
import SwiftUI

struct CalendarEpisode: Identifiable, Codable {
    let id: String
    let show: Show
    let seasonNumber: Int
    let episode: Episode
    let provider: StreamingProvider
    let airDate: Date
    let recurringDay: Int? // Day of month provider renews (1-31)
    let providerColor: CodableColor? // Provider brand color
    let costPerEpisode: Double? // Cost calculation

    /// Formatted air date string (e.g., "Sept 3")
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: airDate)
    }

    /// Formatted episode identifier (e.g., "S1E3")
    var episodeIdentifier: String {
        "S\(seasonNumber)E\(episode.episodeNumber)"
    }

    /// Full episode title with show name
    var fullTitle: String {
        "\(show.title) - \(episodeIdentifier)"
    }

    /// Episode title or fallback
    var episodeTitle: String {
        episode.name ?? "Episode \(episode.episodeNumber)"
    }

    /// Runtime in minutes or default
    var runtime: Int {
        episode.runtime ?? 45
    }

    /// Synopsis or fallback
    var synopsis: String {
        episode.overview ?? "No description available."
    }
}

// MARK: - Codable Color Wrapper

struct CodableColor: Codable {
    let red: Double
    let green: Double
    let blue: Double
    let opacity: Double

    init(from color: Color) {
        // This is a simplified conversion - SwiftUI Color to RGB components
        // In production, you'd want a more robust conversion
        self.red = 0.5
        self.green = 0.5
        self.blue = 0.5
        self.opacity = 1.0
    }

    var color: Color {
        Color(red: red, green: green, blue: blue, opacity: opacity)
    }
}

// MARK: - Preview Helpers

#if DEBUG
extension CalendarEpisode {
    static let preview = CalendarEpisode(
        id: "preview-1",
        show: Show(
            id: "show-1",
            tmdbId: 66732,
            title: "Stranger Things",
            overview: "A group of friends uncover supernatural mysteries...",
            posterPath: "/x2LSRK2Cm7MZhjluni1msVJ3wDF.jpg",
            firstAirDate: "2016-07-15",
            status: "Returning Series",
            totalSeasons: 5,
            totalEpisodes: 42
        ),
        seasonNumber: 5,
        episode: Episode(
            episodeNumber: 3,
            name: "The Aftermath",
            airDate: "2025-09-03",
            overview: "Max faces a difficult choice as the Mind Flayer's influence spreads throughout Hawkins...",
            runtime: 52,
            stillPath: nil
        ),
        provider: StreamingProvider(
            id: 8,
            name: "Netflix",
            logoPath: "/9A1JSVmSxsyaBK4SUFsYVqbAYfW.jpg"
        ),
        airDate: Date(),
        recurringDay: 15,
        providerColor: CodableColor(from: .red),
        costPerEpisode: 3.12
    )

    static let previews: [CalendarEpisode] = [
        CalendarEpisode(
            id: "preview-1",
            show: Show(
                id: "show-1",
                tmdbId: 66732,
                title: "Stranger Things",
                overview: "A group of friends uncover supernatural mysteries...",
                posterPath: "/x2LSRK2Cm7MZhjluni1msVJ3wDF.jpg",
                firstAirDate: "2016-07-15",
                status: "Returning Series",
                totalSeasons: 5,
                totalEpisodes: 42
            ),
            seasonNumber: 5,
            episode: Episode(
                episodeNumber: 3,
                name: "The Aftermath",
                airDate: "2025-09-03",
                overview: "Max faces a difficult choice as the Mind Flayer's influence spreads throughout Hawkins...",
                runtime: 52,
                stillPath: nil
            ),
            provider: StreamingProvider(
                id: 8,
                name: "Netflix",
                logoPath: "/9A1JSVmSxsyaBK4SUFsYVqbAYfW.jpg"
            ),
            airDate: Date(),
            recurringDay: 15,
            providerColor: CodableColor(from: .red),
            costPerEpisode: 3.12
        ),
        CalendarEpisode(
            id: "preview-2",
            show: Show(
                id: "show-2",
                tmdbId: 82856,
                title: "The Mandalorian",
                overview: "A lone bounty hunter travels the outer reaches...",
                posterPath: "/eU1i6eHXlzMOlEq0ku1Rzq7Y4wA.jpg",
                firstAirDate: "2019-11-12",
                status: "Returning Series",
                totalSeasons: 4,
                totalEpisodes: 32
            ),
            seasonNumber: 4,
            episode: Episode(
                episodeNumber: 1,
                name: "A New Beginning",
                airDate: "2025-09-03",
                overview: "Mando takes on a dangerous mission that leads him to an uncharted sector...",
                runtime: 45,
                stillPath: nil
            ),
            provider: StreamingProvider(
                id: 337,
                name: "Disney Plus",
                logoPath: "/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg"
            ),
            airDate: Date(),
            recurringDay: 3,
            providerColor: CodableColor(from: Color(red: 0.0, green: 0.3, blue: 0.6)),
            costPerEpisode: 2.50
        ),
        CalendarEpisode(
            id: "preview-3",
            show: Show(
                id: "show-3",
                tmdbId: 94997,
                title: "House of the Dragon",
                overview: "The Targaryen civil war unfolds...",
                posterPath: "/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg",
                firstAirDate: "2022-08-21",
                status: "Returning Series",
                totalSeasons: 3,
                totalEpisodes: 24
            ),
            seasonNumber: 3,
            episode: Episode(
                episodeNumber: 8,
                name: "Fire and Blood",
                airDate: "2025-09-03",
                overview: "The battle reaches its peak as the dragons clash over King's Landing...",
                runtime: 68,
                stillPath: nil
            ),
            provider: StreamingProvider(
                id: 384,
                name: "Max",
                logoPath: "/zxrVdFjIjLqkfnwyghnfywTn3Lh.jpg"
            ),
            airDate: Date(),
            recurringDay: 21,
            providerColor: CodableColor(from: .purple),
            costPerEpisode: 4.16
        )
    ]
}
#endif
