//
//  ProviderDetailSheet.swift
//  Tally
//
//  Provider detail view showing cost, activity, and quick actions
//

import SwiftUI

struct ProviderDetailSheet: View {
    let subscription: Subscription
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    // Provider header with logo
                    HStack(spacing: Spacing.md) {
                        if let service = subscription.service,
                           ServiceBranding.assetName(for: service, style: .card) != nil {
                            GlowingServiceLogoView(
                                service: service,
                                baseSize: 57.6,
                                dynamicScale: 1.0,
                                style: .card
                            )
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            Text(subscription.serviceName)
                                .font(.heading2)
                                .foregroundColor(.textPrimary)

                            HStack(spacing: 6) {
                                Circle()
                                    .fill(subscription.isActive ? Color.green : Color.red)
                                    .frame(width: 8, height: 8)

                                Text(subscription.isActive ? "Active" : "Inactive")
                                    .font(.bodyMedium)
                                    .foregroundColor(.textSecondary)
                            }
                        }

                        Spacer()
                    }
                    .padding(.bottom, Spacing.sm)

                    // Cost and Renewal Section
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        SectionHeader(title: "Subscription Details")

                        VStack(spacing: Spacing.sm) {
                            DetailRow(
                                label: "Monthly Cost",
                                value: subscription.formattedCost
                            )

                            if subscription.isActive {
                                DetailRow(
                                    label: "Renewal",
                                    value: subscription.renewalText
                                )
                            }

                            if let tier = subscription.tier {
                                DetailRow(
                                    label: "Plan",
                                    value: tier
                                )
                            }
                        }
                    }
                    .padding(Spacing.md)
                    .glassEffect(.regular)

                    // Activity Section (Placeholder)
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        SectionHeader(title: "Activity")

                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text("Last watched: Unknown")
                                .font(.bodyMedium)
                                .foregroundColor(.textSecondary)
                                .italic()

                            Text("No activity data available")
                                .font(.captionMedium)
                                .foregroundColor(.textTertiary)
                                .italic()
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(Spacing.md)
                    }
                    .glassEffect(.regular)

                    // Shows Section (Placeholder)
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        SectionHeader(title: "Shows")

                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text("Watching: 0 shows")
                                .font(.bodyMedium)
                                .foregroundColor(.textSecondary)

                            Text("Upcoming: 0 shows")
                                .font(.bodyMedium)
                                .foregroundColor(.textSecondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(Spacing.md)
                    }
                    .glassEffect(.regular)

                    // Action Buttons
                    VStack(spacing: Spacing.sm) {
                        ActionButton(
                            icon: "pause.circle.fill",
                            title: "Pause Subscription",
                            color: .orange
                        ) {
                            // TODO: Implement pause
                        }

                        ActionButton(
                            icon: "bell.fill",
                            title: "Remind Me",
                            color: .blue
                        ) {
                            // TODO: Implement reminder
                        }

                        ActionButton(
                            icon: "arrow.up.right.square.fill",
                            title: "Open App",
                            color: .tallyPrimary
                        ) {
                            // TODO: Implement deep link
                        }
                    }
                }
                .screenPadding()
                .padding(.top, Spacing.sm)
            }
            .background(Color.background)
            .navigationTitle("Provider Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Supporting Views

private struct SectionHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.bodyLarge)
            .fontWeight(.semibold)
            .foregroundColor(.textPrimary)
    }
}

private struct DetailRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)

            Spacer()

            Text(value)
                .font(.bodyMedium)
                .fontWeight(.medium)
                .foregroundColor(.textPrimary)
        }
    }
}

private struct ActionButton: View {
    let icon: String
    let title: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: 16))

                Text(title)
                    .font(.labelLarge)

                Spacer()
            }
            .foregroundColor(.white)
            .padding(Spacing.md)
            .background(color)
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Provider Detail") {
    ProviderDetailSheet(subscription: .preview)
}
#endif
