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

    // Collision manager lives at HeroSection level to persist across service changes
    @StateObject private var collisionManager = LogoCollisionManager()

    var body: some View {
        ZStack {
            // Background adapts to system appearance
            Color.background
                .overlay(
                    // Subtle scan line pattern
                    GeometryReader { geometry in
                        VStack(spacing: 2) {
                            ForEach(0..<Int(geometry.size.height / 4), id: \.self) { _ in
                                Rectangle()
                                    .fill(Color.white.opacity(0.02))
                                    .frame(height: 1)
                                Spacer()
                                    .frame(height: 3)
                            }
                        }
                    }
                )

            // Scattered provider logos
            if !services.isEmpty {
                ScatteredLogosView(services: services, collisionManager: collisionManager)
            }
        }
        .frame(height: 300)
        .ignoresSafeArea(edges: .horizontal)
    }
}

// MARK: - Logo Collision Manager

private class LogoCollisionManager: ObservableObject {
    @Published var logoStates: [Int: LogoState] = [:]

    struct LogoState {
        var position: CGPoint
        var velocity: CGPoint
        var radiusX: CGFloat
        var radiusY: CGFloat
    }

    func updateLogo(index: Int, position: CGPoint, velocity: CGPoint, radiusX: CGFloat, radiusY: CGFloat) {
        logoStates[index] = LogoState(position: position, velocity: velocity, radiusX: radiusX, radiusY: radiusY)
    }
}

// MARK: - Scattered Logos View

private struct ScatteredLogosView: View {
    let services: [StreamingService]
    @ObservedObject var collisionManager: LogoCollisionManager

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Calculate dynamic scale based on number of DISPLAYED services (capped at 6)
                let displayedLogoCount = min(services.count, 6)
                let dynamicScale = calculateDynamicScale(logoCount: displayedLogoCount)

                // Use index-based identity to preserve logo positions when services change
                // Temporarily capped at 6 to test collision behavior
                ForEach(Array(services.prefix(6).enumerated()), id: \.offset) { index, service in
                    BouncingLogoView(
                        service: service,
                        index: index,
                        containerSize: geometry.size,
                        collisionManager: collisionManager,
                        dynamicScale: dynamicScale
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

// MARK: - Bouncing Logo View

private struct BouncingLogoView: View {
    let service: StreamingService
    let index: Int
    let containerSize: CGSize
    @ObservedObject var collisionManager: LogoCollisionManager
    let dynamicScale: CGFloat

    @State private var position: CGPoint = .zero
    @State private var velocity: CGPoint = .zero
    @State private var timer: Timer?

    // Debug flag to toggle collision boundary visualization
    private static let showDebugBounds = true

    var body: some View {
        ZStack {
            // Debug collision boundary (uses actual physics bounds)
            if Self.showDebugBounds {
                let bounds = getCollisionBounds()
                Ellipse()
                    .stroke(Color.red, lineWidth: 1)
                    .frame(width: bounds.radiusX * 2, height: bounds.radiusY * 2)
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

            ServiceLogoView(service: service, dynamicScale: dynamicScale)
        }
        .position(position)
        .onAppear {
            initializePosition()
            startBouncing()
        }
        .onDisappear {
            // Clean up timer to prevent memory leak
            timer?.invalidate()
            timer = nil
        }
    }

    /// Calculate collision bounds - used by both physics and debug visualization
    /// This is the single source of truth for collision detection
    private func getCollisionBounds() -> (radiusX: CGFloat, radiusY: CGFloat) {
        let scale = getLogoScale() * dynamicScale // Apply both service-specific and dynamic scaling
        let actualLogoSize = Spacing.heroLogoSize * scale
        let isRectangular = isRectangularLogo()

        if isRectangular {
            // Rectangular logos - elliptical bounds (wider than tall, tighter fit)
            return (actualLogoSize * 0.45, actualLogoSize * 0.25)
        } else {
            // Square/circular logos - circular bounds
            let radius = actualLogoSize / 2
            return (radius, radius)
        }
    }

    /// Initialize starting position based on index
    private func initializePosition() {
        let positions: [(x: Double, y: Double)] = [
            // First 6 positions (original)
            (0.15, 0.25),  // Upper-left
            (0.7, 0.3),    // Upper-right
            (0.45, 0.5),   // Center
            (0.3, 0.7),    // Lower-left
            (0.75, 0.65),  // Lower-right
            (0.5, 0.45),   // Mid-center

            // Additional positions for 7+ logos
            (0.2, 0.45),   // Left-center
            (0.85, 0.4),   // Far-right
            (0.6, 0.25),   // Upper-center-right
            (0.4, 0.8),    // Lower-center
            (0.8, 0.75),   // Lower-right-edge
            (0.25, 0.55),  // Mid-left
            (0.65, 0.7),   // Lower-mid-right
            (0.35, 0.35),  // Upper-mid-left
            (0.55, 0.6),   // Center-right
            (0.15, 0.6),   // Mid-left-lower
        ]

        // Use modulo to cycle through positions if there are more logos than positions
        let pos = positions[index % positions.count]
        position = CGPoint(
            x: containerSize.width * pos.x,
            y: containerSize.height * pos.y
        )

        // Initialize velocity with random direction for chaotic movement
        let baseSpeed: CGFloat = 0.5
        let angle = Double.random(in: 0..<(2 * .pi)) // Random direction
        velocity = CGPoint(
            x: CGFloat(Darwin.cos(angle)) * baseSpeed,
            y: CGFloat(Darwin.sin(angle)) * baseSpeed
        )
    }

    /// Start the bouncing animation with a timer
    private func startBouncing() {
        // Store timer reference for cleanup
        timer = Timer.scheduledTimer(withTimeInterval: 1/60, repeats: true) { _ in
            updatePosition()
        }
    }

    /// Get scale factor for this logo
    private func getLogoScale() -> CGFloat {
        let serviceName = service.name.lowercased()

        if serviceName.contains("disney") { return 1.4 }
        else if serviceName.contains("stan") { return 1.4 }
        else if serviceName.contains("prime") || serviceName.contains("amazon") { return 1.15 }

        return 1.0
    }

    /// Check if this logo is rectangular (Disney+, Stan)
    private func isRectangularLogo() -> Bool {
        let serviceName = service.name.lowercased()
        return serviceName.contains("disney") || serviceName.contains("stan")
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
        if actualPosition.y - radiusY <= 0 || actualPosition.y + radiusY >= containerSize.height {
            newVelocity.y *= -1
            // Clamp position to boundary
            actualPosition.y = max(radiusY, min(containerSize.height - radiusY, actualPosition.y))
        }

        position = actualPosition
        velocity = newVelocity

        // Update collision manager with new state including logo bounds
        collisionManager.updateLogo(index: index, position: actualPosition, velocity: newVelocity, radiusX: radiusX, radiusY: radiusY)
    }
}

// MARK: - Service Logo View

private struct ServiceLogoView: View {
    let service: StreamingService
    let dynamicScale: CGFloat
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        Group {
            if let assetName = logoAssetName(for: service) {
                let scale = logoScale(for: service) * dynamicScale // Apply both service-specific and dynamic scaling
                let size = Spacing.heroLogoSize * scale

                ZStack {
                    // Layer 1: Most blurred layer for outer glow emission
                    Image(assetName)
                        .resizable()
                        .if(shouldInvertLogo(for: service)) { view in
                            view.renderingMode(.template)
                                .foregroundColor(glowColor(for: service))
                        }
                        .aspectRatio(contentMode: .fit)
                        .frame(width: size, height: size)
                        .blur(radius: 3)
                        .opacity(0.15)
                        .brightness(0.15)

                    // Layer 2: Medium blur for mid-range glow
                    Image(assetName)
                        .resizable()
                        .if(shouldInvertLogo(for: service)) { view in
                            view.renderingMode(.template)
                                .foregroundColor(glowColor(for: service))
                        }
                        .aspectRatio(contentMode: .fit)
                        .frame(width: size, height: size)
                        .blur(radius: 1.5)
                        .opacity(0.2)
                        .brightness(0.1)

                    // Layer 3: Slight blur for close glow
                    Image(assetName)
                        .resizable()
                        .if(shouldInvertLogo(for: service)) { view in
                            view.renderingMode(.template)
                                .foregroundColor(glowColor(for: service))
                        }
                        .aspectRatio(contentMode: .fit)
                        .frame(width: size, height: size)
                        .blur(radius: 0.5)
                        .opacity(0.3)
                        .brightness(0.05)

                    // Layer 4: Main logo with subtle brightness boost for self-illumination
                    Image(assetName)
                        .resizable()
                        .if(shouldInvertLogo(for: service)) { view in
                            view.renderingMode(.template)
                                .foregroundColor(glowColor(for: service))
                        }
                        .aspectRatio(contentMode: .fit)
                        .frame(width: size, height: size)
                        .brightness(0.1)
                }
                .background(
                    // Glowing background using the logo shape itself
                    Image(assetName)
                        .resizable()
                        .if(shouldInvertLogo(for: service)) { view in
                            view.renderingMode(.template)
                                .foregroundColor(glowColor(for: service))
                        }
                        .aspectRatio(contentMode: .fit)
                        .frame(width: size, height: size)
                        .blur(radius: 15)
                        .colorMultiply(glowColor(for: service))
                        .opacity(0.8)
                        .scaleEffect(1.05)
                )
                // Multi-layer glow shadows - tighter radiuses
                .shadow(color: glowColor(for: service).opacity(0.6), radius: 10, x: 0, y: 0)
                .shadow(color: glowColor(for: service).opacity(0.4), radius: 18, x: 0, y: 0)
                .shadow(color: glowColor(for: service).opacity(0.2), radius: 25, x: 0, y: 0)
            } else {
                placeholderLogo
            }
        }
    }

    private var placeholderLogo: some View {
        Circle()
            .fill(Color.backgroundTertiary)
            .frame(width: Spacing.heroLogoSize, height: Spacing.heroLogoSize)
            .overlay(
                Text(String(service.name.prefix(2)))
                    .font(.labelLarge)
                    .foregroundColor(.textSecondary)
            )
    }

    /// Map service name to Assets.xcassets logo name
    private func logoAssetName(for service: StreamingService) -> String? {
        let serviceName = service.name.lowercased()

        // Map service names to Asset Catalog names
        if serviceName.contains("netflix") {
            return "Netflix"
        } else if serviceName.contains("disney") {
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

    /// Get brand color glow for each service
    private func glowColor(for service: StreamingService) -> Color {
        let serviceName = service.name.lowercased()

        // Map service names to brand colors for glow effect
        if serviceName.contains("netflix") {
            return Color(red: 0.9, green: 0.1, blue: 0.15) // Netflix Red
        } else if serviceName.contains("disney") {
            return Color(red: 0.25, green: 0.4, blue: 0.9) // Disney+ Royal Blue
        } else if serviceName.contains("prime") || serviceName.contains("amazon") {
            return Color(red: 0.0, green: 0.67, blue: 0.93) // Prime Blue
        } else if serviceName.contains("hbo") || serviceName.contains("max") {
            return Color(red: 0.65, green: 0.2, blue: 0.9) // HBO Purple
        } else if serviceName.contains("crunchyroll") {
            return Color(red: 1.0, green: 0.55, blue: 0.15) // Crunchyroll Orange
        } else if serviceName.contains("stan") {
            return Color(red: 0.2, green: 0.5, blue: 0.95) // Stan Blue
        } else if serviceName.contains("apple") {
            return Color(red: 0.9, green: 0.9, blue: 0.95) // Apple White/Gray
        } else if serviceName.contains("binge") {
            return Color(red: 0.5, green: 0.25, blue: 0.85) // Binge Purple
        } else if serviceName.contains("paramount") {
            return Color(red: 0.15, green: 0.45, blue: 0.95) // Paramount Blue
        }

        // Default glow color
        return Color.blue.opacity(0.7)
    }

    /// Get scale factor for logo size
    /// Rectangular logos (Disney+, Stan) need to be larger to match visual weight of square logos
    private func logoScale(for service: StreamingService) -> CGFloat {
        let serviceName = service.name.lowercased()

        // Rectangular/wide logos need scaling up
        if serviceName.contains("disney") {
            return 1.4
        } else if serviceName.contains("stan") {
            return 1.4
        } else if serviceName.contains("prime") || serviceName.contains("amazon") {
            return 1.15
        }

        // All other logos (square/circular) at default size
        return 1.0
    }

    /// Check if logo should be inverted and colorized
    /// Dark logos (HBO Max, Prime Video, Disney+, Apple TV+) need inversion for visibility on dark backgrounds
    /// Only applies in dark mode - light mode keeps original logos for better visibility
    private func shouldInvertLogo(for service: StreamingService) -> Bool {
        // Only invert logos in dark mode
        guard colorScheme == .dark else { return false }

        let serviceName = service.name.lowercased()

        return serviceName.contains("hbo") || serviceName.contains("max") ||
               serviceName.contains("prime") || serviceName.contains("amazon") ||
               serviceName.contains("disney") ||
               serviceName.contains("apple")
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
    .background(Color.background)
}

#Preview("Hero empty") {
    HeroSection(services: [])
        .background(Color.background)
}
#endif
