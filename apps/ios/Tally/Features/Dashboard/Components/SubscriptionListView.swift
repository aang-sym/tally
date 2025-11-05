//
//  SubscriptionListView.swift
//  Tally
//
//  Full-screen subscription list with modern Liquid Glass design
//  Matches the expanded ticker style for consistency
//

import SwiftUI

struct SubscriptionListView: View {
    let subscriptions: [Subscription]
    let onSelectSubscription: (Subscription) -> Void
    let namespace: Namespace.ID
    @Binding var isShown: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header with close button (matching ticker style)
            HStack {
                Text("Subscriptions")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)

                Spacer()

                // Close button
                Button {
                    withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                        isShown = false
                    }
                    // Haptic feedback
                    let impactFeedback = UIImpactFeedbackGenerator(style: .soft)
                    impactFeedback.impactOccurred()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white.opacity(0.7))
                        .frame(width: 32, height: 32)
                        .background(
                            Circle()
                                .fill(Color.white.opacity(0.1))
                        )
                }
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.top, Spacing.lg)
            .padding(.bottom, Spacing.md)

            // List content
            ScrollView(showsIndicators: false) {
                VStack(spacing: Spacing.xs) {
                    ForEach(subscriptions) { subscription in
                        CompactSubscriptionRow(subscription: subscription, namespace: namespace)
                            .onTapGesture {
                                onSelectSubscription(subscription)
                                // Haptic feedback
                                let impactFeedback = UIImpactFeedbackGenerator(style: .light)
                                impactFeedback.impactOccurred()
                            }
                    }
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.bottom, Spacing.lg)
            }
        }
        .frame(maxWidth: .infinity)
        .glassEffect(
            .regular.interactive(),
            in: .rect(cornerRadius: 24)
        )
        .glassEffectID("subscriptionsGlass", in: namespace)
    }
}

// MARK: - Compact Subscription Row

private struct CompactSubscriptionRow: View {
    let subscription: Subscription
    let namespace: Namespace.ID

    var body: some View {
        Button {
            // Action handled by parent's onTapGesture
        } label: {
            HStack(spacing: 12) {
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
                        .fill(Color.white.opacity(0.15))
                        .frame(width: 36.72, height: 36.72)
                        .overlay(
                            Text(serviceInitials)
                                .font(.labelMedium)
                                .foregroundColor(.white.opacity(0.7))
                        )
                }

                // Provider details - 3 separate lines
                VStack(alignment: .leading, spacing: 3) {
                    // Line 1: Provider name
                    Text(subscription.serviceName)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)

                    // Line 2: Show count
                    Text("Watching 0 shows")
                        .font(.system(size: 12, weight: .regular))
                        .foregroundColor(.white.opacity(0.7))
                        .lineLimit(1)

                    // Line 3: Status
                    Text(statusText)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(statusColor)
                        .lineLimit(1)
                }

                Spacer()

                // Cost and chevron
                HStack(spacing: 8) {
                    Text(subscription.formattedCost)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)

                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white.opacity(0.4))
                }
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.vertical, Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color.white.opacity(0.06))
            )
        }
        .buttonStyle(.plain)
    }

    private var serviceInitials: String {
        if let service = subscription.service {
            return ServiceBranding.initials(for: service)
        }
        return "?"
    }

    private var statusText: String {
        if subscription.isActive {
            return "Active"
        } else {
            // Could add "Paused" or "Cancelled" logic based on subscription state
            return "Inactive"
        }
    }

    private var statusColor: Color {
        if subscription.isActive {
            return .green
        } else {
            return .red
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Subscription List") {
    @Previewable @State var isShown = true
    @Previewable @Namespace var ns
    
    ZStack {
        Color.black.ignoresSafeArea()
        
        SubscriptionListView(
            subscriptions: Subscription.previews,
            onSelectSubscription: { _ in },
            namespace: ns,
            isShown: $isShown
        )
        .padding(.horizontal, Spacing.screenPadding)
    }
}
#endif

