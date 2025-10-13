//
//  SubscriptionCard.swift
//  Tally
//
//  Individual subscription card showing service logo, status, and renewal info
//

import SwiftUI

struct SubscriptionCard: View {
    let subscription: Subscription

    var body: some View {
        HStack(spacing: Spacing.md) {
            // Service logo
            ServiceLogo(service: subscription.service, size: Spacing.subscriptionLogoSize)

            // Subscription details
            VStack(alignment: .leading, spacing: 4) {
                // Service name
                Text(subscription.serviceName)
                    .font(.bodyLarge)
                    .foregroundColor(.textPrimary)

                // Show count and renewal info
                if let tier = subscription.tier {
                    HStack(spacing: 6) {
                        // Show count (e.g. "Watching 3 shows")
                        Text(tier)
                            .font(.captionMedium)
                            .foregroundColor(.textSecondary)

                        // Separator dot
                        if !subscription.renewalText.isEmpty {
                            Text("•")
                                .font(.captionMedium)
                                .foregroundColor(.textTertiary)

                            // Renewal info
                            Text(subscription.renewalText)
                                .font(.captionMedium)
                                .foregroundColor(.textSecondary)
                        }
                    }
                }

            }

            Spacer()

            // Price with chevron
            HStack(spacing: 8) {
                Text(subscription.formattedCost)
                    .font(.bodyMedium)
                    .foregroundColor(.textPrimary)

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.textTertiary)
            }
        }
        .padding(Spacing.cardPadding)
        .glassEffect(.clear, in: .rect(cornerRadius: Spacing.cardCornerRadius))
    }
}

// MARK: - Service Logo Component

private struct ServiceLogo: View {
    let service: StreamingService?
    let size: CGFloat

    var body: some View {
        Group {
            if let service, let logoURL = service.logoURL {
                AsyncImage(url: logoURL) { phase in
                    switch phase {
                    case .empty:
                        ProgressView()
                            .frame(width: size, height: size)
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: size, height: size)
                            .clipShape(Circle())
                    case .failure:
                        placeholderLogo
                    @unknown default:
                        placeholderLogo
                    }
                }
            } else {
                placeholderLogo
            }
        }
        .frame(width: size, height: size)
    }

    private var placeholderLogo: some View {
        RoundedRectangle(cornerRadius: 8)
            .fill(Color.backgroundTertiary)
            .frame(width: size, height: size)
            .overlay(
                Text(service?.name.prefix(2) ?? "?")
                    .font(.labelMedium)
                    .foregroundColor(.textSecondary)
            )
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Subscription Cards") {
    VStack(spacing: Spacing.cardSpacing) {
        ForEach(Subscription.previews) { subscription in
            SubscriptionCard(subscription: subscription)
        }
    }
    .padding()
    .background(Color.background)
}

#Preview("Single Active Card") {
    SubscriptionCard(subscription: .preview)
        .padding()
        .background(Color.background)
}

#Preview("Inactive Card") {
    SubscriptionCard(
        subscription: Subscription(
            id: "sub-inactive",
            userId: "user-1",
            serviceId: "hbo",
            monthlyCost: 9.99,
            isActive: false,
            tier: "Standard",
            startedDate: "2023-12-01",
            endedDate: "2024-06-01",
            createdAt: nil,
            updatedAt: nil,
            service: StreamingService(
                id: "hbo",
                tmdbProviderId: 384,
                name: "Max",
                logoPath: "/zxrVdFjIjLqkfnwyghnfywTn3Lh.jpg",
                homepage: "https://www.max.com",
                prices: [],
                defaultPrice: nil
            )
        )
    )
    .padding()
    .background(Color.background)
}
#endif
