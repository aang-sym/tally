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
    static let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmN2Y2YmIyYy1lNTM2LTQ2MzUtYWY4NS0xNjI4NjY1NDViNWQiLCJlbWFpbCI6InRlc3QyQGV4YW1wbGUuY29tIiwiZGlzcGxheU5hbWUiOiJ0ZXN0MkBleGFtcGxlLmNvbSIsImlhdCI6MTc2MDkyNzc5OSwiZXhwIjoxNzYxNTMyNTk5fQ.k3v_y2vphn7y6eEx_EvD_t4SjACdWH_nFraDn0Fme1E"
}

/// Pre-configured ApiClient for SwiftUI previews
final class PreviewApiClient: ApiClient {
    init(previewToken: String = PreviewSecrets.token) {
        super.init()
        self.setPreviewAuth(
            token: previewToken,
            userId: "f7f6bb2c-e536-4635-af85-162866545b5d",
            email: "test2@example.com",
            displayName: "Test User"
        )
    }
}

#endif
