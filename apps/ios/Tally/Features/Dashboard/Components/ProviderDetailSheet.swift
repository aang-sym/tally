//
//  ProviderDetailSheet.swift
//  Tally
//
//  Provider detail view showing cost, activity, and quick actions
//

import SwiftUI

struct ProviderDetailSheet: View {
    let subscription: Subscription
    let namespace: Namespace.ID
    @Binding var isShown: Bool

    var body: some View {
        // Main floating glass capsule matching expanded ticker style
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(alignment: .center, spacing: Spacing.md) {
                if let service = subscription.service,
                   ServiceBranding.assetName(for: service, style: .card) != nil {
                    GlowingServiceLogoView(
                        service: service,
                        baseSize: 64,
                        dynamicScale: 1.0,
                        style: .card
                    )
                    .frame(width: 64, height: 64)
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text(subscription.serviceName)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(2)

                    StatusBadge(isActive: subscription.isActive)
                }

                Spacer()

                // Glassy close button
                Button {
                    withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                        isShown = false
                    }
                    let impactFeedback = UIImpactFeedbackGenerator(style: .soft)
                    impactFeedback.impactOccurred()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white.opacity(0.8))
                        .frame(width: 32, height: 32)
                        .background(
                            Capsule().fill(Color.white.opacity(0.1))
                        )
                }
                .buttonStyle(.plain)
                .glassEffect(.regular, in: .capsule)
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.top, Spacing.lg)
            .padding(.bottom, Spacing.md)

            // Details block
            VStack(alignment: .leading, spacing: Spacing.xs) {
                glassRow {
                    DetailRow(label: "Monthly Cost", value: subscription.formattedCost)
                }

                if subscription.isActive {
                    glassRow {
                        DetailRow(label: "Renewal", value: subscription.renewalText)
                    }
                }

                if let tier = subscription.tier {
                    glassRow {
                        DetailRow(label: "Plan", value: tier)
                    }
                }
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.vertical, Spacing.md)

            // Actions block
            VStack(spacing: Spacing.xs) {
                GlassActionRow(icon: "pause.circle.fill", title: "Pause Subscription", tint: .orange) {
                    // TODO: Implement pause
                }
                GlassActionRow(icon: "bell.fill", title: "Remind Me", tint: .blue) {
                    // TODO: Implement reminder
                }
                GlassActionRow(icon: "arrow.up.right.square.fill", title: "Open App", tint: .tallyPrimary) {
                    // TODO: Implement deep link
                }
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.bottom, Spacing.lg)
        }
        .frame(maxWidth: .infinity)
        .glassEffect(
            .regular.interactive(),
            in: .rect(cornerRadius: 24)
        )
        .glassEffectID("providerGlass", in: namespace)
    }
}

// MARK: - Supporting Views

private struct DetailRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 14, weight: .regular))
                .foregroundColor(.white.opacity(0.7))

            Spacer()

            Text(value)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.white)
        }
    }
}

// MARK: - Local Helpers

private func glassRow<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
    HStack { content() }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.white.opacity(0.06))
        )
}

private struct StatusBadge: View {
    let isActive: Bool

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: isActive ? "checkmark.circle.fill" : "xmark.circle.fill")
                .font(.system(size: 12, weight: .semibold))
            Text(isActive ? "Active" : "Inactive")
                .font(.caption)
                .fontWeight(.semibold)
        }
        .foregroundColor(isActive ? .green : .red)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(
            Capsule()
                .fill(Color.white.opacity(0.08))
        )
        .glassEffect(.regular, in: .capsule)
    }
}

private struct GlassActionRow: View {
    let icon: String
    let title: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button {
            action()
            let impactFeedback = UIImpactFeedbackGenerator(style: .light)
            impactFeedback.impactOccurred()
        } label: {
            HStack(spacing: Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(tint)
                    .frame(width: 24, alignment: .center)

                Text(title)
                    .font(.labelLarge)
                    .foregroundColor(.white)

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white.opacity(0.4))
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color.white.opacity(0.06))
            )
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(title)
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Provider Detail") {
    @Previewable @State var isShown = true
    @Previewable @Namespace var ns

    ZStack {
        Color.black.ignoresSafeArea()

        ProviderDetailSheet(
            subscription: .preview,
            namespace: ns,
            isShown: $isShown
        )
        .padding(.horizontal, Spacing.screenPadding)
    }
}
#endif

