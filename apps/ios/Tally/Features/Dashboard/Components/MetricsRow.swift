//
//  MetricsRow.swift
//  Tally
//
//  Compact metrics row showing subscriptions, shows, and monthly cost
//

import SwiftUI

struct MetricsRow: View {
    let subscriptionsCount: Int
    let showsCount: Int
    let monthlyTotal: String

    var body: some View {
        HStack(spacing: Spacing.lg) {
            // Subscriptions
            MetricItem(
                count: "\(subscriptionsCount)",
                label: "Subscriptions",
                showDiamond: true
            )

            // Shows
            MetricItem(
                count: "\(showsCount)",
                label: "Shows",
                showDiamond: true
            )

            // Monthly total
            MetricItem(
                count: monthlyTotal,
                label: "Monthly",
                showDiamond: false
            )

            Spacer()

            // Next button
            Button(action: {
                // TODO: Handle next action
            }) {
                HStack(spacing: 4) {
                    Text("Next")
                        .font(.captionMedium)
                    Image(systemName: "arrow.down")
                        .font(.system(size: 10, weight: .medium))
                }
                .foregroundColor(.textTertiary)
            }
        }
        .padding(.horizontal, Spacing.screenPadding)
        .padding(.vertical, Spacing.md)
    }
}

// MARK: - Metric Item

private struct MetricItem: View {
    let count: String
    let label: String
    let showDiamond: Bool

    var body: some View {
        HStack(spacing: 4) {
            Text(count)
                .font(.bodyMedium)
                .foregroundColor(.textPrimary)

            Text(label)
                .font(.captionMedium)
                .foregroundColor(.textSecondary)

            if showDiamond {
                Text("◇")
                    .font(.system(size: 10))
                    .foregroundColor(.textTertiary)
            }
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    VStack {
        MetricsRow(
            subscriptionsCount: 3,
            showsCount: 6,
            monthlyTotal: "$34.97"
        )
        .background(Color.heroBackground)
    }
    .background(Color.background)
}
#endif
