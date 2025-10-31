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
    let onShowQuickActions: (TickerItem) -> Void

    // Sort items by new spec: urgency desc → date asc → kind priority
    private var sortedItems: [TickerItem] {
        items.sorted { item1, item2 in
            // First sort by urgency (descending)
            if item1.urgency != item2.urgency {
                return item1.urgency > item2.urgency
            }

            // Then by date (ascending - sooner dates first)
            if let date1 = item1.date, let date2 = item2.date {
                return date1 < date2
            } else if item1.date != nil {
                return true  // Items with dates come before items without
            } else if item2.date != nil {
                return false
            }

            // Finally by kind priority (renewal > upcomingAirDate > newRelease > pause > trendingNow)
            return item1.kind.priority > item2.kind.priority
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
            // Show quick actions menu via callback to parent
            onShowQuickActions(item)
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
                    textWithPills(item.title, for: item, fontSize: 14, fontWeight: .medium)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    if let subtitle = item.subtitle {
                        textWithPills(subtitle, for: item, fontSize: 14, fontWeight: .regular)
                            .lineLimit(1)
                    }
                }

                Spacer()
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.vertical, Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color.white.opacity(0.06))
            )
        }
        .buttonStyle(.plain)
        .contextMenu {
            // Show all links in context menu
            ForEach(Array(item.links.enumerated()), id: \.element.url) { _, link in
                Button {
                    print("📍 Link selected: \(link.title) → \(link.url)")
                    // TODO: Implement deep-link navigation
                    onItemTap(item)
                    let impactFeedback = UIImpactFeedbackGenerator(style: .light)
                    impactFeedback.impactOccurred()
                } label: {
                    Label(link.title, systemImage: iconForLinkKind(link.kind))
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(item.title + (item.subtitle != nil ? ", \(item.subtitle!)" : ""))
        .accessibilityHint("Tap to open, or long press for more options")
    }

    // MARK: - Link Chip

    /// Small tinted pill showing a deep link (e.g., "Show", "Service", "Billing")
    private struct LinkChip: View {
        let link: TickerLink
        let onTap: () -> Void

        var body: some View {
            Button(action: onTap) {
                HStack(spacing: 4) {
                    if let icon = link.icon {
                        Image(systemName: icon)
                            .font(.system(size: 10, weight: .semibold))
                    }
                    Text(link.title)
                        .font(.system(size: 12, weight: .semibold))
                }
                .foregroundColor(link.tint)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(
                    Capsule()
                        .fill(link.tint.opacity(0.15))
                )
                .overlay(
                    Capsule()
                        .strokeBorder(link.tint.opacity(0.3), lineWidth: 1)
                )
            }
            .buttonStyle(.plain)
            .frame(minWidth: 44, minHeight: 44) // Accessibility: minimum tap area
            .accessibilityLabel(link.title)
            .accessibilityHint("Double tap to open \(link.title)")
        }
    }

    // MARK: - Helper Methods

    /// Create text with inline colored pills for entity names
    @ViewBuilder
    private func textWithPills(_ text: String, for item: TickerItem, fontSize: CGFloat, fontWeight: Font.Weight) -> some View {
        // For now, use simple attributed string approach
        // TODO: Implement proper inline pill rendering if needed
        Text(highlightedText(text, for: item, fontSize: fontSize, fontWeight: fontWeight))
    }

    /// Create attributed string with entity names in subtle shimmer colors
    private func highlightedText(_ text: String, for item: TickerItem, fontSize: CGFloat, fontWeight: Font.Weight) -> AttributedString {
        var attributedString = AttributedString(text)

        // Apply base font to entire string
        attributedString.font = .system(size: fontSize, weight: fontWeight)

        // Add subtle shimmer color to entity names
        for link in item.links {
            if let range = attributedString.range(of: link.title) {
                attributedString[range].foregroundColor = shimmerColorForLinkKind(link.kind)
            }
        }

        return attributedString
    }

    /// Shimmer color for different link kinds - very subtle pastel tones
    private func shimmerColorForLinkKind(_ kind: TickerLinkKind) -> Color {
        switch kind {
        case .show, .episode, .season:
            return Color(red: 1.0, green: 0.85, blue: 0.70)  // Very subtle peachy shimmer for shows
        case .service:
            return Color(red: 0.85, green: 0.80, blue: 0.95)  // Very subtle lavender shimmer for services
        case .billing, .settings, .date:
            return .white.opacity(0.9)  // Near-white for others
        }
    }

    private func iconForLinkKind(_ kind: TickerLinkKind) -> String {
        switch kind {
        case .show:
            return "tv.fill"
        case .service:
            return "app.fill"
        case .episode:
            return "play.circle.fill"
        case .season:
            return "play.rectangle.fill"
        case .date:
            return "calendar"
        case .billing:
            return "creditcard.fill"
        case .settings:
            return "gearshape.fill"
        }
    }

    private func iconColor(for kind: TickerItemKind) -> Color {
        switch kind {
        case .trendingNow:
            return .orange
        case .pause:
            return .blue
        case .renewalDue:
            return .red  // TODO: Make dynamic based on days (≤3d red, ≤7d orange, else gray)
        case .upcomingAirDate:
            return .indigo
        case .newRelease:
            return .green
        case .priceChange:
            return .orange
        case .recommendation:
            return .purple
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
            },
            onShowQuickActions: { item in
                print("Show quick actions for: \(item.title)")
            }
        )
        .padding(.horizontal, Spacing.screenPadding)
        .padding(.top, 100)
    }
}
#endif
