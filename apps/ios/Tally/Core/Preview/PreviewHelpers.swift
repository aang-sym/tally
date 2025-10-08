//
//  PreviewHelpers.swift
//  Tally
//
//  Shared preview helpers for SwiftUI previews across all features
//

import Foundation

#if DEBUG

/// Hardcoded secrets for SwiftUI previews
enum PreviewSecrets {
    /// Valid test token for preview API calls
    static let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmN2Y2YmIyYy1lNTM2LTQ2MzUtYWY4NS0xNjI4NjY1NDViNWQiLCJlbWFpbCI6InRlc3QyQGV4YW1wbGUuY29tIiwiZGlzcGxheU5hbWUiOiJ0ZXN0MkBleGFtcGxlLmNvbSIsImlhdCI6MTc1OTcwMzU5OSwiZXhwIjoxNzYwMzA4Mzk5fQ.CYIO6nlCzlzB0AoTgvZr0X1M6gBJ8uqEWPoa0feblwY"
}

/// Pre-configured ApiClient for SwiftUI previews
final class PreviewApiClient: ApiClient {
    init(previewToken: String = PreviewSecrets.token) {
        super.init()
        self.setTokenForPreview(previewToken)
    }
}

#endif
