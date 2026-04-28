import SwiftUI

// MARK: - Ghost Container (Variant C)
// Barely-visible border-only container. No fill, no shadow.

struct GhostContainer<Content: View>: View {
    var radius: CGFloat = 20
    var content: () -> Content

    var body: some View {
        content()
            .clipShape(RoundedRectangle(cornerRadius: radius))
            .overlay(
                RoundedRectangle(cornerRadius: radius)
                    .strokeBorder(Color.white.opacity(0.06), lineWidth: 0.5)
            )
    }
}

// MARK: - Service Badge
// Colored letter badge with a radial orb glow behind it.

struct ServiceBadge: View {
    let short: String
    let color: Color
    var size: CGFloat = 44

    var body: some View {
        ZStack {
            // Orb glow
            Circle()
                .fill(
                    RadialGradient(
                        gradient: Gradient(colors: [color.opacity(0.5), .clear]),
                        center: .center,
                        startRadius: 0,
                        endRadius: size * 0.9
                    )
                )
                .frame(width: size * 1.8, height: size * 1.8)
                .blur(radius: 2)

            // Badge
            RoundedRectangle(cornerRadius: size * 0.3)
                .fill(color.opacity(0.17))
                .overlay(
                    RoundedRectangle(cornerRadius: size * 0.3)
                        .strokeBorder(color.opacity(0.27), lineWidth: 0.5)
                )
                .frame(width: size, height: size)
                .overlay(
                    Text(short)
                        .font(.system(size: size * 0.36, weight: .bold, design: .default))
                        .foregroundColor(color)
                )
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Fade Separator

struct FadeSeparator: View {
    var body: some View {
        GeometryReader { geo in
            Rectangle()
                .fill(Color.white.opacity(0.10))
                .mask(
                    LinearGradient(
                        gradient: Gradient(stops: [
                            .init(color: .clear, location: 0),
                            .init(color: .black, location: 0.15),
                            .init(color: .black, location: 0.85),
                            .init(color: .clear, location: 1),
                        ]),
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
        }
        .frame(height: 0.5)
    }
}

// MARK: - Section Label

struct TallySectionLabel: View {
    let text: String
    var accent: Bool = false

    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 10, weight: .regular, design: .monospaced))
            .tracking(1.2)
            .foregroundColor(accent ? .tallyAccent : .tallyText3)
    }
}

// MARK: - Accent Button

struct TallyAccentButton: View {
    let label: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                // Glow halo
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.tallyAccent.opacity(0.4))
                    .blur(radius: 8)
                    .padding(-6)

                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.tallyAccent.opacity(0.17))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .strokeBorder(Color.tallyAccent.opacity(0.44), lineWidth: 0.5)
                    )

                Text(label)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.tallyText)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 46)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Month Bar
// 12-month J→D timeline with highlighted gap months.

struct MonthBar: View {
    let gapMonths: [Int] // 0-based (0=Jan, 11=Dec)
    var accentColor: Color = .tallyAccent

    private let monthLetters = ["J","F","M","A","M","J","J","A","S","O","N","D"]

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 2) {
                ForEach(0..<12, id: \.self) { i in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(gapMonths.contains(i) ? accentColor : Color.white.opacity(0.06))
                        .frame(height: 16)
                }
            }
            HStack {
                Text("Jan")
                Spacer()
                Text("Dec")
            }
            .font(.system(size: 7, weight: .regular, design: .monospaced))
            .foregroundColor(.tallyText3)
        }
    }
}

// MARK: - Stat Pill

struct StatPill: View {
    let label: String
    let value: String

    var body: some View {
        HStack(spacing: 7) {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .regular, design: .monospaced))
                .tracking(1.2)
                .foregroundColor(.tallyText3)
            Text(value)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundColor(.tallyText)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(Color.black.opacity(0.30))
        .overlay(
            Capsule().strokeBorder(Color.white.opacity(0.12), lineWidth: 0.5)
        )
        .clipShape(Capsule())
    }
}
