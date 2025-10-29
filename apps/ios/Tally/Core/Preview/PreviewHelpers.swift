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
    static let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmN2Y2YmIyYy1lNTM2LTQ2MzUtYWY4NS0xNjI4NjY1NDViNWQiLCJlbWFpbCI6InRlc3QyQGV4YW1wbGUuY29tIiwiZGlzcGxheU5hbWUiOiJ0ZXN0MkBleGFtcGxlLmNvbSIsImlhdCI6MTc2MTU3MDA1NywiZXhwIjoxNzYyMTc0ODU3fQ.6xZwcux9HxfXEM3n96MXCh_sK_lUxhODni7C1cczpRM"
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
