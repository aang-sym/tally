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
            HStack(spacing: 10) {
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
                        .init(color: .black, location: 0.04),       // Fade in over ~15pt
                        .init(color: .black, location: 0.96),       // Fully visible center
                        .init(color: .clear, location: 1.0)         // Fade out at edge
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .frame(maxWidth: .infinity, alignment: .center) // Center the content
        }
        .frame(height: 24) // Height of text line
        .clipped() // Ensure content doesn't escape
    }
    
    private var tickerItemsRow: some View {
        HStack(spacing: 10) {
            ForEach(items) { item in
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
        // Return title, or title + subtitle if available
        if let subtitle = item.subtitle {
            return "\(item.title) • \(subtitle)"
        }
        return item.title
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
