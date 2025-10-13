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
            // Dark textured background
            Color.heroBackground
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
            if let logoURL = service.logoURL {
                AsyncImage(url: logoURL) { phase in
                    switch phase {
                    case .empty:
                        ProgressView()
                            .frame(width: Spacing.heroLogoSize, height: Spacing.heroLogoSize)
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: Spacing.heroLogoSize, height: Spacing.heroLogoSize)
                            .clipShape(Circle())
                    case .failure:
                        placeholderLogo
                    @unknown default:
                        placeholderLogo
                    }
                }
            } else {
                placeholderLogo
            }
        }
        .shadow(color: Color.shadowElevated, radius: 8, x: 0, y: 4)
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
