import SwiftUI

struct DayDetailListView: View {
    let day: Calendar2Day
    let viewModel: CalendarViewModel

    @Environment(\.dismiss) private var dismiss

    private var dayKey: String {
        day.id
    }

    private var dayFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d"
        return formatter
    }

    private var providerPrices: [ProviderPrice] {
        viewModel.getProviderPrices(for: dayKey)
    }

    private var totalCost: String {
        viewModel.getTotalCost(for: dayKey)
    }

    var body: some View {
        NavigationView {
            ZStack {
                // Background similar to the provided image
                Color(.systemBackground)
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Header with total cost
                    headerSection

                    // Provider list
                    if !providerPrices.isEmpty {
                        ScrollView {
                            LazyVStack(spacing: 12) {
                                ForEach(providerPrices, id: \.providerId) { providerPrice in
                                    ProviderRowView(providerPrice: providerPrice)
                                }
                            }
                            .padding(.horizontal, 20)
                            .padding(.top, 20)
                        }
                    } else {
                        Spacer()
                        Text("No providers available")
                            .foregroundColor(.secondary)
                            .font(.subheadline)
                        Spacer()
                    }
                }
            }
            .navigationTitle(dayFormatter.string(from: day.date))
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarBackButtonHidden(true)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(.primary)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private var headerSection: some View {
        VStack(spacing: 8) {
            // Total cost header
            HStack {
                Text("TOTAL:")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)

                Spacer()

                Text(totalCost)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)

            // Separator
            Divider()
                .padding(.horizontal, 20)
        }
        .background(Color(.systemBackground))
    }
}

private struct ProviderRowView: View {
    let providerPrice: ProviderPrice

    var body: some View {
        HStack(spacing: 16) {
            // Provider logo
            AsyncImage(url: logoURL) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFit()
                case .failure(_):
                    fallbackIcon
                case .empty:
                    ProgressView()
                        .frame(width: 32, height: 32)
                @unknown default:
                    fallbackIcon
                }
            }
            .frame(width: 32, height: 32)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            // Provider name
            Text(providerPrice.providerName)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.primary)
                .multilineTextAlignment(.leading)

            Spacer()

            // Price
            Text(providerPrice.formattedPrice)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(.primary)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.secondarySystemBackground))
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(providerPrice.providerName), \(providerPrice.formattedPrice), airing today")
    }

    private var logoURL: URL? {
        // For now, return nil since we need to get logos from the provider data
        // This will be enhanced when we integrate with actual provider logo URLs
        return nil
    }

    private var fallbackIcon: some View {
        RoundedRectangle(cornerRadius: 8)
            .fill(colorForProvider(providerPrice.providerName))
            .frame(width: 32, height: 32)
            .overlay(
                Text(String(providerPrice.providerName.prefix(1)))
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            )
    }

    private func colorForProvider(_ name: String) -> Color {
        let n = name.lowercased()
        if n.contains("netflix") { return .red }
        if n.contains("prime") || n.contains("amazon") { return Color(.systemBlue) }
        if n.contains("disney") { return Color(.systemBlue) }
        if n.contains("hbo") || n.contains("max") { return .purple }
        if n.contains("hulu") { return .green }
        if n.contains("paramount") { return Color(.systemIndigo) }
        if n.contains("apple") { return .black }
        return Color(.systemGray)
    }
}

#if DEBUG
struct DayDetailListView_Previews: PreviewProvider {
    static var previews: some View {
        let sampleDay = Calendar2Day(
            id: "2025-09-15",
            date: Date(),
            inMonth: true
        )

        let sampleVM = CalendarViewModel()

        DayDetailListView(day: sampleDay, viewModel: sampleVM)
    }
}
#endif