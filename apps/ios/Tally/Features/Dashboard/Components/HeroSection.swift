//
//  HeroSection.swift
//  Tally
//
//  Hero section with dark textured background and scattered glowing provider logos
//

import SwiftUI

struct HeroSection: View {
    let services: [StreamingService]

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
                ScatteredLogosView(services: services)
            }
        }
        .frame(height: 300)
        .ignoresSafeArea(edges: .horizontal)
    }
}

// MARK: - Scattered Logos View

private struct ScatteredLogosView: View {
    let services: [StreamingService]

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                ForEach(Array(services.prefix(6).enumerated()), id: \.element.id) { index, service in
                    ServiceLogoView(service: service)
                        .offset(logoOffset(for: index, in: geometry.size))
                }
            }
        }
    }

    /// Calculate offset position for each logo in a scattered layout
    /// Positions are more spread out across the full hero area
    private func logoOffset(for: Int, in size: CGSize) -> CGSize {
        let positions: [(x: Double, y: Double)] = [
            (0.15, 0.2),  // Top-left area
            (0.7, 0.15),  // Top-right area
            (0.45, 0.35), // Center-left
            (0.3, 0.6),   // Lower-left
            (0.75, 0.55), // Lower-right
            (0.5, 0.75)   // Bottom-center
        ]

        guard `for` < positions.count else {
            return CGSize(width: size.width / 2, height: size.height / 2)
        }

        let pos = positions[`for`]
        return CGSize(
            width: size.width * pos.x - Spacing.heroLogoSize / 2,
            height: size.height * pos.y - Spacing.heroLogoSize / 2
        )
    }
}

// MARK: - Service Logo View

private struct ServiceLogoView: View {
    let service: StreamingService

    var body: some View {
        Group {
            if let assetName = logoAssetName(for: service) {
                ZStack {
                    // Layer 1: Most blurred layer for outer glow emission
                    Image(assetName)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: Spacing.heroLogoSize)
                        .blur(radius: 3)
                        .opacity(0.15)
                        .brightness(0.15)

                    // Layer 2: Medium blur for mid-range glow
                    Image(assetName)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: Spacing.heroLogoSize)
                        .blur(radius: 1.5)
                        .opacity(0.2)
                        .brightness(0.1)

                    // Layer 3: Slight blur for close glow
                    Image(assetName)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: Spacing.heroLogoSize)
                        .blur(radius: 0.5)
                        .opacity(0.3)
                        .brightness(0.05)

                    // Layer 4: Main logo with subtle brightness boost for self-illumination
                    Image(assetName)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: Spacing.heroLogoSize)
                        .brightness(0.1)
                }
                .background(
                    // Glowing background using the logo shape itself
                    Image(assetName)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: Spacing.heroLogoSize)
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
            return Color(red: 0.1, green: 0.7, blue: 1.0) // Disney+ Cyan
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
