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

struct ApiClient {
    private let baseURL = URL(string: "http://localhost:4000")!

    private var session: URLSession {
        let cfg = URLSessionConfiguration.default
        cfg.timeoutIntervalForRequest = 10
        cfg.waitsForConnectivity = true
        return URLSession(configuration: cfg)
    }

    func health() async throws -> Health {
        let url = baseURL.appendingPathComponent("/api/health")
        let (data, resp) = try await session.data(from: url)
        guard (resp as? HTTPURLResponse)?.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(Health.self, from: data)
    }
    
    func subscriptions() async throws -> [Subscription] {
        let (data, resp) = try await session.data(
            from: baseURL.appendingPathComponent("/api/subscriptions")
        )
        guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        // try decode as a top-level array
        if let list = try? JSONDecoder().decode([Subscription].self, from: data) {
            return list
        }

        // or decode { "data": [...] }
        struct Envelope: Decodable { let data: [Subscription] }
        if let env = try? JSONDecoder().decode(Envelope.self, from: data) {
            return env.data
        }

        throw URLError(.cannotParseResponse)
    }
    
    private func get<T: Decodable>(_ path: String) async throws -> T {
        let url = baseURL.appendingPathComponent(path)
        let (data, resp) = try await session.data(from: url)
        guard (resp as? HTTPURLResponse)?.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
}
