//
//  Typography.swift
//  Tally
//
//  Centralized typography styles for consistent text rendering
//

import SwiftUI

extension Font {
    // MARK: - Display Fonts (Hero sections, large titles)

    static let displayLarge = Font.system(size: 48, weight: .bold, design: .rounded)
    static let displayMedium = Font.system(size: 36, weight: .bold, design: .rounded)
    static let displaySmall = Font.system(size: 28, weight: .semibold, design: .rounded)

    // MARK: - Heading Fonts

    static let heading1 = Font.system(size: 24, weight: .bold, design: .default)
    static let heading2 = Font.system(size: 20, weight: .semibold, design: .default)
    static let heading3 = Font.system(size: 18, weight: .semibold, design: .default)
    static let heading4 = Font.system(size: 16, weight: .medium, design: .default)

    // MARK: - Body Fonts

    static let bodyLarge = Font.system(size: 16, weight: .regular, design: .default)
    static let bodyMedium = Font.system(size: 14, weight: .regular, design: .default)
    static let bodySmall = Font.system(size: 12, weight: .regular, design: .default)

    // MARK: - Label Fonts

    static let labelLarge = Font.system(size: 14, weight: .medium, design: .default)
    static let labelMedium = Font.system(size: 12, weight: .medium, design: .default)
    static let labelSmall = Font.system(size: 10, weight: .medium, design: .default)

    // MARK: - Caption Fonts

    static let captionLarge = Font.system(size: 12, weight: .regular, design: .default)
    static let captionMedium = Font.system(size: 11, weight: .regular, design: .default)
    static let captionSmall = Font.system(size: 10, weight: .regular, design: .default)

    // MARK: - Monospace Fonts (for numbers, prices)

    static let monoLarge = Font.system(size: 16, weight: .regular, design: .monospaced)
    static let monoMedium = Font.system(size: 14, weight: .regular, design: .monospaced)
    static let monoSmall = Font.system(size: 12, weight: .regular, design: .monospaced)

    // MARK: - Special Purpose

    /// Large numeric display (e.g., monthly total)
    static let numericDisplay = Font.system(size: 32, weight: .bold, design: .rounded)

    /// Price display
    static let price = Font.system(size: 16, weight: .semibold, design: .monospaced)

    /// Subscription tier label
    static let tier = Font.system(size: 12, weight: .medium, design: .default)
}

// MARK: - Text Style View Modifiers

extension View {
    func displayLargeStyle() -> some View {
        self
            .font(.displayLarge)
            .foregroundColor(.textPrimary)
    }

    func displayMediumStyle() -> some View {
        self
            .font(.displayMedium)
            .foregroundColor(.textPrimary)
    }

    func heading1Style() -> some View {
        self
            .font(.heading1)
            .foregroundColor(.textPrimary)
    }

    func heading2Style() -> some View {
        self
            .font(.heading2)
            .foregroundColor(.textPrimary)
    }

    func bodyStyle() -> some View {
        self
            .font(.bodyMedium)
            .foregroundColor(.textPrimary)
    }

    func captionStyle() -> some View {
        self
            .font(.captionMedium)
            .foregroundColor(.textSecondary)
    }

    func labelStyle() -> some View {
        self
            .font(.labelMedium)
            .foregroundColor(.textSecondary)
    }
}

// MARK: - Preview

#if DEBUG
struct TypographyPreview: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                fontSection(title: "Display", fonts: [
                    ("Large", Font.displayLarge),
                    ("Medium", Font.displayMedium),
                    ("Small", Font.displaySmall)
                ])

                fontSection(title: "Headings", fonts: [
                    ("H1", Font.heading1),
                    ("H2", Font.heading2),
                    ("H3", Font.heading3),
                    ("H4", Font.heading4)
                ])

                fontSection(title: "Body", fonts: [
                    ("Large", Font.bodyLarge),
                    ("Medium", Font.bodyMedium),
                    ("Small", Font.bodySmall)
                ])

                fontSection(title: "Labels", fonts: [
                    ("Large", Font.labelLarge),
                    ("Medium", Font.labelMedium),
                    ("Small", Font.labelSmall)
                ])

                fontSection(title: "Captions", fonts: [
                    ("Large", Font.captionLarge),
                    ("Medium", Font.captionMedium),
                    ("Small", Font.captionSmall)
                ])

                fontSection(title: "Special", fonts: [
                    ("Numeric Display", Font.numericDisplay),
                    ("Price", Font.price),
                    ("Tier", Font.tier)
                ])
            }
            .padding()
        }
        .background(Color.background)
    }

    func fontSection(title: String, fonts: [(String, Font)]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.heading2)
                .foregroundColor(.textPrimary)

            ForEach(fonts, id: \.0) { name, font in
                VStack(alignment: .leading, spacing: 4) {
                    Text("The quick brown fox")
                        .font(font)
                        .foregroundColor(.textPrimary)

                    Text(name)
                        .font(.captionMedium)
                        .foregroundColor(.textTertiary)
                }
            }
        }
        .padding()
        .background(Color.backgroundSecondary)
        .cornerRadius(12)
    }
}

#Preview {
    TypographyPreview()
}
#endif
