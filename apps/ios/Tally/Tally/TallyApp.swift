//
//  TallyApp.swift
//  Tally
//
//  Created by Angus Symons on 12/9/2025.
//

import SwiftUI

@main
struct TallyApp: App {
    @State private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(appState)
        }
    }
}
