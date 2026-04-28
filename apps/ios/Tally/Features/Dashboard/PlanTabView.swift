import SwiftUI

// MARK: - Plan Tab View

struct PlanTabView: View {
    @ObservedObject var api: ApiClient
    @State private var viewModel = PlanTabViewModel()
    @State private var expandedServiceId: String?

    var body: some View {
        ZStack {
            Color.tallyBg.ignoresSafeArea()

            if viewModel.isLoading {
                ProgressView()
                    .tint(.tallyAccent)
            } else if let error = viewModel.error {
                planErrorView(message: error)
            } else {
                planContent
            }
        }
        .task { await viewModel.load(api: api) }
    }

    // MARK: - Main content

    private var planContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                greetingHeader
                    .padding(.top, 60)
                    .padding(.horizontal, 18)

                heroCard
                    .padding(.top, 20)
                    .padding(.horizontal, 14)

                if !viewModel.recommendations.isEmpty {
                    gapsSection
                        .padding(.top, 32)

                    upcomingSection
                        .padding(.top, 32)
                }

                Spacer().frame(height: 50)
            }
        }
        .scrollIndicators(.hidden)
    }

    // MARK: - Greeting

    private var greetingHeader: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(greetingDate)
                .font(.system(size: 11, weight: .regular, design: .monospaced))
                .tracking(1.4)
                .foregroundColor(.tallyText3)
            Text(api.currentUser?.displayName.components(separatedBy: " ").first ?? "Hey")
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(.tallyText)
                .kerning(-0.6)
        }
    }

    // MARK: - Hero Card

    private var heroCard: some View {
        ZStack(alignment: .topTrailing) {
            // Background orbs
            accentOrb(size: 240, offsetX: 40, offsetY: -60, opacity: 0.30)
            purpleOrb(size: 180, offsetX: -30, offsetY: 40, opacity: 0.20)

            GhostContainer(radius: 22) {
                VStack(alignment: .leading, spacing: 0) {
                    Text("YOUR PLAN · \(planSeasonLabel)")
                        .font(.system(size: 10, weight: .regular, design: .monospaced))
                        .tracking(1.2)
                        .foregroundColor(.tallyAccent)
                        .padding(.bottom, 10)

                    Text(viewModel.totalSavingsFormatted)
                        .font(.system(size: 52, weight: .bold, design: .rounded))
                        .foregroundColor(.tallyText)
                        .kerning(-1)

                    Text("saveable across \(viewModel.gapsCount) gap\(viewModel.gapsCount == 1 ? "" : "s") found")
                        .font(.system(size: 13, weight: .regular, design: .monospaced))
                        .foregroundColor(.tallyText3)
                        .padding(.top, 6)
                        .padding(.bottom, 18)

                    // Stat pills
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            StatPill(label: "GAPS", value: "\(viewModel.gapsCount)")
                            StatPill(label: "TRACKING", value: "\(totalShowsTracked)")
                            StatPill(label: "SUBS", value: "\(viewModel.recommendations.count)")
                            StatPill(label: "MONTHLY", value: monthlyTotal)
                        }
                    }
                    .padding(.bottom, 18)

                    // CTA
                    TallyAccentButton(label: "See pause schedule") { }
                }
                .padding(20)
            }
        }
        .clipped(antialiased: false)
    }

    // MARK: - Gaps Section

    private var gapsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Gaps found")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.tallyText)
                    .kerning(-0.3)
                Spacer()
                Text("All →")
                    .font(.system(size: 11, weight: .regular, design: .monospaced))
                    .tracking(0.4)
                    .foregroundColor(.tallyAccent)
                    .padding(.horizontal, 13)
                    .padding(.vertical, 5)
                    .background(Color.white.opacity(0.08))
                    .overlay(Capsule().strokeBorder(Color.white.opacity(0.18), lineWidth: 0.5))
                    .clipShape(Capsule())
            }
            .padding(.horizontal, 14)

            GhostContainer(radius: 20) {
                VStack(spacing: 0) {
                    ForEach(Array(viewModel.recommendations.enumerated()), id: \.element.id) { index, rec in
                        GapRowView(
                            recommendation: rec,
                            isExpanded: expandedServiceId == rec.serviceId,
                            onToggle: {
                                withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                    expandedServiceId = expandedServiceId == rec.serviceId ? nil : rec.serviceId
                                }
                            }
                        )
                        if index < viewModel.recommendations.count - 1 {
                            FadeSeparator()
                                .padding(.horizontal, 15)
                        }
                    }
                }
            }
            .padding(.horizontal, 14)
        }
    }

    // MARK: - Upcoming Section

    private var upcomingSection: some View {
        let upcoming = viewModel.recommendations.flatMap { rec in
            rec.upcomingShows.map { show in (rec, show) }
        }.prefix(5)

        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("What's next")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.tallyText)
                    .kerning(-0.3)
                Spacer()
                Text("My shows →")
                    .font(.system(size: 11, weight: .regular, design: .monospaced))
                    .tracking(0.4)
                    .foregroundColor(.tallyAccent)
                    .padding(.horizontal, 13)
                    .padding(.vertical, 5)
                    .background(Color.white.opacity(0.08))
                    .overlay(Capsule().strokeBorder(Color.white.opacity(0.18), lineWidth: 0.5))
                    .clipShape(Capsule())
            }
            .padding(.horizontal, 14)

            GhostContainer(radius: 20) {
                VStack(spacing: 0) {
                    if upcoming.isEmpty {
                        Text("No upcoming episodes found")
                            .font(.system(size: 14, design: .monospaced))
                            .foregroundColor(.tallyText3)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 24)
                    } else {
                        ForEach(Array(upcoming.enumerated()), id: \.offset) { index, pair in
                            let (rec, show) = pair
                            UpcomingShowRow(recommendation: rec, show: show, isFirst: index == 0)
                            if index < upcoming.count - 1 {
                                FadeSeparator().padding(.horizontal, 15)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 14)
        }
    }

    // MARK: - Error

    private func planErrorView(message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 40))
                .foregroundColor(.tallyAccent)
            Text(message)
                .font(.system(size: 14, design: .monospaced))
                .foregroundColor(.tallyText2)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Button("Retry") { Task { await viewModel.load(api: api) } }
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.tallyAccent)
        }
    }

    // MARK: - Helpers

    private var greetingDate: String {
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        return "\(f.string(from: Date())) · Welcome back"
    }

    private var planSeasonLabel: String {
        let m = Calendar.current.component(.month, from: Date())
        if m <= 3 { return "Winter \(Calendar.current.component(.year, from: Date()))" }
        if m <= 6 { return "Spring \(Calendar.current.component(.year, from: Date()))" }
        if m <= 9 { return "Summer \(Calendar.current.component(.year, from: Date()))" }
        return "Fall \(Calendar.current.component(.year, from: Date()))"
    }

    private var totalShowsTracked: Int {
        viewModel.recommendations.reduce(0) { $0 + $1.showCount }
    }

    private var monthlyTotal: String {
        let total = viewModel.recommendations.reduce(0.0) { $0 + $1.monthlyPrice }
        return String(format: "$%.0f", total)
    }

    private func accentOrb(size: CGFloat, offsetX: CGFloat, offsetY: CGFloat, opacity: Double) -> some View {
        Circle()
            .fill(
                RadialGradient(
                    gradient: Gradient(colors: [Color.tallyAccent, .clear]),
                    center: .center, startRadius: 0, endRadius: size / 2
                )
            )
            .frame(width: size, height: size)
            .opacity(opacity)
            .offset(x: offsetX, y: offsetY)
            .blur(radius: 2)
            .allowsHitTesting(false)
    }

    private func purpleOrb(size: CGFloat, offsetX: CGFloat, offsetY: CGFloat, opacity: Double) -> some View {
        Circle()
            .fill(
                RadialGradient(
                    gradient: Gradient(colors: [Color(hex: "#8b22ff"), .clear]),
                    center: .center, startRadius: 0, endRadius: size / 2
                )
            )
            .frame(width: size, height: size)
            .opacity(opacity)
            .offset(x: offsetX, y: offsetY)
            .blur(radius: 2)
            .allowsHitTesting(false)
    }
}

// MARK: - Gap Row

private struct GapRowView: View {
    let recommendation: PlanRecommendation
    let isExpanded: Bool
    let onToggle: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Collapsed row
            Button(action: onToggle) {
                HStack(spacing: 13) {
                    ServiceBadge(
                        short: shortName(recommendation.serviceName),
                        color: serviceColor(recommendation.serviceId)
                    )

                    VStack(alignment: .leading, spacing: 2) {
                        Text(recommendation.serviceName)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.tallyText)
                        Text("\(recommendation.showCount) show\(recommendation.showCount == 1 ? "" : "s")")
                            .font(.system(size: 12, weight: .regular, design: .monospaced))
                            .foregroundColor(.tallyText3)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text(recommendation.savingsFormatted)
                            .font(.system(size: 20, weight: .bold, design: .rounded))
                            .foregroundColor(.tallyAccent)
                        if !recommendation.windowLabel.isEmpty {
                            Text(recommendation.windowLabel)
                                .font(.system(size: 11, weight: .regular, design: .monospaced))
                                .foregroundColor(.tallyText3)
                        }
                    }
                }
                .padding(.horizontal, 15)
                .padding(.vertical, 14)
            }
            .buttonStyle(.plain)

            // Expanded detail
            if isExpanded {
                VStack(alignment: .leading, spacing: 14) {
                    FadeSeparator()

                    MonthBar(gapMonths: recommendation.gapMonthIndices)
                        .padding(.horizontal, 15)

                    if let show = recommendation.whyPauseShow, let date = recommendation.whyPauseDate {
                        HStack(spacing: 6) {
                            Image(systemName: "arrow.counterclockwise")
                                .font(.system(size: 10))
                                .foregroundColor(.tallyText3)
                            Text("back \(date) · \(show)")
                                .font(.system(size: 12, weight: .regular, design: .monospaced))
                                .foregroundColor(.tallyText3)
                                .lineLimit(1)
                        }
                        .padding(.horizontal, 15)
                    }

                    TallyAccentButton(label: "Pause this →") { }
                        .padding(.horizontal, 15)
                        .padding(.bottom, 14)
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }

    private func shortName(_ name: String) -> String {
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1))
        }
        return String(name.prefix(2)).uppercased()
    }

    private func serviceColor(_ id: String) -> Color {
        switch id.lowercased() {
        case let s where s.contains("netflix"): return Color(hex: "#E50914")
        case let s where s.contains("disney"): return Color(hex: "#2B8FFF")
        case let s where s.contains("prime"), let s where s.contains("amazon"): return Color(hex: "#29AAFF")
        case let s where s.contains("max"): return Color(hex: "#A67BFF")
        case let s where s.contains("hulu"): return Color(hex: "#1CE783")
        case let s where s.contains("apple"): return Color(hex: "#FFFFFF")
        case let s where s.contains("paramount"): return Color(hex: "#0068FF")
        default: return Color(hex: "#FF3D8B")
        }
    }
}

// MARK: - Upcoming Show Row

private struct UpcomingShowRow: View {
    let recommendation: PlanRecommendation
    let show: PlanUpcomingShow
    let isFirst: Bool

    var body: some View {
        HStack(spacing: 13) {
            ServiceBadge(
                short: shortName(recommendation.serviceName),
                color: serviceColor(recommendation.serviceId)
            )

            VStack(alignment: .leading, spacing: 2) {
                Text(show.title)
                    .font(.system(size: 17, weight: .medium))
                    .foregroundColor(.tallyText)
                    .lineLimit(1)
                Text(recommendation.serviceName)
                    .font(.system(size: 13, weight: .regular, design: .monospaced))
                    .foregroundColor(.tallyText3)
            }

            Spacer()

            if let date = show.nextAirDate {
                Text(formattedDate(date))
                    .font(.system(size: 15, weight: isFirst ? .semibold : .regular, design: .monospaced))
                    .foregroundColor(isFirst ? .tallyAccent : .tallyText2)
            }
        }
        .padding(.horizontal, 15)
        .padding(.vertical, 14)
    }

    private func formattedDate(_ iso: String) -> String {
        let fmt = ISO8601DateFormatter()
        fmt.formatOptions = [.withFullDate]
        guard let d = fmt.date(from: iso) else { return iso }
        let out = DateFormatter()
        out.dateFormat = "MMM d"
        return out.string(from: d)
    }

    private func shortName(_ name: String) -> String {
        let parts = name.split(separator: " ")
        if parts.count >= 2 { return String(parts[0].prefix(1) + parts[1].prefix(1)) }
        return String(name.prefix(2)).uppercased()
    }

    private func serviceColor(_ id: String) -> Color {
        switch id.lowercased() {
        case let s where s.contains("netflix"): return Color(hex: "#E50914")
        case let s where s.contains("disney"): return Color(hex: "#2B8FFF")
        case let s where s.contains("prime"), let s where s.contains("amazon"): return Color(hex: "#29AAFF")
        case let s where s.contains("max"): return Color(hex: "#A67BFF")
        case let s where s.contains("hulu"): return Color(hex: "#1CE783")
        case let s where s.contains("apple"): return Color(hex: "#FFFFFF")
        case let s where s.contains("paramount"): return Color(hex: "#0068FF")
        default: return Color(hex: "#FF3D8B")
        }
    }
}

// MARK: - Preview

#if DEBUG
private struct PlanTabViewPreview: View {
    @State private var viewModel: PlanTabViewModel = {
        let vm = PlanTabViewModel()
        vm.recommendations = [
            PlanRecommendation(
                serviceId: "netflix", serviceName: "Netflix", monthlyPrice: 22.99,
                logoPath: nil,
                pauseFrom: "2026-06-01T00:00:00Z", pauseUntil: "2026-08-31T00:00:00Z",
                allGaps: [PlanGap(from: "2026-06-01T00:00:00Z", until: "2026-08-31T00:00:00Z", days: 91)],
                estimatedSavings: 68.97, whyPause: "No new episodes until September",
                whyPauseShow: "Stranger Things", whyPauseDate: "Sep 5", showCount: 3,
                upcomingShows: [
                    PlanUpcomingShow(title: "Stranger Things", nextAirDate: "2026-09-05", posterPath: nil, tmdbId: nil),
                    PlanUpcomingShow(title: "Squid Game", nextAirDate: "2026-09-20", posterPath: nil, tmdbId: nil)
                ]
            ),
            PlanRecommendation(
                serviceId: "disney", serviceName: "Disney+", monthlyPrice: 13.99,
                logoPath: nil,
                pauseFrom: "2026-07-01T00:00:00Z", pauseUntil: "2026-09-30T00:00:00Z",
                allGaps: [PlanGap(from: "2026-07-01T00:00:00Z", until: "2026-09-30T00:00:00Z", days: 92)],
                estimatedSavings: 41.97, whyPause: "All current shows on hiatus",
                whyPauseShow: "Andor", whyPauseDate: "Oct 1", showCount: 2,
                upcomingShows: [
                    PlanUpcomingShow(title: "Andor", nextAirDate: "2026-10-01", posterPath: nil, tmdbId: nil)
                ]
            )
        ]
        return vm
    }()
    @State private var expandedServiceId: String?

    var body: some View {
        ZStack {
            Color.tallyBg.ignoresSafeArea()
            planBody
        }
    }

    private var planBody: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Apr 28 · Welcome back")
                        .font(.system(size: 11, weight: .regular, design: .monospaced))
                        .tracking(1.4)
                        .foregroundColor(.tallyText3)
                    Text("Angus")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.tallyText)
                        .kerning(-0.6)
                }
                .padding(.top, 60)
                .padding(.horizontal, 18)

                GhostContainer(radius: 22) {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("YOUR PLAN · Spring 2026")
                            .font(.system(size: 10, weight: .regular, design: .monospaced))
                            .tracking(1.2)
                            .foregroundColor(.tallyAccent)
                            .padding(.bottom, 10)
                        Text(viewModel.totalSavingsFormatted)
                            .font(.system(size: 52, weight: .bold, design: .rounded))
                            .foregroundColor(.tallyText)
                            .kerning(-1)
                        Text("saveable across \(viewModel.gapsCount) gaps found")
                            .font(.system(size: 13, weight: .regular, design: .monospaced))
                            .foregroundColor(.tallyText3)
                            .padding(.top, 6).padding(.bottom, 18)
                        TallyAccentButton(label: "See pause schedule") { }
                    }
                    .padding(20)
                }
                .padding(.top, 20).padding(.horizontal, 14)

                VStack(alignment: .leading, spacing: 12) {
                    Text("Gaps found")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.tallyText)
                        .padding(.horizontal, 14)
                    GhostContainer(radius: 20) {
                        VStack(spacing: 0) {
                            ForEach(Array(viewModel.recommendations.enumerated()), id: \.element.id) { idx, rec in
                                GapRowView(
                                    recommendation: rec,
                                    isExpanded: expandedServiceId == rec.serviceId,
                                    onToggle: {
                                        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                            expandedServiceId = expandedServiceId == rec.serviceId ? nil : rec.serviceId
                                        }
                                    }
                                )
                                if idx < viewModel.recommendations.count - 1 {
                                    FadeSeparator().padding(.horizontal, 15)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 14)
                }
                .padding(.top, 32)

                Spacer().frame(height: 50)
            }
        }
        .scrollIndicators(.hidden)
    }
}

#Preview("Plan Tab") {
    PlanTabViewPreview()
}
#endif
