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

#if DEBUG
// MARK: - SwiftUI Preview
struct TVGuide2View_Previews: PreviewProvider {
    final class PreviewApiClient: ApiClient {
        init(previewToken: String = PreviewSecrets.token) {
            super.init()
            self.setTokenForPreview(previewToken)
        }
    }
    
    static var previews: some View {
        TVGuide2View(apiClient: PreviewApiClient())
    }
}
#endif
