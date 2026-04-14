import SwiftUI

// MARK: - Add Subscription View

struct AddSubscriptionView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    var onAdded: (() -> Void)?

    private let api: ApiClient

    @State private var services: [StreamingService] = []
    @State private var searchText = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedService: StreamingService?
    @State private var showTierSheet = false

    init(api: ApiClient, onAdded: (() -> Void)? = nil) {
        self.api = api
        self.onAdded = onAdded
    }

    var filteredServices: [StreamingService] {
        if searchText.isEmpty { return services }
        return services.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading && services.isEmpty {
                    ProgressView("Loading services…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = errorMessage {
                    ContentUnavailableView(
                        "Couldn't load services",
                        systemImage: "wifi.slash",
                        description: Text(error)
                    )
                } else {
                    List(filteredServices) { service in
                        ServiceRow(service: service)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                selectedService = service
                                showTierSheet = true
                            }
                    }
                    .listStyle(.plain)
                    .searchable(text: $searchText, prompt: "Search services")
                }
            }
            .navigationTitle("Add Subscription")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .task { await loadServices() }
            .sheet(isPresented: $showTierSheet) {
                if let service = selectedService {
                    TierSelectionView(service: service, api: api) {
                        onAdded?()
                        dismiss()
                    }
                }
            }
        }
    }

    @MainActor
    private func loadServices() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            services = try await api.streamingServices()
        } catch {
            errorMessage = "Failed to load streaming services."
        }
    }
}

// MARK: - Service Row

private struct ServiceRow: View {
    let service: StreamingService

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: service.logoURL) { image in
                image.resizable().scaledToFit()
            } placeholder: {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.secondary.opacity(0.2))
            }
            .frame(width: 44, height: 44)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 2) {
                Text(service.name)
                    .font(.body)
                if let price = service.defaultPrice {
                    Text(price.formattedPrice + "/mo")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Tier Selection Sheet

private struct TierSelectionView: View {
    let service: StreamingService
    let api: ApiClient
    let onAdded: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var selectedPrice: ServicePrice?
    @State private var customCost: String = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    private var costToSubmit: Double? {
        if let price = selectedPrice { return price.amount }
        return Double(customCost)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Select Plan") {
                    if service.prices.isEmpty {
                        HStack {
                            Text("Monthly cost")
                            Spacer()
                            TextField("0.00", text: $customCost)
                                .keyboardType(.decimalPad)
                                .multilineTextAlignment(.trailing)
                        }
                    } else {
                        ForEach(service.prices) { price in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(price.tier)
                                    Text(price.formattedPrice + "/mo")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                if selectedPrice?.id == price.id {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(.blue)
                                }
                            }
                            .contentShape(Rectangle())
                            .onTapGesture { selectedPrice = price }
                        }
                    }
                }

                if let error = errorMessage {
                    Section {
                        Text(error).foregroundStyle(.red).font(.footnote)
                    }
                }
            }
            .navigationTitle(service.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Back") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        Task { await submit() }
                    }
                    .disabled(costToSubmit == nil || isSubmitting)
                }
            }
            .onAppear {
                selectedPrice = service.defaultPrice ?? service.prices.first
            }
        }
    }

    @MainActor
    private func submit() async {
        guard let cost = costToSubmit else { return }
        isSubmitting = true
        errorMessage = nil
        defer { isSubmitting = false }
        do {
            _ = try await api.addSubscription(
                serviceId: service.id,
                monthlyCost: cost,
                tier: selectedPrice?.tier
            )
            onAdded()
        } catch ApiError.unauthorized {
            errorMessage = "Please log in again."
        } catch {
            errorMessage = "Failed to add subscription. Please try again."
        }
    }
}

// MARK: - Preview

#Preview {
    AddSubscriptionView(api: ApiClient())
        .environment(AppState())
}
