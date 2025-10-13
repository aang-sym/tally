//
//  DashboardPageView.swift
//  Tally
//
//  Page wrapper for subscriptions list in paginated dashboard
//

import SwiftUI

struct DashboardPageView: View {
    let subscriptions: [Subscription]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                // Subscription cards
                VStack(spacing: Spacing.cardSpacing) {
                    ForEach(subscriptions) { subscription in
                        SubscriptionCard(subscription: subscription)
                    }
                }
                .screenPadding()
                .padding(.top, Spacing.md)
            }
        }
        .background(
            // Subtle gradient for liquid glass visibility
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.heroBackground.opacity(0.3),
                    Color.background,
                    Color.backgroundSecondary.opacity(0.5)
                ]),
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Dashboard Page with Subscriptions") {
    DashboardPageView(subscriptions: Subscription.previews)
        .background(Color.background)
}

#Preview("Dashboard Page Empty") {
    DashboardPageView(subscriptions: [])
        .background(Color.background)
}
#endif
