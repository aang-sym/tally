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
    let viewModel: DashboardViewModel
    let api: ApiClient
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
                // Icon or Poster - use async poster view for dynamic loading
                TickerItemPoster(item: item, viewModel: viewModel, api: api)

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

// MARK: - Ticker Item Poster Component

/// Async poster view that fetches show data if not in cache
private struct TickerItemPoster: View {
    let item: TickerItem
    let viewModel: DashboardViewModel
    let api: ApiClient

    @State private var show: Show?
    @State private var isLoading = false

    // Detect if this item represents a streaming service (only for non-show items)
    private var detectedService: StreamingService? {
        // If this is a show item, don't show service logo
        if let entityId = item.entityId, entityId.hasPrefix("show:") {
            return nil
        }

        // Check if entity ID indicates a subscription
        if let entityId = item.entityId, entityId.hasPrefix("subscription:") {
            let providerSlug = String(entityId.dropFirst(13)) // Remove "subscription:"
            return createService(from: providerSlug)
        }

        // Check if item has a service link (only if no show link exists)
        let hasShowLink = item.links.contains(where: { $0.kind == .show })
        if !hasShowLink, let serviceLink = item.links.first(where: { $0.kind == .service }) {
            return createService(from: serviceLink.title)
        }

        // Check title for provider name (e.g., "Prime Video $15.99")
        if !hasShowLink {
            if let service = createService(from: item.title) {
                return service
            }
        }

        // Check subtitle for provider name (only if no show link exists)
        if !hasShowLink, let subtitle = item.subtitle {
            return createService(from: subtitle)
        }

        return nil
    }

    var body: some View {
        Group {
            if let posterPath = show?.posterPath {
                // Priority 1: Show poster thumbnail for show-related items
                AsyncImage(url: URL(string: "https://image.tmdb.org/t/p/w200\(posterPath)")) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 40, height: 60)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    case .failure, .empty:
                        // Fallback to SF Symbol icon
                        fallbackIcon
                    @unknown default:
                        // Loading placeholder
                        loadingPlaceholder
                    }
                }
            } else if let service = detectedService {
                // Priority 2: Show provider logo for service/subscription items
                GlowingServiceLogoView(
                    service: service,
                    baseSize: 40,
                    dynamicScale: 1.0,
                    style: .card
                )
                .frame(width: 40, height: 60)
            } else if isLoading {
                // Loading placeholder while fetching from API
                loadingPlaceholder
            } else {
                // Fallback to SF Symbol icon when no poster or service
                fallbackIcon
            }
        }
        .task {
            await loadShow()
        }
    }

    private var fallbackIcon: some View {
        Image(systemName: item.icon)
            .font(.system(size: 18, weight: .medium))
            .foregroundColor(iconColorFor(item.kind))
            .frame(width: 40, height: 60)
    }

    private var loadingPlaceholder: some View {
        RoundedRectangle(cornerRadius: 6)
            .fill(Color.white.opacity(0.1))
            .frame(width: 40, height: 60)
    }

    private func loadShow() async {
        guard let entityId = item.entityId else { return }

        // First try synchronous cache lookup
        if let cached = viewModel.getShow(byEntityId: entityId) {
            show = cached
            return
        }

        // If not in cache, fetch from API
        isLoading = true
        // Extract title from ticker item for search hint
        let titleHint = extractTitleHint(from: item.title)
        show = await viewModel.getShowAsync(
            byEntityId: entityId,
            titleHint: titleHint,
            api: api
        )
        isLoading = false
    }

    private func extractTitleHint(from text: String) -> String {
        // Extract show name from ticker title (e.g., "Severance S2 returns tomorrow" → "Severance")
        // Simple heuristic: take first word or words before common separators
        let words = text.components(separatedBy: .whitespaces)
        // Take up to 3 words before hitting S1, S2, etc. or common stop words
        var result: [String] = []
        for word in words {
            if word.starts(with: "S") && word.count <= 3 {
                break  // Likely a season indicator
            }
            if ["returns", "renewed", "airs", "on", "coming", "trending"].contains(word.lowercased()) {
                break
            }
            result.append(word)
            if result.count >= 3 { break }
        }
        return result.joined(separator: " ")
    }

    private func iconColorFor(_ kind: TickerItemKind) -> Color {
        switch kind {
        case .trendingNow:
            return .orange
        case .pause:
            return .blue
        case .renewalDue:
            return .red
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

    /// Create a StreamingService instance from a provider name or slug
    private func createService(from name: String) -> StreamingService? {
        let normalized = name.lowercased()
            .replacingOccurrences(of: "-", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        // Map provider names to TMDB provider IDs and canonical names
        let serviceMap: [(name: String, tmdbId: Int, displayName: String)] = [
            ("netflix", 8, "Netflix"),
            ("disney plus", 337, "Disney+"),
            ("disney+", 337, "Disney+"),
            ("amazon prime video", 9, "Amazon Prime Video"),
            ("prime video", 9, "Amazon Prime Video"),
            ("hbo max", 384, "HBO Max"),
            ("max", 384, "Max"),
            ("apple tv+", 350, "Apple TV+"),
            ("apple tv", 350, "Apple TV+"),
            ("hulu", 15, "Hulu"),
            ("paramount+", 531, "Paramount+"),
            ("paramount plus", 531, "Paramount+"),
            ("peacock", 386, "Peacock"),
            ("showtime", 37, "Showtime"),
            ("starz", 43, "Starz"),
            ("espn+", 389, "ESPN+"),
            ("espn plus", 389, "ESPN+"),
            ("discovery+", 510, "Discovery+"),
            ("discovery plus", 510, "Discovery+"),
            ("crunchyroll", 283, "Crunchyroll"),
            ("funimation", 269, "Funimation"),
            ("stan", 558, "Stan"),
            ("binge", 559, "Binge"),
            ("foxtel", 560, "Foxtel"),
        ]

        // Find matching service
        if let match = serviceMap.first(where: { normalized.contains($0.name) }) {
            return StreamingService(
                id: UUID().uuidString,
                tmdbProviderId: match.tmdbId,
                name: match.displayName,
                logoPath: nil,
                homepage: nil,
                prices: [],
                defaultPrice: nil
            )
        }

        return nil
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Ticker Expanded") {
    @Previewable @State var isExpanded = true
    @Previewable @Namespace var namespace
    @Previewable @State var viewModel = DashboardViewModel()

    ZStack {
        Color.black.ignoresSafeArea()

        LiquidGlassTickerExpanded(
            items: viewModel.tickerItems,
            isExpanded: $isExpanded,
            namespace: namespace,
            viewModel: viewModel,
            api: ApiClient(),
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
