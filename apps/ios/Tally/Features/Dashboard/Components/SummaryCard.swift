//
//  SummaryCard.swift
//  Tally
//
//  Reusable summary stat card component
//

import SwiftUI

struct SummaryCard: View {
    let title: String
    let value: String
    let subtitle: String?
    let icon: String?
    let accentColor: Color

    init(
        title: String,
        value: String,
        subtitle: String? = nil,
        icon: String? = nil,
        accentColor: Color = .tallyPrimary
    ) {
        self.title = title
        self.value = value
        self.subtitle = subtitle
        self.icon = icon
        self.accentColor = accentColor
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Header with icon and title
            HStack(spacing: Spacing.xs) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: Spacing.iconSizeSmall))
                        .foregroundColor(accentColor)
                }

                Text(title)
                    .font(.captionMedium)
                    .foregroundColor(.textSecondary)
                    .textCase(.uppercase)
                    .tracking(0.5)
            }

            Spacer()

            // Value
            Text(value)
                .font(.heading1)
                .foregroundColor(.textPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            // Subtitle (optional)
            if let subtitle {
                Text(subtitle)
                    .font(.captionMedium)
                    .foregroundColor(.textTertiary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .frame(height: 120)
        .cardPadding()
        .cardStyle()
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Summary Cards") {
    VStack(spacing: Spacing.cardSpacing) {
        HStack(spacing: Spacing.cardSpacing) {
            SummaryCard(
                title: "Subscriptions",
                value: "3",
                subtitle: "Active",
                icon: "play.circle.fill",
                accentColor: .tallyPrimary
            )

            SummaryCard(
                title: "Shows",
                value: "6",
                subtitle: "Watching",
                icon: "tv.fill",
                accentColor: .info
            )
        }

        SummaryCard(
            title: "Monthly Cost",
            value: "$34.97",
            subtitle: "Across all services",
            icon: "dollarsign.circle.fill",
            accentColor: .success
        )

        SummaryCard(
            title: "Saved This Month",
            value: "$15.00",
            subtitle: "Compared to keeping all",
            icon: "arrow.down.circle.fill",
            accentColor: .success
        )
    }
    .padding()
    .background(Color.background)
}

#Preview("Summary Card Long Text") {
    SummaryCard(
        title: "Very Long Title Text",
        value: "$1,234,567.89",
        subtitle: "This is a very long subtitle that should truncate",
        icon: "star.fill",
        accentColor: .warning
    )
    .padding()
    .background(Color.background)
}
#endif
