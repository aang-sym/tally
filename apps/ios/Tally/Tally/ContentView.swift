//
//  ContentView.swift
//  Tally
//
//  Created by Angus Symons on 12/9/2025.
//

import SwiftUI

struct ContentView: View {
    @State private var status = "Loading…"
    @State private var subscriptions: [Subscription] = []
    let api = ApiClient()

    var body: some View {
        NavigationStack {
            VStack {
                Text("Tally")
                    .font(.largeTitle)
                Text(status)
                    .monospaced()
                Button("Ping API") {
                    Task {
                        await load()
                    }
                }
                Button("Load Subscriptions") {
                    Task {
                        await loadSubscriptions()
                    }
                }
                List(subscriptions) { sub in
                    VStack(alignment: .leading) {
                        Text(sub.serviceName ?? "Unknown Service")
                            .font(.headline)
                        if let price = sub.price, let currency = sub.currency {
                            Text("\(price, specifier: "%.2f") \(currency)")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
            .padding()
            .task {
                await load()
            }
        }
    }

    @MainActor private func load() async {
        do {
            let health = try await api.health()
            status = "Last updated: \(health.timestamp)"
        } catch {
            status = "Error: \(error.localizedDescription)"
        }
    }

    @MainActor
    private func loadSubscriptions() async {
        do {
            subscriptions = try await api.subscriptions()
        } catch {
            status = "Subs error: \(error.localizedDescription)"
        }
    }
}

#Preview {
    ContentView()
}
