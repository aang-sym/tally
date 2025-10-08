//
//  SubscriptionsView.swift
//  Tally
//
//  Created by Angus Symons on 15/9/2025.
//

import SwiftUI

struct SubscriptionsView: View {
    @ObservedObject var api: ApiClient
    @StateObject private var viewModel = SubscriptionsViewModel()

    var body: some View {
        NavigationStack {
            VStack {
                if viewModel.isLoading {
                    ProgressView("Loading subscriptions...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = viewModel.error {
                    VStack {
                        Text("Error")
                            .font(.headline)
                            .foregroundColor(.red)
                        Text(error)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                        Button("Retry") {
                            Task {
                                await viewModel.load(api: api)
                            }
                        }
                        .buttonStyle(.bordered)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(viewModel.items) { subscription in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(subscription.serviceName ?? "Unknown Service")
                                .font(.headline)
                            if let price = subscription.price, let currency = subscription.currency {
                                Text("\(price, specifier: "%.2f") \(currency)")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }
            }
            .navigationTitle("Subscriptions")
            .task {
                await viewModel.load(api: api)
            }
        }
    }
}

#Preview {
    SubscriptionsView(api: PreviewApiClient())
}