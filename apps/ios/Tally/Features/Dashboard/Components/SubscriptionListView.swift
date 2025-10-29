//
//  SubscriptionListView.swift
//  Tally
//
//  Full-screen subscription list with navigation
//

import SwiftUI

struct SubscriptionListView: View {
    let subscriptions: [Subscription]
    let onSelectSubscription: (Subscription) -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.cardSpacing) {
                ForEach(subscriptions) { subscription in
                    CompactSubscriptionRow(subscription: subscription)
                        .onTapGesture {
                            onSelectSubscription(subscription)
                        }
                }
            }
            .screenPadding()
            .padding(.top, Spacing.sm)
            .padding(.bottom, Spacing.xxxl)
        }
        .background(Color.clear)
    }
}

// MARK: - Compact Subscription Row

private struct CompactSubscriptionRow: View {
    let subscription: Subscription

    var body: some View {
        HStack(spacing: Spacing.md) {
            // Provider logo
            if let service = subscription.service,
               ServiceBranding.assetName(for: service, style: .card) != nil {
                GlowingServiceLogoView(
                    service: service,
                    baseSize: 36.72,
                    dynamicScale: 1.0,
                    style: .card
                )
                .frame(width: 36.72, height: 36.72)
            } else {
                Circle()
                    .fill(Color.backgroundTertiary)
                    .frame(width: 36.72, height: 36.72)
                    .overlay(
                        Text(serviceInitials)
                            .font(.labelMedium)
                            .foregroundColor(.textSecondary)
                    )
            }

            // Provider details
            VStack(alignment: .leading, spacing: 4) {
                Text(subscription.serviceName)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.textPrimary)

                HStack(spacing: 6) {
                    // Show count placeholder
                    Text("Watching 0 shows")
                        .font(.captionMedium)
                        .foregroundColor(.textSecondary)

                    Text("•")
                        .font(.captionMedium)
                        .foregroundColor(.textTertiary)

                    Text(subscription.isActive ? "Active" : "Inactive")
                        .font(.captionMedium)
                        .foregroundColor(subscription.isActive ? .green : .red)
                }
            }

            Spacer()

            // Cost and chevron
            HStack(spacing: 8) {
                Text(subscription.formattedCost)
                    .font(.bodyMedium)
                    .fontWeight(.medium)
                    .foregroundColor(.textPrimary)

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.textTertiary)
            }
        }
        .padding(Spacing.md)
        .glassEffect(.clear)
    }

    private var serviceInitials: String {
        if let service = subscription.service {
            return ServiceBranding.initials(for: service)
        }
        return "?"
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Subscription List") {
    NavigationStack {
        SubscriptionListView(
            subscriptions: Subscription.previews,
            onSelectSubscription: { _ in }
        )
    }
}
#endif
