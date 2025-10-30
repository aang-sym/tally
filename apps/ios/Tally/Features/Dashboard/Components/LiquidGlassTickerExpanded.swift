//
//  LiquidGlassTickerExpanded.swift
//  Tally
//
//  Expanded ticker view showing all news items in a liquid glass capsule
//  Auto-sizes to content height with importance-based sorting
//  Uses iOS 26 native Liquid Glass effects
//

import SwiftUI

struct LiquidGlassTickerExpanded: View {
    let items: [TickerItem]
    @Binding var isExpanded: Bool
    let namespace: Namespace.ID
    let onItemTap: (TickerItem) -> Void

    // Sort items by importance: trending → urgent → others
    private var sortedItems: [TickerItem] {
        items.sorted { item1, item2 in
            let priority1 = sortPriority(for: item1.kind)
            let priority2 = sortPriority(for: item2.kind)

            if priority1 != priority2 {
                return priority1 < priority2
            }

            // Within same priority, sort by urgency/count
            if item1.kind == .trendingNow, item2.kind == .trendingNow {
                return (item1.aggregateCount ?? 0) > (item2.aggregateCount ?? 0)
            }

            return item1.urgency > item2.urgency
        }
    }

    var body: some View {
        // Content with proper Liquid Glass effect
        VStack(alignment: .leading, spacing: 0) {
            // Header with close button
            HStack {
                Text("What's New")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)

                Spacer()

                // Close button
                Button {
                    withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                        isExpanded = false
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

            // Flat list of items (no grouping)
            ScrollView(showsIndicators: false) {
                VStack(spacing: Spacing.xs) {
                    ForEach(sortedItems) { item in
                        tickerItemRow(item)
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
        .glassEffectID("tickerGlass", in: namespace)
    }

    // MARK: - Ticker Item Row

    private func tickerItemRow(_ item: TickerItem) -> some View {
        Button {
            onItemTap(item)
            // Haptic feedback
            let impactFeedback = UIImpactFeedbackGenerator(style: .light)
            impactFeedback.impactOccurred()
        } label: {
            HStack(spacing: 12) {
                // Icon
                Image(systemName: item.icon)
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(iconColor(for: item.kind))
                    .frame(width: 28, height: 28)

                // Text content
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.title)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    if let subtitle = item.subtitle {
                        Text(subtitle)
                            .font(.system(size: 14, weight: .regular))
                            .foregroundColor(.white.opacity(0.7))
                            .lineLimit(1)
                    }
                }

                Spacer()

                // Chevron (only for items with deep links)
                if item.deepLink != nil {
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
        .accessibilityElement(children: .combine)
        .accessibilityLabel(item.title + (item.subtitle != nil ? ", \(item.subtitle!)" : ""))
        .accessibilityHint(item.deepLink != nil ? "Double tap to view details" : "")
    }

    // MARK: - Helper Methods

    private func sortPriority(for kind: TickerItem.Kind) -> Int {
        switch kind {
        case .trendingNow:
            return 1  // Highest priority
        case .renewalDue, .upcomingAirDate:
            return 2  // Urgent items
        case .newRelease, .priceChange, .recommendation:
            return 3  // Other items
        }
    }

    private func iconColor(for kind: TickerItem.Kind) -> Color {
        switch kind {
        case .upcomingAirDate:
            return .blue
        case .newRelease:
            return .yellow
        case .renewalDue:
            return .red
        case .priceChange:
            return .orange
        case .recommendation:
            return .purple
        case .trendingNow:
            return .red
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Ticker Expanded") {
    @Previewable @State var isExpanded = true
    @Previewable @Namespace var namespace

    ZStack {
        Color.black.ignoresSafeArea()

        LiquidGlassTickerExpanded(
            items: DashboardViewModel().tickerItems,
            isExpanded: $isExpanded,
            namespace: namespace,
            onItemTap: { item in
                print("Tapped: \(item.title)")
            }
        )
        .padding(.horizontal, Spacing.screenPadding)
        .padding(.top, 100)
    }
}
#endif
