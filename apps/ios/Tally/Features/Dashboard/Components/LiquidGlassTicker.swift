//
//  LiquidGlassTicker.swift
//  Tally
//
//  Continuous scrolling news ticker with liquid glass styling
//  Uses iOS 26 native Liquid Glass effects
//

import SwiftUI

struct LiquidGlassTicker: View {
    let items: [TickerItem]
    @Binding var isExpanded: Bool
    let namespace: Namespace.ID
    
    @State private var scrollOffset: CGFloat = 0
    @State private var contentWidth: CGFloat = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
    // Scroll speed: points per second
    private let scrollSpeed: CGFloat = 50
    
    var body: some View {
        Button {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                isExpanded.toggle()
            }
            // Haptic feedback
            let impactFeedback = UIImpactFeedbackGenerator(style: .soft)
            impactFeedback.impactOccurred()
        } label: {
            if !items.isEmpty {
                tickerContent
                    .padding(.vertical, Spacing.sm)
                    // Apply shadows BEFORE glass effect
                    .background(
                        HStack(spacing: 0) {
                            // Left shadow
                            LinearGradient(
                                colors: [
                                    Color.black.opacity(0.6),
                                    Color.clear
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                            .frame(width: 80)
                            
                            Spacer()
                            
                            // Right shadow
                            LinearGradient(
                                colors: [
                                    Color.clear,
                                    Color.black.opacity(0.6)
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                            .frame(width: 80)
                        }
                    )
                    .glassEffect(
                        .regular.interactive(),
                        in: .rect(cornerRadius: 20)
                    )
                    .glassEffectID("tickerGlass", in: namespace)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("News ticker")
        .accessibilityHint("Double tap to expand and view all items")
        .accessibilityValue("\(items.count) items")
    }
    
    // MARK: - Ticker Content
    
    private var tickerContent: some View {
        GeometryReader { geometry in
            HStack(spacing: 0) {
                // First set of items
                tickerItemsRow
                    .background(
                        GeometryReader { itemsGeo in
                            Color.clear
                                .onAppear {
                                    contentWidth = itemsGeo.size.width
                                    if !reduceMotion {
                                        startScrolling()
                                    }
                                }
                        }
                    )
                
                // Duplicate set for seamless loop
                tickerItemsRow
            }
            .offset(x: scrollOffset)
            // Apply tight edge fade mask - text fades only at the very edges
            .mask(
                LinearGradient(
                    stops: [
                        .init(color: .clear, location: 0.0),        // Start at edge
                        .init(color: .black, location: 0.08),       // Fade in over ~30pt
                        .init(color: .black, location: 0.92),       // Fully visible center
                        .init(color: .clear, location: 1.0)         // Fade out at edge
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
        }
        .frame(height: 24) // Height of text line
        .clipped() // Ensure content doesn't escape
    }
    
    private var tickerItemsRow: some View {
        HStack(spacing: 24) {
            ForEach(items) { item in
                HStack(spacing: 8) {
                    // Icon
                    Image(systemName: item.icon)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(iconColor(for: item.kind))
                        .frame(width: 16, height: 16)
                    
                    // Text
                    Text(formattedItemText(item))
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(.white)
                        .lineLimit(1)
                        .fixedSize()
                    
                    // Separator
                    Text("•")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white.opacity(0.4))
                }
            }
        }
    }
    
    // MARK: - Scrolling Animation
    
    private func startScrolling() {
        guard contentWidth > 0 else { return }
        
        // Calculate duration based on content width and speed
        let duration = Double(contentWidth / scrollSpeed)
        
        withAnimation(.linear(duration: duration).repeatForever(autoreverses: false)) {
            scrollOffset = -contentWidth
        }
    }
    
    // MARK: - Helper Methods
    
    private func formattedItemText(_ item: TickerItem) -> String {
        // Make text more succinct
        switch item.kind {
        case .upcomingAirDate:
            // "Show Name • Airs in 2 days" -> "Show Name in 2d"
            if let subtitle = item.subtitle {
                // Extract "X days/hours" and shorten it
                let shortened = subtitle
                    .replacingOccurrences(of: " days", with: "d")
                    .replacingOccurrences(of: " day", with: "d")
                    .replacingOccurrences(of: " hours", with: "h")
                    .replacingOccurrences(of: " hour", with: "h")
                    .replacingOccurrences(of: "Airs in ", with: "in ")
                    .replacingOccurrences(of: "Today", with: "today")
                    .replacingOccurrences(of: "Tomorrow", with: "tomorrow")
                return "\(item.title) \(shortened)"
            }
            return item.title
            
        case .renewalDue:
            // "Service Name • Renews in X days" -> "Service Name renews in Xd"
            if let subtitle = item.subtitle {
                let shortened = subtitle
                    .replacingOccurrences(of: " days", with: "d")
                    .replacingOccurrences(of: " day", with: "d")
                    .replacingOccurrences(of: "Renews in ", with: "renews in ")
                return "\(item.title) \(shortened)"
            }
            return item.title
            
        case .newRelease:
            // "Show Name • New episode available" -> "Show Name (new)"
            return "\(item.title) (new)"
            
        case .trendingNow:
            // "X shows trending" -> "X trending"
            return item.title.replacingOccurrences(of: " shows trending", with: " trending")
            
        case .priceChange:
            // "Service • Price increase" -> "Service price ↑"
            if item.subtitle?.contains("increase") == true {
                return "\(item.title) price ↑"
            } else {
                return "\(item.title) price ↓"
            }
            
        case .recommendation:
            // Keep as is, likely already short
            if let subtitle = item.subtitle {
                return "\(item.title) • \(subtitle)"
            }
            return item.title
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
#Preview("Continuous Ticker") {
    @Previewable @State var isExpanded = false
    @Previewable @Namespace var namespace

    ZStack {
        Color.black.ignoresSafeArea()

        LiquidGlassTicker(
            items: DashboardViewModel().tickerItems,
            isExpanded: $isExpanded,
            namespace: namespace
        )
        .padding(.horizontal, Spacing.screenPadding)
    }
}
#endif
