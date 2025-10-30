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
                isExpanded = true
            }
            // Haptic feedback
            let impactFeedback = UIImpactFeedbackGenerator(style: .soft)
            impactFeedback.impactOccurred()
        } label: {
            if !items.isEmpty {
                HStack(spacing: 0) {
                    tickerContent
                }
                .padding(.vertical, Spacing.sm)
                .glassEffect(
                    .regular.interactive(),
                    in: .rect(cornerRadius: 20)
                )
                .glassEffectID("tickerGlass", in: namespace)
            }
        }
        .buttonStyle(.plain)
        .allowsHitTesting(!isExpanded) // Prevent taps when expanded
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
        .clipShape(HorizontalClipShape()) // Clip left/right only, not top/bottom
    }
    
    private var tickerItemsRow: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            ForEach(items) { item in
                // Icon
                Image(systemName: item.icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(iconColor(for: item.kind))
                    .frame(width: 16, height: 16)
                    .offset(y: 1)
                
                // Text
                Text(formattedItemText(item))
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .fixedSize()
            }
        }
        .offset(y: 1)
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
        case .pause:
            return .cyan
        }
    }
}

// MARK: - Horizontal Clip Shape

/// A shape that clips only the left and right edges, allowing content to extend vertically
private struct HorizontalClipShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()

        // Create a rectangle that extends far above and below
        // but clips precisely at the left and right edges
        let extendedRect = CGRect(
            x: rect.minX,
            y: rect.minY - 1000, // Extend 1000 points above
            width: rect.width,
            height: rect.height + 2000 // Total height includes extension above and below
        )

        path.addRect(extendedRect)
        return path
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

#Preview("Font Comparison") {
    @Previewable @State var isExpanded = false
    @Previewable @Namespace var namespace
    let items = DashboardViewModel().tickerItems

    ZStack {
        Color.black.ignoresSafeArea()

        VStack(spacing: 24) {
            // Terminal Mono - Uppercase
            fontVariant(
                label: "Terminal Mono • Uppercase",
                items: items,
                font: .system(size: 15, weight: .regular, design: .monospaced),
                textCase: .uppercase,
                isExpanded: $isExpanded,
                namespace: namespace
            )

            // Arcade Rounded - Uppercase
            fontVariant(
                label: "Arcade Rounded • Uppercase",
                items: items,
                font: .system(size: 15, weight: .bold, design: .rounded),
                textCase: .uppercase,
                isExpanded: $isExpanded,
                namespace: namespace
            )

            // Lightweight Mono - Uppercase
            fontVariant(
                label: "Lightweight Mono • Uppercase",
                items: items,
                font: .system(size: 15, weight: .light, design: .monospaced),
                textCase: .uppercase,
                isExpanded: $isExpanded,
                namespace: namespace
            )

            // Bold Condensed - Uppercase
            fontVariant(
                label: "Bold Condensed • Uppercase",
                items: items,
                font: .system(size: 14, weight: .heavy, design: .monospaced),
                textCase: .uppercase,
                tracking: -0.5,
                isExpanded: $isExpanded,
                namespace: namespace
            )

            // Current Default - for reference
            fontVariant(
                label: "Current Default • Mixed Case",
                items: items,
                font: .system(size: 15, weight: .medium),
                textCase: nil,
                isExpanded: $isExpanded,
                namespace: namespace
            )

            // SF Mono - Uppercase
            fontVariant(
                label: "SF Mono • Uppercase",
                items: items,
                font: .system(size: 15, weight: .regular, design: .monospaced),
                textCase: .uppercase,
                isExpanded: $isExpanded,
                namespace: namespace
            )

            // Consolas - Uppercase
            fontVariant(
                label: "Consolas • Uppercase",
                items: items,
                font: .custom("Consolas", size: 15),
                textCase: .uppercase,
                isExpanded: $isExpanded,
                namespace: namespace
            )

            // Menlo - Uppercase
            fontVariant(
                label: "Menlo • Uppercase",
                items: items,
                font: .custom("Menlo", size: 15),
                textCase: .uppercase,
                isExpanded: $isExpanded,
                namespace: namespace
            )

            // Andale Mono - Uppercase
            fontVariant(
                label: "Andale Mono • Uppercase",
                items: items,
                font: .custom("Andale Mono", size: 15),
                textCase: .uppercase,
                isExpanded: $isExpanded,
                namespace: namespace
            )

            // Monaco - Mixed Case
            fontVariant(
                label: "Monaco • Mixed Case",
                items: items,
                font: .custom("Monaco", size: 15),
                textCase: nil,
                isExpanded: $isExpanded,
                namespace: namespace
            )
        }
        .padding(.vertical, 40)
    }
}

#Preview("Font Comparison – Sentence Case") {
    @Previewable @State var isExpanded = false
    @Previewable @Namespace var namespace
    let items = DashboardViewModel().tickerItems

    ZStack {
        Color.black.ignoresSafeArea()

        VStack(spacing: 24) {
            // Terminal Mono - Sentence Case
            fontVariant(
                label: "Terminal Mono • Sentence Case",
                items: items,
                font: .system(size: 15, weight: .regular, design: .monospaced),
                textCase: nil,
                isExpanded: $isExpanded,
                namespace: namespace
            )

            // Arcade Rounded - Sentence Case
            fontVariant(
                label: "Arcade Rounded • Sentence Case",
                items: items,
                font: .system(size: 15, weight: .bold, design: .rounded),
                textCase: nil,
                isExpanded: $isExpanded,
                namespace: namespace
            )

            // Lightweight Mono - Sentence Case
            fontVariant(
                label: "Lightweight Mono • Sentence Case",
                items: items,
                font: .system(size: 15, weight: .light, design: .monospaced),
                textCase: nil,
                isExpanded: $isExpanded,
                namespace: namespace
            )

            // Bold Condensed - Sentence Case
            fontVariant(
                label: "Bold Condensed • Sentence Case",
                items: items,
                font: .system(size: 14, weight: .heavy, design: .monospaced),
                textCase: nil,
                tracking: -0.5,
                isExpanded: $isExpanded,
                namespace: namespace
            )

            // Current Default - Sentence Case
            fontVariant(
                label: "Current Default • Sentence Case",
                items: items,
                font: .system(size: 15, weight: .medium),
                textCase: nil,
                isExpanded: $isExpanded,
                namespace: namespace
            )

            // SF Mono - Sentence Case
            fontVariant(
                label: "SF Mono • Sentence Case",
                items: items,
                font: .system(size: 15, weight: .regular, design: .monospaced),
                textCase: nil,
                isExpanded: $isExpanded,
                namespace: namespace
            )

            // Consolas - Sentence Case
            fontVariant(
                label: "Consolas • Sentence Case",
                items: items,
                font: .custom("Consolas", size: 15),
                textCase: nil,
                isExpanded: $isExpanded,
                namespace: namespace
            )

            // Menlo - Sentence Case
            fontVariant(
                label: "Menlo • Sentence Case",
                items: items,
                font: .custom("Menlo", size: 15),
                textCase: nil,
                isExpanded: $isExpanded,
                namespace: namespace
            )

            // Andale Mono - Sentence Case
            fontVariant(
                label: "Andale Mono • Sentence Case",
                items: items,
                font: .custom("Andale Mono", size: 15),
                textCase: nil,
                isExpanded: $isExpanded,
                namespace: namespace
            )

            // Monaco - Sentence Case
            fontVariant(
                label: "Monaco • Sentence Case",
                items: items,
                font: .custom("Monaco", size: 15),
                textCase: nil,
                isExpanded: $isExpanded,
                namespace: namespace
            )
        }
        .padding(.vertical, 40)
    }
}

// Helper for font comparison preview
private func fontVariant(
    label: String,
    items: [TickerItem],
    font: Font,
    textCase: Text.Case?,
    tracking: CGFloat = 0,
    isExpanded: Binding<Bool>,
    namespace: Namespace.ID
) -> some View {
    VStack(spacing: 6) {
        // Label
        Text(label)
            .font(.system(size: 11, weight: .medium, design: .monospaced))
            .foregroundColor(.white.opacity(0.4))
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, Spacing.screenPadding)

        // Custom ticker with modified text styling
        CustomFontTicker(
            items: items,
            isExpanded: isExpanded,
            namespace: namespace,
            textFont: font,
            textCase: textCase,
            tracking: tracking
        )
        .padding(.horizontal, Spacing.screenPadding)
    }
}

// Custom ticker variant with configurable font
private struct CustomFontTicker: View {
    let items: [TickerItem]
    @Binding var isExpanded: Bool
    let namespace: Namespace.ID
    let textFont: Font
    let textCase: Text.Case?
    let tracking: CGFloat

    @State private var scrollOffset: CGFloat = 0
    @State private var contentWidth: CGFloat = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let scrollSpeed: CGFloat = 50

    var body: some View {
        Button {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                isExpanded = true
            }
            let impactFeedback = UIImpactFeedbackGenerator(style: .soft)
            impactFeedback.impactOccurred()
        } label: {
            if !items.isEmpty {
                HStack(spacing: 0) {
                    tickerContent
                }
                .padding(.vertical, Spacing.sm)
                .glassEffect(
                    .regular.interactive(),
                    in: .rect(cornerRadius: 20)
                )
                .glassEffectID("tickerGlass-\(UUID())", in: namespace)
            }
        }
        .buttonStyle(.plain)
        .allowsHitTesting(!isExpanded)
    }

    private var tickerContent: some View {
        GeometryReader { geometry in
            HStack(spacing: 10) {
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
                tickerItemsRow
            }
            .offset(x: scrollOffset)
            .mask(
                LinearGradient(
                    stops: [
                        .init(color: .clear, location: 0.0),
                        .init(color: .black, location: 0.04),
                        .init(color: .black, location: 0.96),
                        .init(color: .clear, location: 1.0)
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .frame(maxWidth: .infinity, alignment: .center)
        }
        .frame(height: 24)
        .clipShape(HorizontalClipShape()) // Clip left/right only, not top/bottom
    }

    private var tickerItemsRow: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            ForEach(items) { item in
                Image(systemName: item.icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(iconColor(for: item.kind))
                    .frame(width: 16, height: 16)
                    .offset(y: 1)

                Text(formattedItemText(item))
                    .font(textFont)
                    .textCase(textCase)
                    .tracking(tracking)
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .fixedSize()
            }
        }
        .offset(y: 1)
    }

    private func startScrolling() {
        guard contentWidth > 0 else { return }
        let duration = Double(contentWidth / scrollSpeed)
        withAnimation(.linear(duration: duration).repeatForever(autoreverses: false)) {
            scrollOffset = -contentWidth
        }
    }

    private func formattedItemText(_ item: TickerItem) -> String {
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
        case .pause:
            return .cyan
        }
    }
}
#endif

