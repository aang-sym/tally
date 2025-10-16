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
                .padding(.top, Spacing.sm)
            }
        }
        .background(Color.clear)
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
