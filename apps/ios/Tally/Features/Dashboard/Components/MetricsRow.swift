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
    var showScanlines: Bool = true // Allow disabling scanlines when handled externally

    var body: some View {
        HStack(spacing: Spacing.xl) {
            // Subscriptions
            MetricItem(
                count: "\(subscriptionsCount)",
                label: "Subscriptions",
                showDiamond: true,
                alignment: .leading
            )

            // Shows
            MetricItem(
                count: "\(showsCount)",
                label: "Shows",
                showDiamond: true,
                alignment: .leading
            )

            Spacer()

            // Monthly total
            MetricItem(
                count: monthlyTotal,
                label: "Monthly",
                showDiamond: false,
                alignment: .trailing
            )
        }
        .padding(.horizontal, Spacing.screenPadding)
        .padding(.vertical, Spacing.md)
        .background {
            if showScanlines {
                // CRT scanlines behind metrics (no glass or rounded rectangle)
                CRTScanlinesView()
                    .allowsHitTesting(false)
                    .opacity(0.8)
            }
        }
    }
}

// MARK: - CRT Scanlines View

private struct CRTScanlinesView: View {
    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 1) {
                ForEach(0..<Int(geometry.size.height / 3), id: \.self) { _ in
                    Rectangle()
                        .fill(Color.white.opacity(0.04))
                        .frame(height: 2)
                    Spacer()
                        .frame(height: 1)
                }
            }
        }
    }
}

// MARK: - Metric Item

private struct MetricItem: View {
    let count: String
    let label: String
    let showDiamond: Bool
    let alignment: HorizontalAlignment

    var body: some View {
        VStack(alignment: alignment, spacing: 2) {
            Text(count)
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(.textPrimary)

            HStack(spacing: 4) {
                Text(label)
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)

                if showDiamond {
                    Text("◇")
                        .font(.system(size: 10))
                        .foregroundColor(.textTertiary)
                }
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
