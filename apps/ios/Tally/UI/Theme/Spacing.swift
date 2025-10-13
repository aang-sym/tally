//
//  Spacing.swift
//  Tally
//
//  Centralized spacing constants for consistent layout
//

import SwiftUI

enum Spacing {
    // MARK: - Base Spacing Units (4pt scale)

    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 20
    static let xxl: CGFloat = 24
    static let xxxl: CGFloat = 32

    // MARK: - Component Spacing

    /// Standard padding for screen edges
    static let screenPadding: CGFloat = 16

    /// Standard padding for cards
    static let cardPadding: CGFloat = 16

    /// Standard spacing between sections
    static let sectionSpacing: CGFloat = 24

    /// Standard spacing between cards in a list
    static let cardSpacing: CGFloat = 12

    /// Standard corner radius for cards
    static let cardCornerRadius: CGFloat = 12

    /// Standard corner radius for buttons
    static let buttonCornerRadius: CGFloat = 8

    /// Standard icon size (small)
    static let iconSizeSmall: CGFloat = 16

    /// Standard icon size (medium)
    static let iconSizeMedium: CGFloat = 24

    /// Standard icon size (large)
    static let iconSizeLarge: CGFloat = 32

    /// Provider logo size in hero section
    static let heroLogoSize: CGFloat = 60

    /// Provider logo size in subscription card
    static let subscriptionLogoSize: CGFloat = 40

    // MARK: - Padding Sets

    struct Padding {
        let top: CGFloat
        let leading: CGFloat
        let bottom: CGFloat
        let trailing: CGFloat

        init(all: CGFloat) {
            self.top = all
            self.leading = all
            self.bottom = all
            self.trailing = all
        }

        init(horizontal: CGFloat, vertical: CGFloat) {
            self.top = vertical
            self.leading = horizontal
            self.bottom = vertical
            self.trailing = horizontal
        }

        init(top: CGFloat = 0, leading: CGFloat = 0, bottom: CGFloat = 0, trailing: CGFloat = 0) {
            self.top = top
            self.leading = leading
            self.bottom = bottom
            self.trailing = trailing
        }
    }

    /// Standard card padding
    static let card = Padding(all: cardPadding)

    /// Standard screen padding
    static let screen = Padding(all: screenPadding)
}

// MARK: - View Extensions

extension View {
    /// Apply standard card padding
    func cardPadding() -> some View {
        self.padding(.vertical, Spacing.cardPadding)
            .padding(.horizontal, Spacing.cardPadding)
    }

    /// Apply standard screen padding
    func screenPadding() -> some View {
        self.padding(.horizontal, Spacing.screenPadding)
    }

    /// Apply standard card styling
    func cardStyle() -> some View {
        self
            .background(Color.backgroundSecondary)
            .cornerRadius(Spacing.cardCornerRadius)
            .shadow(color: Color.shadow, radius: 4, x: 0, y: 2)
    }
}

// MARK: - Preview

#if DEBUG
struct SpacingPreview: View {
    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.sectionSpacing) {
                spacingSection(title: "Base Units", items: [
                    ("xs", Spacing.xs),
                    ("sm", Spacing.sm),
                    ("md", Spacing.md),
                    ("lg", Spacing.lg),
                    ("xl", Spacing.xl),
                    ("xxl", Spacing.xxl),
                    ("xxxl", Spacing.xxxl)
                ])

                spacingSection(title: "Component Sizes", items: [
                    ("Screen Padding", Spacing.screenPadding),
                    ("Card Padding", Spacing.cardPadding),
                    ("Section Spacing", Spacing.sectionSpacing),
                    ("Card Spacing", Spacing.cardSpacing)
                ])

                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Card Style Example")
                        .font(.headline)
                        .foregroundColor(.textPrimary)

                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("This is a card")
                            .font(.body)
                            .foregroundColor(.textPrimary)
                        Text("With standard styling")
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                    }
                    .cardPadding()
                    .cardStyle()
                }
                .screenPadding()
            }
            .padding(.vertical, Spacing.lg)
        }
        .background(Color.background)
    }

    func spacingSection(title: String, items: [(String, CGFloat)]) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(title)
                .font(.headline)
                .foregroundColor(.textPrimary)

            ForEach(items, id: \.0) { name, value in
                HStack(spacing: Spacing.md) {
                    Rectangle()
                        .fill(Color.tallyPrimary)
                        .frame(width: value, height: 20)

                    Text(name)
                        .foregroundColor(.textSecondary)
                        .frame(width: 120, alignment: .leading)

                    Text("\(Int(value))pt")
                        .foregroundColor(.textTertiary)
                        .font(.caption)

                    Spacer()
                }
            }
        }
        .cardPadding()
        .cardStyle()
        .screenPadding()
    }
}

#Preview {
    SpacingPreview()
}
#endif
