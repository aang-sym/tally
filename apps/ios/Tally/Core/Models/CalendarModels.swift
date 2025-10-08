//
//  CalendarModels.swift
//  Tally
//
//  Shared models used across calendar features
//

import Foundation

struct ProviderBadge: Identifiable, Hashable {
    let id: Int
    let name: String
    let logo: String?
}

struct EpisodeRef: Identifiable, Hashable {
    let id: String
    let tmdbId: Int
    let seasonNumber: Int
    let episodeNumber: Int
    let title: String
    let airDate: String
    let overview: String?
}
