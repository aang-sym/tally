//
//  SubscriptionsViewModel.swift
//  Tally
//
//  Created by Angus Symons on 15/9/2025.
//

import Foundation

@MainActor
class SubscriptionsViewModel: ObservableObject {
    @Published var items: [Subscription] = []
    @Published var isLoading: Bool = false
    @Published var error: String? = nil

    func load(api: ApiClient) async {
        isLoading = true
        error = nil

        do {
            let subscriptions = try await api.subscriptions()
            items = subscriptions
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }

        isLoading = false
    }
}