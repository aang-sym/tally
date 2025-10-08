//
//  CountryManager.swift
//  Tally
//
//  Simple persistence for user's country preference (web parity)
//

import Foundation

enum CountryManager {
    private static let key = "user_country"

    static func get() -> String {
        UserDefaults.standard.string(forKey: key) ?? "US"
    }

    static func set(_ code: String) {
        UserDefaults.standard.set(code, forKey: key)
    }

    static let all: [String] = [
        "US", "GB", "CA", "AU", "DE", "FR", "JP", "KR", "IN", "BR"
    ]
}

