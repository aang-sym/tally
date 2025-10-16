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
        // Transparent background so logos behind are visible
        Color.clear
    }
}

// MARK: - Logo Collision Manager

class LogoCollisionManager: ObservableObject {
    @Published var logoStates: [Int: LogoState] = [:]
    private var serviceMap: [Int: StreamingService] = [:]

    struct LogoState {
        var position: CGPoint
        var velocity: CGPoint
        var radiusX: CGFloat
        var radiusY: CGFloat
    }

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
    @ObservedObject var collisionManager: LogoCollisionManager

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Calculate dynamic scale based on number of DISPLAYED services (capped at 6)
                let displayedLogoCount = min(services.count, 6)
                let dynamicScale = calculateDynamicScale(logoCount: displayedLogoCount)

                // Use service.id as identity to prevent logo cycling
                // Each service maintains its own position across renders
                ForEach(Array(services.prefix(6).enumerated()), id: \.element.id) { index, service in
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

    /// Calculate collision bounds - delegates to shared helper
    /// This is the single source of truth for collision detection
    private func getCollisionBounds() -> (radiusX: CGFloat, radiusY: CGFloat) {
        return CollisionBoundsHelper.getCollisionBounds(for: service, dynamicScale: dynamicScale)
    }

    /// Initialize starting position based on index
    private func initializePosition() {
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
        // Get this logo's shape for proper collision detection
        let myShape = CollisionBoundsHelper.getCollisionShape(for: service)
        let myBounds = (radiusX: radiusX, radiusY: radiusY)

        // Debug: Log this logo's state periodically
        let frameCounter = Int(position.x * 100 + position.y * 100) % 300
        if frameCounter == 0 {
            print("🔵 [\(index)] pos:(\(Int(position.x)),\(Int(position.y))) vel:(\(String(format: "%.2f", velocity.x)),\(String(format: "%.2f", velocity.y)))")
        }

        for (otherIndex, otherState) in collisionManager.logoStates {
            // Skip self
            guard otherIndex != index else { continue }

            // Get other logo's shape from the collision manager
            // We need to find the service for this other logo index
            guard let otherService = collisionManager.getService(for: otherIndex) else { continue }
            let otherShape = CollisionBoundsHelper.getCollisionShape(for: otherService)
            let otherBounds = (radiusX: otherState.radiusX, radiusY: otherState.radiusY)

            // Check CURRENT collision state
            let currentlyColliding = CollisionBoundsHelper.checkCollision(
                shape1: myShape,
                bounds1: myBounds,
                pos1: position,
                shape2: otherShape,
                bounds2: otherBounds,
                pos2: otherState.position
            )

            if currentlyColliding && frameCounter == 0 {
                print("  ⚠️ [\(index)] COLLIDING with [\(otherIndex)]")
            }

            // Check PROPOSED collision state
            let wouldCollide = CollisionBoundsHelper.checkCollision(
                shape1: myShape,
                bounds1: myBounds,
                pos1: proposedPosition,
                shape2: otherShape,
                bounds2: otherBounds,
                pos2: otherState.position
            )

            // Handle collision if we would collide OR if we're currently colliding and not moving apart
            if wouldCollide || currentlyColliding {
                // Get collision normal (direction to push this logo away from other)
                let normal = CollisionBoundsHelper.getCollisionNormal(
                    shape1: myShape,
                    bounds1: myBounds,
                    pos1: position,
                    shape2: otherShape,
                    bounds2: otherBounds,
                    pos2: otherState.position
                )

                let nx = normal.nx
                let ny = normal.ny

                // Calculate dot product of velocity with collision normal
                let dotProduct = velocity.x * nx + velocity.y * ny

                // Reflect velocity if moving toward each other
                if dotProduct < 0 {
                    newVelocity.x = velocity.x - 2 * dotProduct * nx
                    newVelocity.y = velocity.y - 2 * dotProduct * ny
                }

                // Always apply separation when currently colliding (even if moving apart)
                if currentlyColliding {
                    // Push logos apart along collision normal with stronger force
                    let separationSpeed: CGFloat = 3.5  // Increased from 1.5 to prevent sticking
                    actualPosition.x = position.x + nx * separationSpeed
                    actualPosition.y = position.y + ny * separationSpeed

                    // Ensure minimum velocity to prevent freezing
                    let minVelocity: CGFloat = 0.6  // Increased from 0.3 for stronger bounce-back
                    let velocityMag = sqrt(newVelocity.x * newVelocity.x + newVelocity.y * newVelocity.y)
                    if velocityMag < minVelocity {
                        // Add random jitter to unstick with stronger impulse
                        let jitterMagnitude: CGFloat = 0.8  // Stronger than minVelocity for better unsticking
                        let jitterAngle = Double.random(in: 0..<(2 * .pi))
                        newVelocity.x = CGFloat(Darwin.cos(jitterAngle)) * jitterMagnitude
                        newVelocity.y = CGFloat(Darwin.sin(jitterAngle)) * jitterMagnitude
                    }

                    if frameCounter == 0 {
                        print("    → Separating [\(index)]: push (\(String(format: "%.2f", nx * separationSpeed)),\(String(format: "%.2f", ny * separationSpeed)))")
                    }
                } else if wouldCollide {
                    // Don't move - would cause new collision
                    actualPosition = position

                    if frameCounter == 0 {
                        print("    → Blocked [\(index)]: would collide with [\(otherIndex)]")
                    }
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

        // Debug: Log velocity changes
        if velocity != newVelocity && frameCounter == 0 {
            print("  🔄 [\(index)] Velocity: (\(String(format: "%.2f", velocity.x)),\(String(format: "%.2f", velocity.y))) → (\(String(format: "%.2f", newVelocity.x)),\(String(format: "%.2f", newVelocity.y)))")
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

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let scaledSize = baseSize * ServiceBranding.logoScale(for: service) * dynamicScale

        Group {
            if let assetName = ServiceBranding.assetName(for: service) {
                let glowColor = ServiceBranding.glowColor(for: service)
                let shouldInvert = ServiceBranding.shouldInvertLogo(for: service, in: colorScheme)
                let config = GlowConfig.configuration(for: style, size: scaledSize)

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

        static func configuration(for style: GlowingServiceLogoView.Style, size: CGFloat) -> GlowConfig {
            let heroReferenceSize = Spacing.heroLogoSize
            let scaleFactor = max(size / heroReferenceSize, 0.4)

            switch style {
            case .hero:
                return GlowConfig(
                    layers: [
                        GlowLayer(blurRadius: 3 * scaleFactor, opacity: 0.15, brightness: 0.15),
                        GlowLayer(blurRadius: 1.5 * scaleFactor, opacity: 0.2, brightness: 0.1),
                        GlowLayer(blurRadius: 0.5 * scaleFactor, opacity: 0.3, brightness: 0.05)
                    ],
                    baseBrightness: 0.1,
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
                    baseBrightness: 0.08,
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
    static func assetName(for service: StreamingService) -> String? {
        let serviceName = service.name.lowercased()

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

    static func glowColor(for service: StreamingService) -> Color {
        let serviceName = service.name.lowercased()

        if serviceName.contains("netflix") {
            return Color(red: 0.9, green: 0.1, blue: 0.15)
        } else if serviceName.contains("disney") {
            return Color(red: 0.25, green: 0.4, blue: 0.9)
        } else if serviceName.contains("prime") || serviceName.contains("amazon") {
            return Color(red: 0.0, green: 0.67, blue: 0.93)
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
            return Color(red: 0.15, green: 0.45, blue: 0.95)
        }

        return Color.blue.opacity(0.7)
    }

    static func logoScale(for service: StreamingService) -> CGFloat {
        let serviceName = service.name.lowercased()

        if serviceName.contains("disney") {
            return 1.4
        } else if serviceName.contains("stan") {
            return 1.4
        } else if serviceName.contains("prime") || serviceName.contains("amazon") {
            return 1.35
        } else if serviceName.contains("apple") {
            return 1.25
        } else if serviceName.contains("paramount") {
            return 1.25
        } else if serviceName.contains("crunchyroll") {
            return 0.9
        }

        return 1.0
    }

    static func shouldInvertLogo(for service: StreamingService, in colorScheme: ColorScheme) -> Bool {
        guard colorScheme == .dark else { return false }

        let serviceName = service.name.lowercased()

        return serviceName.contains("hbo") || serviceName.contains("max") ||
               serviceName.contains("prime") || serviceName.contains("amazon") ||
               serviceName.contains("disney") ||
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
    var body: some View {
        ZStack {
            // Horizontal scanlines
            GeometryReader { geometry in
                VStack(spacing: 1) {
                    ForEach(0..<Int(geometry.size.height / 3), id: \.self) { _ in
                        Rectangle()
                            .fill(Color.white.opacity(0.04))
                            .frame(height: 2)
                        Spacer()
                            .frame(height: 1)
                    }
                }
            }
            .allowsHitTesting(false)

            // Subtle vignette for CRT edge darkening
            RadialGradient(
                gradient: Gradient(colors: [
                    Color.black.opacity(0),
                    Color.black.opacity(0.15)
                ]),
                center: .center,
                startRadius: 100,
                endRadius: 400
            )
            .allowsHitTesting(false)
        }
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
#endif
