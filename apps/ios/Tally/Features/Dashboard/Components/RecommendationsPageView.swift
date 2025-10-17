//
//  RecommendationsPageView.swift
//  Tally
//
//  Recommendations page showing user's next suggested action for each streaming provider
//

import SwiftUI

struct RecommendationsPageView: View {
    let subscriptions: [Subscription]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                // Header section
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Recommendations")
                        .font(.heading2)
                        .foregroundColor(.textPrimary)

                    Text("Your next suggested action for each provider")
                        .font(.bodyMedium)
                        .foregroundColor(.textSecondary)
                }
                .screenPadding()
                .padding(.top, Spacing.sm)

                // Recommendation cards (placeholder)
                if subscriptions.isEmpty {
                    emptyStateView
                } else {
                    VStack(spacing: Spacing.cardSpacing) {
                        ForEach(subscriptions) { subscription in
                            RecommendationCard(subscription: subscription)
                        }
                    }
                    .screenPadding()
                }
            }
        }
        .background(Color.clear)
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "sparkles")
                .font(.system(size: 48))
                .foregroundColor(.textTertiary)

            Text("No Recommendations Yet")
                .font(.heading3)
                .foregroundColor(.textPrimary)

            Text("Add subscriptions to get personalized recommendations")
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.xl)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xxxl)
    }
}

// MARK: - Recommendation Card

private struct RecommendationCard: View {
    let subscription: Subscription

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Provider header with logo
            HStack(spacing: Spacing.sm) {
                // Provider logo placeholder
                if let service = subscription.service,
                   let logoPath = service.logoPath,
                   let url = URL(string: logoPath) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } placeholder: {
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                    }
                    .frame(width: 32, height: 32)
                    .cornerRadius(8)
                } else {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 32, height: 32)
                        .cornerRadius(8)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(subscription.serviceName)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.textPrimary)

                    Text(subscription.formattedCost)
                        .font(.captionMedium)
                        .foregroundColor(.textSecondary)
                }

                Spacer()
            }

            Divider()
                .background(Color.textTertiary.opacity(0.3))

            // Recommendation content (placeholder)
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    Image(systemName: "sparkles")
                        .font(.system(size: 14))
                        .foregroundColor(.tallyPrimary)

                    Text("Recommendation")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.tallyPrimary)
                }

                Text("Recommendations will be generated based on your watching habits and watchlist")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
                    .italic()
            }
        }
        .padding(Spacing.md)
        .glassEffect(.regular, in: .rect(cornerRadius: 12))
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Recommendations with Subscriptions") {
    RecommendationsPageView(subscriptions: Subscription.previews)
        .background(Color.background)
}

#Preview("Recommendations Empty") {
    RecommendationsPageView(subscriptions: [])
        .background(Color.background)
}
#endif
