//
//  TVGuide2View.swift
//  Tally
//
//  Created by Angus Symons on 12/9/2025.
//

import SwiftUI
import UIKit

struct TVGuide2View: UIViewControllerRepresentable {
    let apiClient: ApiClient

    func makeUIViewController(context: Context) -> TVGuide2ViewController {
        return TVGuide2ViewController(apiClient: apiClient)
    }

    func updateUIViewController(_ uiViewController: TVGuide2ViewController, context: Context) {
        // No updates needed for now
    }
}

// MARK: - SwiftUI Preview
struct TVGuide2View_Previews: PreviewProvider {
    static var previews: some View {
        TVGuide2View(apiClient: ApiClient.previewClient)
    }
}

// MARK: - Preview ApiClient Extension
extension ApiClient {
    static var previewClient: ApiClient {
        let client = ApiClient()
        #if DEBUG
        client.setPreviewAuth(token: "preview-token")
        #endif
        return client
    }
}