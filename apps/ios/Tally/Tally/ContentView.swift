//
//  ContentView.swift
//  Tally
//
//  Created by Angus Symons on 12/9/2025.
//

import SwiftUI

struct ContentView: View {
    @State private var status = "Loading…"
    @State private var token: String = ""
    @State private var email: String = "test@example.com"
    @State private var password: String = "password"
    @StateObject private var api = ApiClient()

    var body: some View {
        NavigationStack {
            VStack {
                Text("Tally")
                    .font(.largeTitle)
                Text(status)
                    .monospaced()
                Group {
                    TextField("Email", text: $email)
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()
                    SecureField("Password", text: $password)
                        .textFieldStyle(.roundedBorder)
                    Button("Login (fetch token)") {
                        Task { await loginAndSetToken() }
                    }
                }
                TextField("Auth token (optional)", text: $token)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                Button("Ping API") {
                    Task {
                        await load()
                    }
                }
                NavigationLink("Subscriptions", destination: SubscriptionsView(api: api))
                    .buttonStyle(.bordered)
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
            status = "Error: \((error as? LocalizedError)?.errorDescription ?? error.localizedDescription)"
        }
    }


    @MainActor
    private func loginAndSetToken() async {
        do {
            let authenticatedUser = try await api.login(email: email, password: password)
            token = authenticatedUser.token
            api.setAuthentication(user: authenticatedUser)
            status = "Logged in as \(authenticatedUser.displayName)"
        } catch {
            status = "Login error: \((error as? LocalizedError)?.errorDescription ?? error.localizedDescription)"
        }
    }
}

#Preview {
    ContentView()
}
