//
//  ProviderLogoView.swift
//  Tally
//
//  Reusable component for displaying provider logos with fallback to colored dots
//

import SwiftUI

struct ProviderLogoView: View {
    let url: URL?
    let size: CGFloat
    let shadow: Bool
    let fallbackColor: Color

    init(
        url: URL?,
        size: CGFloat,
        shadow: Bool = false,
        fallbackColor: Color = .gray
    ) {
        self.url = url
        self.size = size
        self.shadow = shadow
        self.fallbackColor = fallbackColor
    }

    var body: some View {
        Group {
            if let url = url {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .padding(size * 0.1) // Add padding around logo
                } placeholder: {
                    Circle()
                        .fill(fallbackColor)
                }
                .frame(width: size, height: size)
                .background(Color(.systemGray6)) // Add background circle
                .clipShape(Circle())
            } else {
                Circle()
                    .fill(fallbackColor)
                    .frame(width: size, height: size)
            }
        }
        .shadow(
            color: shadow ? .black.opacity(0.2) : .clear,
            radius: shadow ? 2 : 0,
            x: 0,
            y: shadow ? 1 : 0
        )
    }
}

// MARK: - Previews
#Preview {
    VStack(spacing: 20) {
        ProviderLogoView(
            url: URL(string: "https://image.tmdb.org/t/p/original/wwemzKWzjKYJFfCeiB57q3r4Bcm.png"),
            size: 48,
            shadow: true,
            fallbackColor: .red
        )

        ProviderLogoView(
            url: nil,
            size: 32,
            fallbackColor: .blue
        )

        ProviderLogoView(
            url: URL(string: "invalid-url"),
            size: 24,
            fallbackColor: .green
        )
    }
    .padding()
}