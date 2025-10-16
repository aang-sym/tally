//
//  LogoCollisionDebugView.swift
//  Tally
//
//  Debug visualization for logo collision borders
//  Shows all provider logos in a static grid with their collision boundaries
//
//  HOW TO ADJUST COLLISION BORDERS:
//  ================================
//  1. Find the getCollisionBounds() function below (line ~36)
//  2. Adjust the multipliers to change collision tightness:
//
//     RECTANGULAR LOGOS (Disney+, Stan):
//       - Width:  actualLogoSize * 0.45  ← increase this number to make wider
//       - Height: actualLogoSize * 0.25  ← increase this number to make taller
//       Example: 0.45 → 0.50 = 11% wider collision border
//
//     CIRCULAR LOGOS (all others):
//       - Radius: actualLogoSize / 2     ← change /2 to /1.8 to make larger
//       Example: /2 → /1.8 = 11% larger collision border
//
//  3. Check the preview below to see the updated red ellipses instantly
//

import SwiftUI

// MARK: - Collision Bounds Helper

/// Collision shape types
enum CollisionShape {
    case circle      // Circular collision boundary (radius-based)
    case ellipse     // Elliptical collision boundary (different X/Y radii)
    case rectangle   // Rectangular collision boundary (actual box)
}

/// Shared collision bounds calculation logic
/// Used by both BouncingLogoView (for physics) and LogoCollisionDebugView (for visualization)
struct CollisionBoundsHelper {

    /// Get collision configuration for a specific service
    /// ⚠️ ADJUST THESE VALUES TO CHANGE INDIVIDUAL SERVICE COLLISION BORDERS
    static func getServiceCollisionConfig(for service: StreamingService) -> (width: CGFloat, height: CGFloat, shape: CollisionShape) {
        let serviceName = service.name.lowercased()

        // Each service gets custom collision border dimensions
        if serviceName.contains("netflix") {
            return (25, 40, .rectangle)  // Square logo → square border
        } else if serviceName.contains("disney") {
            return (46, 27, .ellipse)    // Wide logo → ellipse (keep current)
        } else if serviceName.contains("hbo") || serviceName.contains("max") {
            return (35, 28, .rectangle)  // Wide rectangular logo
        } else if serviceName.contains("crunchyroll") {
            return (32, 32, .circle)     // Circular logo
        } else if serviceName.contains("prime") || serviceName.contains("amazon") {
            return (37, 37, .circle)     // Slightly larger circular logo
        } else if serviceName.contains("stan") {
            return (50, 20, .rectangle)  // Wide rectangular logo
        } else if serviceName.contains("apple") {
            return (35, 15, .rectangle)  // Square logo → square border
        } else if serviceName.contains("binge") {
            return (35, 15, .rectangle)  // Circular-ish → square border
        } else if serviceName.contains("paramount") {
            return (38, 38, .circle)     // Circular logo
        }

        // Default: circular
        return (32, 32, .circle)
    }

    /// Calculate collision bounds for a given service
    /// - Parameters:
    ///   - service: The streaming service
    ///   - dynamicScale: Dynamic scaling factor (default 1.0 for debug view)
    /// - Returns: Tuple of (radiusX, radiusY) representing the collision boundary
    static func getCollisionBounds(for service: StreamingService, dynamicScale: CGFloat = 1.0) -> (radiusX: CGFloat, radiusY: CGFloat) {
        let config = getServiceCollisionConfig(for: service)

        // For rectangles and ellipses, radiusX/radiusY represent half-width/half-height
        // For circles, both values are the radius
        return (config.width, config.height)
    }

    /// Get collision shape type for a service
    static func getCollisionShape(for service: StreamingService) -> CollisionShape {
        return getServiceCollisionConfig(for: service).shape
    }

    /// Get scale factor for a logo based on service name
    static func getLogoScale(for service: StreamingService) -> CGFloat {
        let serviceName = service.name.lowercased()

        if serviceName.contains("disney") { return 1.4 }
        else if serviceName.contains("stan") { return 1.4 }
        else if serviceName.contains("prime") || serviceName.contains("amazon") { return 1.15 }

        return 1.0
    }

    // MARK: - Collision Detection

    /// Check if two shapes are colliding
    /// - Returns: true if shapes overlap, false otherwise
    static func checkCollision(
        shape1: CollisionShape,
        bounds1: (radiusX: CGFloat, radiusY: CGFloat),
        pos1: CGPoint,
        shape2: CollisionShape,
        bounds2: (radiusX: CGFloat, radiusY: CGFloat),
        pos2: CGPoint
    ) -> Bool {
        // Dispatch to appropriate collision check based on shape types
        switch (shape1, shape2) {
        case (.rectangle, .rectangle):
            return checkRectangleRectangle(bounds1: bounds1, pos1: pos1, bounds2: bounds2, pos2: pos2)
        case (.rectangle, .circle), (.rectangle, .ellipse):
            return checkRectangleCircle(rectBounds: bounds1, rectPos: pos1, circleBounds: bounds2, circlePos: pos2)
        case (.circle, .rectangle), (.ellipse, .rectangle):
            return checkRectangleCircle(rectBounds: bounds2, rectPos: pos2, circleBounds: bounds1, circlePos: pos1)
        case (.circle, .circle), (.circle, .ellipse), (.ellipse, .circle), (.ellipse, .ellipse):
            return checkEllipseEllipse(bounds1: bounds1, pos1: pos1, bounds2: bounds2, pos2: pos2)
        }
    }

    /// AABB (Axis-Aligned Bounding Box) collision detection for rectangles
    private static func checkRectangleRectangle(
        bounds1: (radiusX: CGFloat, radiusY: CGFloat),
        pos1: CGPoint,
        bounds2: (radiusX: CGFloat, radiusY: CGFloat),
        pos2: CGPoint
    ) -> Bool {
        // Calculate edges of both rectangles
        let rect1Left = pos1.x - bounds1.radiusX
        let rect1Right = pos1.x + bounds1.radiusX
        let rect1Top = pos1.y - bounds1.radiusY
        let rect1Bottom = pos1.y + bounds1.radiusY

        let rect2Left = pos2.x - bounds2.radiusX
        let rect2Right = pos2.x + bounds2.radiusX
        let rect2Top = pos2.y - bounds2.radiusY
        let rect2Bottom = pos2.y + bounds2.radiusY

        // AABB overlap test
        return rect1Left < rect2Right &&
               rect1Right > rect2Left &&
               rect1Top < rect2Bottom &&
               rect1Bottom > rect2Top
    }

    /// Rectangle-to-circle collision detection
    private static func checkRectangleCircle(
        rectBounds: (radiusX: CGFloat, radiusY: CGFloat),
        rectPos: CGPoint,
        circleBounds: (radiusX: CGFloat, radiusY: CGFloat),
        circlePos: CGPoint
    ) -> Bool {
        // Find the closest point on the rectangle to the circle center
        let closestX = max(rectPos.x - rectBounds.radiusX, min(circlePos.x, rectPos.x + rectBounds.radiusX))
        let closestY = max(rectPos.y - rectBounds.radiusY, min(circlePos.y, rectPos.y + rectBounds.radiusY))

        // Calculate distance from closest point to circle center
        let dx = circlePos.x - closestX
        let dy = circlePos.y - closestY

        // Use elliptical distance for the circle
        let normalizedX = dx / circleBounds.radiusX
        let normalizedY = dy / circleBounds.radiusY
        let distance = sqrt(normalizedX * normalizedX + normalizedY * normalizedY)

        return distance < 1.0
    }

    /// Elliptical collision detection (existing algorithm)
    private static func checkEllipseEllipse(
        bounds1: (radiusX: CGFloat, radiusY: CGFloat),
        pos1: CGPoint,
        bounds2: (radiusX: CGFloat, radiusY: CGFloat),
        pos2: CGPoint
    ) -> Bool {
        let dx = pos1.x - pos2.x
        let dy = pos1.y - pos2.y

        let combinedRadiusX = bounds1.radiusX + bounds2.radiusX
        let combinedRadiusY = bounds1.radiusY + bounds2.radiusY

        let normalizedX = dx / combinedRadiusX
        let normalizedY = dy / combinedRadiusY
        let distance = sqrt(normalizedX * normalizedX + normalizedY * normalizedY)

        return distance < 1.0
    }

    /// Calculate collision normal for shape-to-shape collision
    /// - Returns: Normalized vector pointing from shape2 to shape1 (direction to push shape1)
    static func getCollisionNormal(
        shape1: CollisionShape,
        bounds1: (radiusX: CGFloat, radiusY: CGFloat),
        pos1: CGPoint,
        shape2: CollisionShape,
        bounds2: (radiusX: CGFloat, radiusY: CGFloat),
        pos2: CGPoint
    ) -> (nx: CGFloat, ny: CGFloat) {
        // For rectangle-rectangle, calculate edge-based normal
        if shape1 == .rectangle && shape2 == .rectangle {
            return getRectangleRectangleNormal(bounds1: bounds1, pos1: pos1, bounds2: bounds2, pos2: pos2)
        }

        // For all other cases, use center-to-center normal
        let dx = pos1.x - pos2.x
        let dy = pos1.y - pos2.y
        let distance = sqrt(dx * dx + dy * dy)

        guard distance > 0 else { return (0, 1) } // Avoid division by zero

        return (dx / distance, dy / distance)
    }

    /// Get collision normal for rectangle-rectangle collision
    private static func getRectangleRectangleNormal(
        bounds1: (radiusX: CGFloat, radiusY: CGFloat),
        pos1: CGPoint,
        bounds2: (radiusX: CGFloat, radiusY: CGFloat),
        pos2: CGPoint
    ) -> (nx: CGFloat, ny: CGFloat) {
        // Calculate overlap on each axis
        let dx = pos1.x - pos2.x
        let dy = pos1.y - pos2.y

        let overlapX = (bounds1.radiusX + bounds2.radiusX) - abs(dx)
        let overlapY = (bounds1.radiusY + bounds2.radiusY) - abs(dy)

        // Normal points along the axis of minimum overlap
        if overlapX < overlapY {
            // Horizontal collision
            return dx > 0 ? (1, 0) : (-1, 0)
        } else {
            // Vertical collision
            return dy > 0 ? (0, 1) : (0, -1)
        }
    }
}

// MARK: - Debug Grid View

struct LogoCollisionDebugView: View {
    let services: [StreamingService]

    private let columns = [
        GridItem(.flexible(), spacing: 20),
        GridItem(.flexible(), spacing: 20),
        GridItem(.flexible(), spacing: 20)
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Text("Logo Collision Border Debug")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.textPrimary)
                    .padding(.top, 16)

                Text("Red borders show actual collision boundaries used in physics")
                    .font(.caption)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                LazyVGrid(columns: columns, spacing: 20) {
                    ForEach(Array(services.enumerated()), id: \.offset) { index, service in
                        LogoWithBoundsView(service: service, index: index)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 24)
            }
        }
        .background(Color.background)
    }
}

// MARK: - Individual Logo Cell

private struct LogoWithBoundsView: View {
    let service: StreamingService
    let index: Int
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        let bounds = CollisionBoundsHelper.getCollisionBounds(for: service)
        let scale = CollisionBoundsHelper.getLogoScale(for: service)
        let shape = CollisionBoundsHelper.getCollisionShape(for: service)

        // Color coding: Blue = Circle, Purple = Ellipse, Orange = Rectangle
        let shapeColor: Color = {
            switch shape {
            case .circle: return .blue
            case .ellipse: return .purple
            case .rectangle: return .orange
            }
        }()

        VStack(spacing: 0) {
            // Logo section
            ZStack {
                // Collision boundary - shape depends on collision type
                Group {
                    switch shape {
                    case .circle:
                        Circle()
                            .stroke(Color.red, lineWidth: 2.5)
                            .frame(width: bounds.radiusX * 2, height: bounds.radiusY * 2)
                    case .ellipse:
                        Ellipse()
                            .stroke(Color.red, lineWidth: 2.5)
                            .frame(width: bounds.radiusX * 2, height: bounds.radiusY * 2)
                    case .rectangle:
                        RoundedRectangle(cornerRadius: 4)
                            .stroke(Color.red, lineWidth: 2.5)
                            .frame(width: bounds.radiusX * 2, height: bounds.radiusY * 2)
                    }
                }
                .opacity(0.8)

                // The actual logo - explicitly centered
                GlowingServiceLogoView(
                    service: service,
                    baseSize: Spacing.heroLogoSize,
                    dynamicScale: 1.0,
                    style: .hero
                )

                // Index label - top-left corner (positioned absolutely)
                VStack {
                    HStack {
                        Text("\(index)")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 24, height: 24)
                            .background(shapeColor)
                            .clipShape(Circle())
                            .overlay(
                                Circle()
                                    .stroke(Color.background, lineWidth: 2)
                            )
                            .padding(6)

                        Spacer()
                    }
                    Spacer()
                }
            }
            .frame(height: 120)
            .frame(maxWidth: .infinity)

            // Divider
            Rectangle()
                .fill(Color.gray.opacity(0.2))
                .frame(height: 1)
                .padding(.vertical, 8)

            // Service info section
            VStack(spacing: 6) {
                Text(service.name)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.textPrimary)
                    .lineLimit(1)

                HStack(spacing: 4) {
                    // Shape type label
                    Text({
                        switch shape {
                        case .circle: return "Circle"
                        case .ellipse: return "Ellipse"
                        case .rectangle: return "Rect"
                        }
                    }())
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(shapeColor)

                    Text("•")
                        .font(.system(size: 11))
                        .foregroundColor(.textTertiary)

                    Text("×\(String(format: "%.2f", scale))")
                        .font(.system(size: 11))
                        .foregroundColor(.textSecondary)
                }

                // Dimension labels - use W/H for rectangles, R for circles/ellipses
                HStack(spacing: 8) {
                    if shape == .rectangle {
                        Text("W: \(Int(bounds.radiusX * 2))")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(shapeColor)

                        Text("H: \(Int(bounds.radiusY * 2))")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(shapeColor)
                    } else {
                        Text("RX: \(Int(bounds.radiusX))")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(shapeColor)

                        Text("RY: \(Int(bounds.radiusY))")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(shapeColor)
                    }
                }
            }
            .padding(.bottom, 12)
        }
        .padding(.top, 12)
        .padding(.horizontal, 12)
        .background(Color.backgroundSecondary)
        .cornerRadius(14)
        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Logo Collision Debug Grid") {
    LogoCollisionDebugView(
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
            ),
            StreamingService(
                id: "apple",
                tmdbProviderId: 350,
                name: "Apple TV Plus",
                logoPath: "/2E03IAZsX4ZaUqM7tXlctEPMGWS.jpg",
                homepage: "https://tv.apple.com",
                prices: [],
                defaultPrice: nil
            ),
            StreamingService(
                id: "binge",
                tmdbProviderId: 385,
                name: "Binge",
                logoPath: "/cXwVxQJnPCPeE9CyQDz5sKqf2SL.jpg",
                homepage: "https://binge.com.au",
                prices: [],
                defaultPrice: nil
            ),
            StreamingService(
                id: "paramount",
                tmdbProviderId: 531,
                name: "Paramount Plus",
                logoPath: "/xbhHHa1YgtpwhC8lb1NQ3ACVcLd.jpg",
                homepage: "https://www.paramountplus.com",
                prices: [],
                defaultPrice: nil
            )
        ]
    )
}
#endif
