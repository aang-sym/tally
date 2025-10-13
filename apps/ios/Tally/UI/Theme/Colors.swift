//
//  Colors.swift
//  Tally
//
//  Centralized color definitions for consistent theming
//

import SwiftUI

extension Color {
    // MARK: - Brand Colors

    static let tallyPrimary = Color(hex: "#6366F1") // Indigo
    static let tallySecondary = Color(hex: "#8B5CF6") // Purple

    // MARK: - Background Colors

    /// Main app background (very dark, almost black)
    static let background = Color(hex: "#0A0A0F") // Near black with slight blue tint

    /// Secondary background / card background
    static let backgroundSecondary = Color(hex: "#1C1C1E") // Dark gray

    /// Tertiary background / elevated card
    static let backgroundTertiary = Color(hex: "#2C2C2E") // Lighter gray

    /// Hero background (dark with texture)
    static let heroBackground = Color(hex: "#0D0D12") // Slightly lighter than main background

    // MARK: - Text Colors

    /// Primary text (white/near-white)
    static let textPrimary = Color(hex: "#F8FAFC") // Slate 50

    /// Secondary text (muted)
    static let textSecondary = Color(hex: "#94A3B8") // Slate 400

    /// Tertiary text (very muted)
    static let textTertiary = Color(hex: "#64748B") // Slate 500

    // MARK: - Status Colors

    /// Success green
    static let success = Color(hex: "#10B981") // Emerald 500

    /// Warning amber
    static let warning = Color(hex: "#F59E0B") // Amber 500

    /// Error red
    static let error = Color(hex: "#EF4444") // Red 500

    /// Info blue
    static let info = Color(hex: "#3B82F6") // Blue 500

    // MARK: - UI Element Colors

    /// Border color
    static let border = Color(hex: "#475569") // Slate 600

    /// Border color (subtle)
    static let borderSubtle = Color(hex: "#334155") // Slate 700

    /// Divider color
    static let divider = Color(hex: "#334155") // Slate 700

    // MARK: - Active/Inactive States

    /// Active subscription indicator
    static let subscriptionActive = Color(hex: "#10B981") // Emerald 500

    /// Inactive subscription indicator
    static let subscriptionInactive = Color(hex: "#6B7280") // Gray 500

    // MARK: - Shadow

    /// Shadow color for cards
    static let shadow = Color.black.opacity(0.2)

    /// Shadow color for elevated elements
    static let shadowElevated = Color.black.opacity(0.4)
}

// MARK: - Hex Color Initializer

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Preview

#if DEBUG
struct ColorsPreview: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                colorSection(title: "Brand", colors: [
                    ("Primary", Color.tallyPrimary),
                    ("Secondary", Color.tallySecondary)
                ])

                colorSection(title: "Backgrounds", colors: [
                    ("Background", Color.background),
                    ("Secondary", Color.backgroundSecondary),
                    ("Tertiary", Color.backgroundTertiary),
                    ("Hero", Color.heroBackground)
                ])

                colorSection(title: "Text", colors: [
                    ("Primary", Color.textPrimary),
                    ("Secondary", Color.textSecondary),
                    ("Tertiary", Color.textTertiary)
                ])

                colorSection(title: "Status", colors: [
                    ("Success", Color.success),
                    ("Warning", Color.warning),
                    ("Error", Color.error),
                    ("Info", Color.info)
                ])
            }
            .padding()
        }
        .background(Color.background)
    }

    func colorSection(title: String, colors: [(String, Color)]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)
                .foregroundColor(.textPrimary)

            ForEach(colors, id: \.0) { name, color in
                HStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(color)
                        .frame(width: 60, height: 40)

                    Text(name)
                        .foregroundColor(.textSecondary)

                    Spacer()
                }
            }
        }
        .padding()
        .background(Color.backgroundSecondary)
        .cornerRadius(12)
    }
}

#Preview {
    ColorsPreview()
}
#endif
