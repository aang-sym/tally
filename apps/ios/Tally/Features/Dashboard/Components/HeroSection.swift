//
//  HeroSection.swift
//  Tally
//
//  Hero section with dark textured background and scattered glowing provider logos
//

import SwiftUI
import Foundation

// MARK: - View Extensions

extension View {
    /// Conditionally applies a transformation to a view
    @ViewBuilder func `if`<Content: View>(_ condition: Bool, transform: (Self) -> Content) -> some View {
        if condition {
            transform(self)
        } else {
            self
        }
    }
}

// MARK: - Hero Section

struct HeroSection: View {
    let services: [StreamingService]
    var safeAreaTop: CGFloat = 0 // Safe area inset from parent (must be captured before ignoresSafeArea)
    var scanlineStyle: String? = nil // Optional scanline image asset name (nil = programmatic)
    var scanlineFillMode: Bool = false // Use fill mode for scanline (stretches instead of tiles)
    var onLogoTap: ((StreamingService) -> Void)? = nil
    var heroHeight: CGFloat = 400 // Match dashboard hero height

    var body: some View {
        GeometryReader { geometry in
            // Use safe area passed from parent (geometry.safeAreaInsets.top is 0 after ignoresSafeArea)
            let logoAreaHeight = geometry.size.height - safeAreaTop
            // Get actual screen width excluding horizontal safe area insets
            let screenWidth = geometry.size.width - geometry.safeAreaInsets.leading - geometry.safeAreaInsets.trailing

            ZStack {
                // Bouncing logos in hero area (constrained below notch)
                if !services.isEmpty {
                    ScatteredLogosView(
                        services: services,
                        collisionManager: LogoCollisionManager.shared,
                        containerWidth: screenWidth, // Use screen width excluding safe areas
                        heroHeight: logoAreaHeight, // Height excluding safe area
                        safeAreaOffset: safeAreaTop, // Offset to push logos below notch
                        onLogoTap: onLogoTap
                    )
                    .offset(y: safeAreaTop) // Offset entire container below notch
                }
                // CRT scanlines overlay on top of logos (still covers full height including notch)
                CRTOverlayView(height: geometry.size.height, scanlineImage: scanlineStyle, useFillMode: scanlineFillMode)
                    .allowsHitTesting(false)
            }
            .background(
                // Dark gradient background for hero extending into safe area (notch)
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.19, green: 0.06, blue: 0.30),
                        Color.black
                    ]),
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea(edges: .top)
            )
            .onAppear {
                // Clear saved collision states to force reinitialization with safe area constraint
                LogoCollisionManager.shared.logoStates.removeAll()
            }
        }
    }
}

// MARK: - Logo Collision Manager

@Observable
class LogoCollisionManager {
    // Singleton instance to persist logo positions across tab switches
    static let shared = LogoCollisionManager()

    var logoStates: [Int: LogoState] = [:]
    private var serviceMap: [Int: StreamingService] = [:]

    struct LogoState {
        var position: CGPoint
        var velocity: CGPoint
        var radiusX: CGFloat
        var radiusY: CGFloat
    }

    // Private initializer to enforce singleton pattern
    private init() {}

    func updateLogo(index: Int, service: StreamingService, position: CGPoint, velocity: CGPoint, radiusX: CGFloat, radiusY: CGFloat) {
        logoStates[index] = LogoState(position: position, velocity: velocity, radiusX: radiusX, radiusY: radiusY)
        serviceMap[index] = service
    }

    func getService(for index: Int) -> StreamingService? {
        return serviceMap[index]
    }
}

// MARK: - Scattered Logos View

struct ScatteredLogosView: View {
    let services: [StreamingService]
    @Bindable var collisionManager: LogoCollisionManager
    let containerWidth: CGFloat
    let heroHeight: CGFloat
    let safeAreaOffset: CGFloat
    var onLogoTap: ((StreamingService) -> Void)? = nil

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Calculate dynamic scale based on number of displayed services
                let dynamicScale = calculateDynamicScale(logoCount: services.count)

                // Use service.id as identity to prevent logo cycling
                // Each service maintains its own position across renders
                ForEach(Array(services.enumerated()), id: \.element.id) { index, service in
                    BouncingLogoView(
                        service: service,
                        index: index,
                        containerSize: CGSize(width: containerWidth, height: heroHeight),
                        safeAreaOffset: safeAreaOffset,
                        collisionManager: collisionManager,
                        dynamicScale: dynamicScale,
                        onLogoTap: onLogoTap
                    )
                }
            }
        }
    }

    /// Calculate scale factor based on number of logos to prevent clutter
    /// - 1-6 logos: 100% size
    /// - 7+ logos: reduce by 10% per additional logo
    /// - Minimum: 60% size (capped at 10+ logos)
    private func calculateDynamicScale(logoCount: Int) -> CGFloat {
        guard logoCount > 6 else { return 1.0 }

        let reduction = CGFloat(logoCount - 6) * 0.1
        let scale = 1.0 - reduction

        // Minimum scale of 0.6 (60% size)
        return max(scale, 0.6)
    }
}

// MARK: - Display Link Animator

/// Helper class to act as CADisplayLink target (requires class for @objc)
private class DisplayLinkAnimator {
    var onUpdate: (() -> Void)?
    private var displayLink: CADisplayLink?

    func start() {
        let link = CADisplayLink(target: self, selector: #selector(update))
        link.add(to: .current, forMode: .common)
        displayLink = link
    }

    func stop() {
        displayLink?.invalidate()
        displayLink = nil
    }

    @objc private func update() {
        onUpdate?()
    }
}

// MARK: - Bouncing Logo View

private struct BouncingLogoView: View {
    let service: StreamingService
    let index: Int
    let containerSize: CGSize
    let safeAreaOffset: CGFloat
    @Bindable var collisionManager: LogoCollisionManager
    let dynamicScale: CGFloat
    var onLogoTap: ((StreamingService) -> Void)?

    @State private var position: CGPoint = .zero
    @State private var velocity: CGPoint = .zero
    @State private var animator: DisplayLinkAnimator?

    // Debug flag to toggle collision boundary visualization
    private static let showDebugBounds = false

    var body: some View {
        ZStack {
            // Debug collision boundary (uses actual physics bounds)
            if Self.showDebugBounds {
                let bounds = getCollisionBounds()
                let shape = CollisionBoundsHelper.getCollisionShape(for: service)

                Group {
                    switch shape {
                    case .circle:
                        Circle()
                            .stroke(Color.red, lineWidth: 1)
                            .frame(width: bounds.radiusX * 2, height: bounds.radiusY * 2)
                    case .ellipse:
                        Ellipse()
                            .stroke(Color.red, lineWidth: 1)
                            .frame(width: bounds.radiusX * 2, height: bounds.radiusY * 2)
                    case .rectangle:
                        RoundedRectangle(cornerRadius: 4)
                            .stroke(Color.red, lineWidth: 1)
                            .frame(width: bounds.radiusX * 2, height: bounds.radiusY * 2)
                    }
                }
                .opacity(0.5)

                // Index number for identification
                Text("\(index)")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
                    .padding(4)
                    .background(Color.black.opacity(0.7))
                    .cornerRadius(4)
                    .offset(x: -bounds.radiusX + 20, y: -bounds.radiusY + 15)
            }

            GlowingServiceLogoView(
                service: service,
                baseSize: Spacing.heroLogoSize,
                dynamicScale: dynamicScale,
                style: .hero
            )
        }
        .position(position)
        .onTapGesture {
            onLogoTap?(service)
        }
        .onAppear {
            initializePosition()
            startBouncing()
        }
        .onDisappear {
            // Clean up display link to prevent memory leak
            animator?.stop()
            animator = nil
        }
    }

    /// Calculate collision bounds - delegates to shared helper
    /// This is the single source of truth for collision detection
    private func getCollisionBounds() -> (radiusX: CGFloat, radiusY: CGFloat) {
        return CollisionBoundsHelper.getCollisionBounds(for: service, dynamicScale: dynamicScale)
    }

    /// Initialize starting position based on index
    /// If a position already exists in the collision manager, restore it
    private func initializePosition() {
        // Check if we already have a saved state for this logo
        if let savedState = collisionManager.logoStates[index],
           let savedService = collisionManager.getService(for: index),
           savedService.id == service.id {
            // Restore previous position and velocity
            position = savedState.position
            velocity = savedState.velocity
            return
        }

        // No saved state - initialize new position
        let positions: [(x: Double, y: Double)] = [
            // First 6 positions (redistributed for full-screen)
            (0.15, 0.15),  // Top-left
            (0.7, 0.2),    // Top-right
            (0.45, 0.35),  // Upper-middle
            (0.3, 0.5),    // Middle-left
            (0.75, 0.65),  // Lower-right
            (0.5, 0.8),    // Lower-middle

            // Additional positions for 7+ logos (redistributed)
            (0.2, 0.25),   // Upper-left-center
            (0.85, 0.4),   // Right-upper-middle
            (0.6, 0.18),   // Top-center-right
            (0.4, 0.75),   // Lower-center
            (0.8, 0.85),   // Bottom-right-edge
            (0.25, 0.45),  // Middle-left
            (0.65, 0.6),   // Middle-right
            (0.35, 0.3),   // Upper-left-middle
            (0.55, 0.55),  // Center-right
            (0.15, 0.7),   // Lower-left
        ]

        // Use modulo to cycle through positions if there are more logos than positions
        let pos = positions[index % positions.count]
        position = CGPoint(
            x: containerSize.width * pos.x,
            y: containerSize.height * pos.y // No offset needed - container is already offset
        )

        // Initialize velocity with random direction for chaotic movement
        let baseSpeed: CGFloat = 0.525 // 5% faster than original 0.5
        let angle = Double.random(in: 0..<(2 * .pi)) // Random direction
        velocity = CGPoint(
            x: CGFloat(Darwin.cos(angle)) * baseSpeed,
            y: CGFloat(Darwin.sin(angle)) * baseSpeed
        )
    }

    /// Start the bouncing animation with CADisplayLink
    private func startBouncing() {
        // Use CADisplayLink for display-synced animation that continues during scroll
        let linkAnimator = DisplayLinkAnimator()
        linkAnimator.onUpdate = { [self] in
            updatePosition()
        }
        linkAnimator.start()
        animator = linkAnimator
    }

    /// Get scale factor for this logo (delegates to shared helper)
    private func getLogoScale() -> CGFloat {
        return CollisionBoundsHelper.getLogoScale(for: service)
    }

    /// Update position and handle edge collisions with predictive collision detection
    private func updatePosition() {
        // Get collision bounds (single source of truth)
        let bounds = getCollisionBounds()
        let radiusX = bounds.radiusX
        let radiusY = bounds.radiusY

        // Calculate proposed position (where we want to move)
        var proposedPosition = position
        proposedPosition.x += velocity.x
        proposedPosition.y += velocity.y

        var newVelocity = velocity
        var actualPosition = proposedPosition

        // PREDICTIVE COLLISION DETECTION: Check if proposed position would cause overlap
        for (otherIndex, otherState) in collisionManager.logoStates {
            // Skip self
            guard otherIndex != index else { continue }

            // First check CURRENT distance to see if we're already colliding or close
            let currentDx = position.x - otherState.position.x
            let currentDy = position.y - otherState.position.y

            // Elliptical collision detection using combined radii from both logos
            let combinedRadiusX = radiusX + otherState.radiusX
            let combinedRadiusY = radiusY + otherState.radiusY

            // Check current distance
            let currentNormalizedX = currentDx / combinedRadiusX
            let currentNormalizedY = currentDy / combinedRadiusY
            let currentDistance = sqrt(currentNormalizedX * currentNormalizedX + currentNormalizedY * currentNormalizedY)

            // Now check PROPOSED distance
            let proposedDx = proposedPosition.x - otherState.position.x
            let proposedDy = proposedPosition.y - otherState.position.y
            let proposedNormalizedX = proposedDx / combinedRadiusX
            let proposedNormalizedY = proposedDy / combinedRadiusY
            let proposedDistance = sqrt(proposedNormalizedX * proposedNormalizedX + proposedNormalizedY * proposedNormalizedY)

            // Check if proposed position would cause overlap OR if we're currently too close
            if proposedDistance < 1.0 || (currentDistance < 1.05 && proposedDistance <= currentDistance) {
                // Calculate collision normal using CURRENT positions (normalized vector from other logo to this logo)
                let actualDistance = sqrt(currentDx * currentDx + currentDy * currentDy)

                // Avoid division by zero
                guard actualDistance > 0 else { continue }

                let nx = currentDx / actualDistance
                let ny = currentDy / actualDistance

                // Calculate dot product of velocity with collision normal
                let dotProduct = velocity.x * nx + velocity.y * ny

                // Only handle collision if moving toward each other
                if dotProduct < 0 {
                    // Reflect velocity across collision normal
                    newVelocity.x = velocity.x - 2 * dotProduct * nx
                    newVelocity.y = velocity.y - 2 * dotProduct * ny

                    // Calculate the exact point where boundaries would touch (not overlap)
                    // Find fraction of movement that brings us exactly to boundary (distance = 1.0)
                    var t: CGFloat = 0.0 // Fraction of movement to allow (0.0 = stay, 1.0 = full movement)
                    if currentDistance >= 1.0 {
                        // Already outside boundary, limit movement to not penetrate
                        // Calculate how far we can move before hitting the boundary
                        if proposedDistance < 1.0 {
                            // Would penetrate - find exact boundary point
                            t = max(0.0, (1.0 - currentDistance) / (proposedDistance - currentDistance))
                        } else {
                            // Safe to move fully
                            t = 1.0
                        }
                    } else {
                        // Already too close or overlapping - don't move closer
                        if proposedDistance >= currentDistance {
                            // Moving away - allow it
                            t = 1.0
                        } else {
                            // Moving closer - stop at current position
                            t = 0.0
                        }
                    }

                    // Apply only the safe fraction of movement
                    actualPosition.x = position.x + velocity.x * t
                    actualPosition.y = position.y + velocity.y * t
                }
            }
        }

        // Check horizontal boundaries (use radiusX for horizontal extent)
        if actualPosition.x - radiusX <= 0 || actualPosition.x + radiusX >= containerSize.width {
            newVelocity.x *= -1
            // Clamp position to boundary
            actualPosition.x = max(radiusX, min(containerSize.width - radiusX, actualPosition.x))
        }

        // Check vertical boundaries (use radiusY for vertical extent)
        // Container is already offset, so use simple 0-based coordinates
        if actualPosition.y - radiusY <= 0 || actualPosition.y + radiusY >= containerSize.height {
            newVelocity.y *= -1
            // Clamp position to boundary
            actualPosition.y = max(radiusY, min(containerSize.height - radiusY, actualPosition.y))
        }

        position = actualPosition
        velocity = newVelocity

        // Update collision manager with new state including logo bounds and service reference
        collisionManager.updateLogo(index: index, service: service, position: actualPosition, velocity: newVelocity, radiusX: radiusX, radiusY: radiusY)
    }
}

// MARK: - Glowing Service Logo View

struct GlowingServiceLogoView: View {
    enum Style {
        case hero
        case card
    }

    let service: StreamingService
    let baseSize: CGFloat
    var dynamicScale: CGFloat = 1.0
    var style: Style = .hero
    var saturationBoost: Double = 1.12

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let scaledSize = baseSize * ServiceBranding.logoScale(for: service) * dynamicScale

        Group {
            if let assetName = ServiceBranding.assetName(for: service, style: style) {
                let baseGlowColor = ServiceBranding.glowColor(for: service)
                // In light mode, use a much lighter/desaturated version of the glow
                // Exception: Prime and HBO Max keep their dark mode colors
                let glowColor = colorScheme == .light ? lightenColor(baseGlowColor, for: service) : baseGlowColor
                let shouldInvert = ServiceBranding.shouldInvertLogo(for: service, in: colorScheme)
                let config = GlowConfig.configuration(for: style, size: scaledSize, colorScheme: colorScheme)

                ZStack {
                    ForEach(Array(config.layers.enumerated()), id: \.offset) { _, layer in
                        logoImage(assetName: assetName, glowColor: glowColor, shouldInvert: shouldInvert)
                            .blur(radius: layer.blurRadius)
                            .opacity(layer.opacity)
                            .brightness(layer.brightness)
                    }

                    logoImage(assetName: assetName, glowColor: glowColor, shouldInvert: shouldInvert)
                        .brightness(config.baseBrightness)
                }
                .saturation(saturationBoost)
                .frame(width: scaledSize, height: scaledSize)
                .background(
                    logoImage(assetName: assetName, glowColor: glowColor, shouldInvert: shouldInvert)
                        .blur(radius: config.backgroundBlur)
                        .colorMultiply(glowColor)
                        .opacity(config.backgroundOpacity)
                        .scaleEffect(1.05)
                )
                .shadow(color: glowColor.opacity(config.shadowOpacities[0]), radius: config.shadowRadii[0], x: 0, y: 0)
                .shadow(color: glowColor.opacity(config.shadowOpacities[1]), radius: config.shadowRadii[1], x: 0, y: 0)
                .shadow(color: glowColor.opacity(config.shadowOpacities[2]), radius: config.shadowRadii[2], x: 0, y: 0)
            } else {
                placeholder(size: scaledSize)
            }
        }
        .frame(width: scaledSize, height: scaledSize)
    }

    /// Lighten and desaturate a color for light mode glow
    private func lightenColor(_ color: Color, for service: StreamingService) -> Color {
        let serviceName = service.name.lowercased()

        // Prime keeps its vibrant dark mode color in light mode
        if serviceName.contains("prime") || serviceName.contains("amazon") {
            return color
        }

        // Create a pastel version that's more visible on light backgrounds
        // Use 60% opacity to maintain some color vibrancy while being subtle
        return color.opacity(0.6)
    }

    @ViewBuilder
    private func placeholder(size: CGFloat) -> some View {
        switch style {
        case .hero:
            Circle()
                .fill(Color.backgroundTertiary)
                .frame(width: size, height: size)
                .overlay(
                    Text(ServiceBranding.initials(for: service))
                        .font(.labelLarge)
                        .foregroundColor(.textSecondary)
                )
        case .card:
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.backgroundTertiary)
                .frame(width: size, height: size)
                .overlay(
                    Text(ServiceBranding.initials(for: service))
                        .font(.labelMedium)
                        .foregroundColor(.textSecondary)
                )
        }
    }

    @ViewBuilder
    private func logoImage(assetName: String, glowColor: Color, shouldInvert: Bool) -> some View {
        if shouldInvert {
            Image(assetName)
                .renderingMode(.template)
                .resizable()
                .aspectRatio(contentMode: .fit)
                .foregroundColor(glowColor)
        } else {
            Image(assetName)
                .resizable()
                .aspectRatio(contentMode: .fit)
        }
    }

    // MARK: - Glow Configuration

    private struct GlowLayer {
        let blurRadius: CGFloat
        let opacity: Double
        let brightness: Double
    }

    private struct GlowConfig {
        let layers: [GlowLayer]
        let baseBrightness: Double
        let backgroundBlur: CGFloat
        let backgroundOpacity: Double
        let shadowRadii: [CGFloat]
        let shadowOpacities: [Double]

        static func configuration(for style: GlowingServiceLogoView.Style, size: CGFloat, colorScheme: ColorScheme) -> GlowConfig {
            let heroReferenceSize = Spacing.heroLogoSize
            let scaleFactor = max(size / heroReferenceSize, 0.4)

            // Light mode uses same glow intensity but with lighter colors
            let isLightMode = colorScheme == .light

            switch style {
            case .hero:
                return GlowConfig(
                    layers: [
                        GlowLayer(blurRadius: 3 * scaleFactor, opacity: 0.15, brightness: 0.15),
                        GlowLayer(blurRadius: 1.5 * scaleFactor, opacity: 0.2, brightness: 0.1),
                        GlowLayer(blurRadius: 0.5 * scaleFactor, opacity: 0.3, brightness: 0.05)
                    ],
                    baseBrightness: isLightMode ? 0 : 0.1,
                    backgroundBlur: 15 * scaleFactor,
                    backgroundOpacity: 0.8,
                    shadowRadii: [10, 18, 25].map { $0 * scaleFactor },
                    shadowOpacities: [0.6, 0.4, 0.2]
                )

            case .card:
                return GlowConfig(
                    layers: [
                        GlowLayer(blurRadius: 2.2 * scaleFactor, opacity: 0.12, brightness: 0.12),
                        GlowLayer(blurRadius: 1.1 * scaleFactor, opacity: 0.18, brightness: 0.08),
                        GlowLayer(blurRadius: 0.35 * scaleFactor, opacity: 0.22, brightness: 0.04)
                    ],
                    baseBrightness: isLightMode ? 0 : 0.08,
                    backgroundBlur: 12 * scaleFactor,
                    backgroundOpacity: 0.55,
                    shadowRadii: [7, 12, 16].map { $0 * scaleFactor },
                    shadowOpacities: [0.45, 0.25, 0.12]
                )
            }
        }
    }
}

// MARK: - Service Branding Helpers

enum ServiceBranding {
    static func assetName(for service: StreamingService, style: GlowingServiceLogoView.Style = .card) -> String? {
        let serviceName = service.name.lowercased()

        if serviceName.contains("netflix") {
            return "Netflix"
        } else if serviceName.contains("disney") {
            // Use full Disney+ logo for both hero and cards
            return "DisneyPlus"
        } else if serviceName.contains("prime") || serviceName.contains("amazon") {
            return "PrimeVideo"
        } else if serviceName.contains("hbo") || serviceName.contains("max") {
            return "HBOMax"
        } else if serviceName.contains("crunchyroll") {
            return "Crunchyroll"
        } else if serviceName.contains("stan") {
            return "Stan"
        } else if serviceName.contains("apple") {
            return "AppleTVPlus"
        } else if serviceName.contains("binge") {
            return "Binge"
        } else if serviceName.contains("paramount") {
            return "Paramount"
        }

        return nil
    }

    static func glowColor(for service: StreamingService) -> Color {
        let serviceName = service.name.lowercased()

        if serviceName.contains("netflix") {
            return Color(red: 0.9, green: 0.1, blue: 0.15)
        } else if serviceName.contains("disney") {
            return Color(red: 0.1, green: 0.7, blue: 0.85) // Brighter teal/cyan
        } else if serviceName.contains("prime") || serviceName.contains("amazon") {
            return Color(red: 0.016, green: 0.471, blue: 1.0) // #0478FF
        } else if serviceName.contains("hbo") || serviceName.contains("max") {
            return Color(red: 0.65, green: 0.2, blue: 0.9)
        } else if serviceName.contains("crunchyroll") {
            return Color(red: 1.0, green: 0.55, blue: 0.15)
        } else if serviceName.contains("stan") {
            return Color(red: 0.2, green: 0.5, blue: 0.95)
        } else if serviceName.contains("apple") {
            return Color(red: 0.9, green: 0.9, blue: 0.95)
        } else if serviceName.contains("binge") {
            return Color(red: 0.5, green: 0.25, blue: 0.85)
        } else if serviceName.contains("paramount") {
            return Color(red: 0.020, green: 0.404, blue: 0.996) // #0567FE
        }

        return Color.blue.opacity(0.7)
    }

    static func logoScale(for service: StreamingService) -> CGFloat {
        let serviceName = service.name.lowercased()

        if serviceName.contains("netflix") {
            return 0.95 // 1.0 * 0.95 = 5% decrease
        } else if serviceName.contains("disney") {
            return 1.4
        } else if serviceName.contains("stan") {
            return 1.4
        } else if serviceName.contains("prime") || serviceName.contains("amazon") {
            return 0.95 // Reduced to match other compact logos
        } else if serviceName.contains("apple") {
            return 1.25
        } else if serviceName.contains("paramount") {
            return 1.3125 // 1.25 * 1.05 = 5% increase
        } else if serviceName.contains("crunchyroll") {
            return 0.9
        }

        return 1.0
    }

    static func shouldInvertLogo(for service: StreamingService, in colorScheme: ColorScheme) -> Bool {
        let serviceName = service.name.lowercased()

        // Prime and HBO Max should always be inverted (both light and dark mode)
        if serviceName.contains("prime") || serviceName.contains("amazon") ||
           serviceName.contains("hbo") || serviceName.contains("max") {
            return true
        }

        // Other logos only invert in dark mode
        guard colorScheme == .dark else { return false }

        return serviceName.contains("disney") ||
               serviceName.contains("apple")
    }

    static func initials(for service: StreamingService) -> String {
        let words = service.name.split(separator: " ")
        if words.count >= 2 {
            let first = words[0].prefix(1)
            let second = words[1].prefix(1)
            return String(first + second)
        }

        return String(service.name.prefix(2)).uppercased()
    }
}

// MARK: - CRT Overlay

struct CRTOverlayView: View {
    let height: CGFloat
    var scanlineImage: String? = nil // Optional PNG overlay (nil = programmatic)
    var useFillMode: Bool = false // Use fill mode to stretch image (vignette aligns with screen)

    // Fade scanlines from top (strong) to bottom (subtle)
    private var verticalFadeMask: LinearGradient {
        LinearGradient(
            gradient: Gradient(stops: [
                .init(color: .white, location: 0.0),                // full at top
                .init(color: Color.white.opacity(0.85), location: 0.55),
                .init(color: Color.white.opacity(0.15), location: 1.0) // mostly gone at bottom
            ]),
            startPoint: .top,
            endPoint: .bottom
        )
    }

    var body: some View {
        ZStack {
            if let imageName = scanlineImage {
                // PNG-based scanlines with tiling or fill
                let opacity: Double = {
                    switch imageName {
                    case "horizontal-rgb-fill":
                        return 0.35
                    case "crt-sony":
                        return 0.35
                    case "base_grid", "horizontal-cool", "horizontal-crt":
                        return 0.24
                    default:
                        return 0.20
                    }
                }()

                if useFillMode {
                    // Fill mode - stretches to fit screen (vignette aligns with edges)
                    Image(imageName)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(height: height)
                        .clipped()
                        .opacity(opacity)
                        .blendMode(.screen)
                        .mask(verticalFadeMask)
                        .allowsHitTesting(false)
                } else {
                    // Tile mode - repeats pattern
                    Image(imageName)
                        .resizable(resizingMode: .tile)
                        .frame(height: height)
                        .opacity(opacity)
                        .blendMode(.screen)
                        .mask(verticalFadeMask)
                        .allowsHitTesting(false)
                }
            } else {
                // Original programmatic scanlines
                VStack(spacing: 1) {
                    ForEach(0..<Int(height / 3), id: \.self) { _ in
                        Rectangle()
                            .fill(Color.white.opacity(0.02))
                            .frame(height: 2)
                        Spacer()
                            .frame(height: 1)
                    }
                }
                .mask(verticalFadeMask)
                .allowsHitTesting(false)
            }

            // Subtle vignette for CRT edge darkening
            RadialGradient(
                gradient: Gradient(colors: [
                    Color.black.opacity(0),
                    Color.black.opacity(0.02)
                ]),
                center: .center,
                startRadius: 100,
                endRadius: 400
            )
            .allowsHitTesting(false)
        }
        .frame(height: height)
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Hero with services") {
    HeroSection(
        services: [
            StreamingService(
                id: "netflix",
                tmdbProviderId: 8,
                name: "Netflix",
                logoPath: "/9A1JSVmSxsyaBK4SUFsYVqbAYfW.jpg",
                homepage: "https://www.netflix.com",
                prices: [],
                defaultPrice: nil
            ),
            StreamingService(
                id: "disney",
                tmdbProviderId: 337,
                name: "Disney Plus",
                logoPath: "/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg",
                homepage: "https://www.disneyplus.com",
                prices: [],
                defaultPrice: nil
            ),
            StreamingService(
                id: "hbo",
                tmdbProviderId: 384,
                name: "Max",
                logoPath: "/zxrVdFjIjLqkfnwyghnfywTn3Lh.jpg",
                homepage: "https://www.max.com",
                prices: [],
                defaultPrice: nil
            )
        ]
    )
    .frame(height: 300)
    .background(Color.background)
}

#Preview("Hero empty") {
    HeroSection(services: [])
        .frame(height: 300)
        .background(Color.background)
}

#Preview("Hero compact - debug") {
    HeroSection(
        services: [
            StreamingService(
                id: "netflix",
                tmdbProviderId: 8,
                name: "Netflix",
                logoPath: "/9A1JSVmSxsyaBK4SUFsYVqbAYfW.jpg",
                homepage: "https://www.netflix.com",
                prices: [],
                defaultPrice: nil
            ),
            StreamingService(
                id: "disney",
                tmdbProviderId: 337,
                name: "Disney Plus",
                logoPath: "/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg",
                homepage: "https://www.disneyplus.com",
                prices: [],
                defaultPrice: nil
            ),
            StreamingService(
                id: "hbo",
                tmdbProviderId: 384,
                name: "Max",
                logoPath: "/zxrVdFjIjLqkfnwyghnfywTn3Lh.jpg",
                homepage: "https://www.max.com",
                prices: [],
                defaultPrice: nil
            ),
            StreamingService(
                id: "crunchyroll",
                tmdbProviderId: 283,
                name: "Crunchyroll",
                logoPath: "/8I1XqWhR6QEJ4ASkK2ri6O0aN3m.jpg",
                homepage: "https://www.crunchyroll.com",
                prices: [],
                defaultPrice: nil
            ),
            StreamingService(
                id: "prime",
                tmdbProviderId: 9,
                name: "Prime Video",
                logoPath: "/emthp39XA2YScoYL1p0sdbAH2WA.jpg",
                homepage: "https://www.primevideo.com",
                prices: [],
                defaultPrice: nil
            ),
            StreamingService(
                id: "stan",
                tmdbProviderId: 528,
                name: "Stan",
                logoPath: "/p3Z12gKq2qvJaUOMeKNU2mzKVI9.jpg",
                homepage: "https://www.stan.com.au",
                prices: [],
                defaultPrice: nil
            )
        ]
    )
    .frame(width: 280, height: 180)
    .background(Color.background)
    .border(Color.gray.opacity(0.3), width: 1)
}

#Preview("Scanline Comparison") {
    struct ScanlinePreviewWrapper: View {
        @State private var selectedScanline = "Horizontal RGB (Fill)"

        // Updated to include fill mode: (displayName, assetName, useFillMode)
        let scanlineOptions: [(String, String?, Bool)] = [
            ("None (Programmatic)", nil, false),
            ("CRT Sony", "crt-sony", false),
            ("Grid 2px 25%", "Grid_2px_25", false),
            ("Base Grid", "base_grid", false),
            ("Horizontal Cool", "horizontal-cool", false),
            ("Horizontal CRT", "horizontal-crt", false),
            ("Horizontal Phosphors", "horizontal-phosphors", false),
            ("Horizontal Phosphors (Fill)", "horizontal-phosphors-fill", true),
            ("Horizontal RGB", "horizontal-rgb", false),
            ("Horizontal RGB (Fill)", "horizontal-rgb-fill", true),
            ("Horizontal", "horizontal", false),
            ("Horizontal 0", "horizontal0", false),
            ("Nintendo Game Boy Advance", "Nintendo-Game-Boy-Advance", false),
            ("Scanline 2px 100%", "Scanline_2px_100", false),
            ("Scanline 2px 100% + Vignette", "Scanline_2px_100_Vignette", false),
            ("Scanline 2px 50%", "Scanline_2px_50", false),
            ("Scanline 2px 50% + Vignette", "Scanline_2px_50_Vignette", false),
            ("Scanline 3px 100%", "Scanline_3px_100", false),
            ("Scanline 3px 100% + Vignette", "Scanline_3px_100_Vignette", false),
            ("Scanline 3px 50%", "Scanline_3px_50", false),
            ("Scanline 3px 50% + Vignette", "Scanline_3px_50_Vignette", false),
            ("Scanlines", "scanlines", false),
            ("Scanlines Bold", "scanlinesbold", false),
            ("Scanlines Grid", "scanlinesgrid", false)
        ]

        var currentScanline: String? {
            scanlineOptions.first(where: { $0.0 == selectedScanline })?.1
        }

        var useFillMode: Bool {
            scanlineOptions.first(where: { $0.0 == selectedScanline })?.2 ?? false
        }

        var body: some View {
            VStack(spacing: 0) {
                // Dropdown menu at top
                HStack {
                    Text("Scanline Style:")
                        .font(.headline)
                        .foregroundColor(.white)

                    Spacer()

                    Menu {
                        ForEach(scanlineOptions, id: \.0) { option in
                            Button(option.0) {
                                selectedScanline = option.0
                            }
                        }
                    } label: {
                        HStack {
                            Text(selectedScanline)
                                .foregroundColor(.white)
                            Image(systemName: "chevron.down")
                                .foregroundColor(.white.opacity(0.6))
                                .font(.caption)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.white.opacity(0.1))
                        .cornerRadius(8)
                    }
                }
                .padding()
                .background(Color.black.opacity(0.8))

                // Hero with selected scanline
                HeroSection(
                    services: [
                        StreamingService(
                            id: "netflix",
                            tmdbProviderId: 8,
                            name: "Netflix",
                            logoPath: "/9A1JSVmSxsyaBK4SUFsYVqbAYfW.jpg",
                            homepage: "https://www.netflix.com",
                            prices: [],
                            defaultPrice: nil
                        ),
                        StreamingService(
                            id: "disney",
                            tmdbProviderId: 337,
                            name: "Disney Plus",
                            logoPath: "/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg",
                            homepage: "https://www.disneyplus.com",
                            prices: [],
                            defaultPrice: nil
                        ),
                        StreamingService(
                            id: "hbo",
                            tmdbProviderId: 384,
                            name: "Max",
                            logoPath: "/zxrVdFjIjLqkfnwyghnfywTn3Lh.jpg",
                            homepage: "https://www.max.com",
                            prices: [],
                            defaultPrice: nil
                        ),
                        StreamingService(
                            id: "prime",
                            tmdbProviderId: 9,
                            name: "Prime Video",
                            logoPath: "/emthp39XA2YScoYL1p0sdbAH2WA.jpg",
                            homepage: "https://www.primevideo.com",
                            prices: [],
                            defaultPrice: nil
                        )
                    ],
                    scanlineStyle: currentScanline,
                    scanlineFillMode: useFillMode
                )
            }
            .background(Color.background)
        }
    }

    return ScanlinePreviewWrapper()
}
#endif
