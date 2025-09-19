import SwiftUI

struct TVGuideView: View {
    @ObservedObject var api: ApiClient
    @StateObject var vm = TVGuideViewModel()

    // Layout constants
    private let providerRailWidth: CGFloat = 25
    private let showRailWidth: CGFloat = 35
    private let dayWidth: CGFloat = 64
    private let rowHeight: CGFloat = 70
    private let rowSpacing: CGFloat = 8

    @State private var verticalOffset: CGFloat = 0
    @State private var horizontalOffset: CGFloat = 0
    private struct PosterItem: Identifiable { let url: URL; var id: URL { url } }
    @State private var posterItem: PosterItem?

    // Episode expansion state
    @State private var expandedRowId: Int?
    @State private var expandedSlot: EpisodeSlot?

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading { loadingHeader } else { header }
            Divider()
            if vm.isLoading { loadingContent }
            else if vm.data != nil { content }
            else if let err = vm.error { errorView(err) }
            else { content }
        }
        .background(Color.black.ignoresSafeArea())
        .environment(\.colorScheme, .dark)
        .task { await vm.reload(api: api) }
        .onChange(of: vm.country) { _, _ in Task { await vm.reload(api: api) } }
        .fullScreenCover(item: $posterItem) { item in
            PosterFullScreenView(url: item.url)
        }
    }

    private var header: some View {
        VStack(spacing: 8) {
            // Week navigation
            HStack {
                Button(action: { Task { await vm.navigateToWeek(offset: -1, api: api) } }) {
                    Image(systemName: "chevron.left")
                        .font(.title2)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Text(weekRangeLabel())
                    .font(.system(size: 17, weight: .semibold, design: .default))
                    .foregroundStyle(.white)
                Spacer()
                Button(action: { Task { await vm.navigateToWeek(offset: 1, api: api) } }) {
                    Image(systemName: "chevron.right")
                        .font(.title2)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, 16)

            // Day headers
            HStack(spacing: 0) {
                // Fixed month label
                Text(monthLabel())
                    .font(.system(size: 17, weight: .semibold, design: .default))
                    .frame(width: providerRailWidth + showRailWidth, height: 44, alignment: .leading)
                    .padding(.horizontal, 8)

                // Scrollable day labels
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(vm.dayKeys(), id: \.self) { key in
                            VStack {
                                Text(dayLabel(key))
                                    .font(.system(size: 17, weight: .semibold, design: .default))
                                    .foregroundStyle(.white)
                                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                                    .overlay(
                                        Rectangle()
                                            .fill(vm.isToday(key) ? Color.accentColor : .clear)
                                            .frame(height: 2),
                                        alignment: .bottom
                                    )
                            }
                            .frame(width: dayWidth, height: 44)
                        }
                    }
                    .padding(.horizontal, 8)
                }
                .onPreferenceChange(HorizontalOffsetKey.self) { horizontalOffset = $0 }
            }
        }
    }

    private var content: some View {
        GeometryReader { _ in
            ScrollView(.vertical, showsIndicators: true) {
                HStack(spacing: 8) {
                    ProviderRail(segments: providerSegments(), width: providerRailWidth, rowHeight: rowHeight, rowSpacing: 8)
                    ShowRail(rows: showRows(), width: showRailWidth, rowHeight: rowHeight, onPosterTap: { url in
                        if let u = url { posterItem = PosterItem(url: u) }
                    })
                    grid
                }
                .padding(.horizontal, 8)
            }
            .onPreferenceChange(VerticalOffsetKey.self) { verticalOffset = $0 }
        }
    }

    private var grid: some View {
        ScrollView(.horizontal, showsIndicators: true) {
            VStack(spacing: rowSpacing) {
                // Day labels that scroll with the grid
                HStack(spacing: 12) {
                    ForEach(vm.dayKeys(), id: \.self) { key in
                        Text(dayLabel(key))
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(width: dayWidth, height: 24)
                            .overlay(alignment: .bottom) {
                                Rectangle().fill(vm.isToday(key) ? Color.accentColor : .clear).frame(height: 2)
                            }
                    }
                }
                .padding(.bottom, 4)

                // One row per show
                ForEach(Array(showRows().enumerated()), id: \.offset) { _, row in
                    let isExpanded = expandedRowId == row.show.tmdbId
                    let baseHeight = isExpanded ? rowHeight + 80 : rowHeight
                    HStack(spacing: 12) {
                        ForEach(vm.dayKeys(), id: \.self) { key in
                            let slots = episodesFor(show: row.show, service: row.service, dayKey: key)
                            RoundedRectangle(cornerRadius: 10)
                                .fill(Color.clear)
                                .overlay(
                                    VStack(alignment: .leading, spacing: 6) {
                                        if slots.isEmpty {
                                            Spacer(minLength: 0)
                                        } else {
                                            ForEach(slots.prefix(3)) { slot in
                                                let isOpen = expandedSlot?.id == slot.id
                                                if isOpen {
                                                    ExpandedEpisodeCard(slot: slot, onTap: {
                                                        withAnimation(.easeInOut(duration: 0.25)) { expandedSlot = nil; expandedRowId = nil }
                                                    })
                                                } else {
                                                    CompactEpisodeCard(slot: slot, onTap: {
                                                        withAnimation(.easeInOut(duration: 0.25)) { expandedSlot = slot; expandedRowId = row.show.tmdbId }
                                                    })
                                                }
                                            }
                                            if slots.count > 3 {
                                                Text("+\(slots.count - 3)")
                                                    .font(.caption2)
                                                    .padding(6)
                                                    .background(Color.white.opacity(0.10))
                                                    .clipShape(Capsule())
                                            }
                                            Spacer(minLength: 0)
                                        }
                                    }
                                    .padding(8)
                                )
                                .frame(width: dayWidth, height: baseHeight)
                        }
                    }
                    Rectangle()
                        .fill(Color.white.opacity(0.12))
                        .frame(height: 1)
                        .padding(.vertical, 6)
                }
            }
            .background(GeometryReader { geo in
                Color.clear.preference(key: HorizontalOffsetKey.self, value: -geo.frame(in: .named("gridspace")).origin.x)
            })
        }
        .coordinateSpace(name: "gridspace")
    }

    private var loadingHeader: some View {
        VStack(spacing: 8) {
            // Week navigation placeholder
            HStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 24, height: 24)
                Spacer()
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 120, height: 20)
                Spacer()
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 24, height: 24)
            }
            .padding(.horizontal, 16)

            // Day headers placeholder
            HStack(spacing: 0) {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white.opacity(0.08))
                    .frame(width: providerRailWidth + showRailWidth, height: 44)
                    .padding(.horizontal, 8)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(0..<7, id: \.self) { _ in
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.white.opacity(0.08))
                                .frame(width: dayWidth, height: 44)
                        }
                    }
                    .padding(.horizontal, 8)
                }
            }
        }
    }

    private var loadingContent: some View {
        HStack(spacing: 8) {
            VStack(spacing: 8) {
                ForEach(0..<5, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 18)
                        .fill(Color.white.opacity(0.08))
                        .frame(width: providerRailWidth, height: rowHeight)
                }
            }
            VStack(spacing: 8) {
                ForEach(0..<5, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 18)
                        .fill(Color.white.opacity(0.06))
                        .frame(width: showRailWidth, height: rowHeight)
                }
            }
            ScrollView(.horizontal) {
                VStack(spacing: 8) {
                    ForEach(0..<5, id: \.self) { _ in
                        HStack(spacing: 12) {
                            ForEach(0..<7, id: \.self) { _ in
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(Color.white.opacity(0.05))
                                    .frame(width: dayWidth, height: rowHeight)
                            }
                        }
                    }
                }
            }
            .frame(maxHeight: .infinity)
        }
        .padding(.horizontal, 8)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 12) {
            Text("Failed to load TV Guide").font(.headline)
            Text(message).font(.caption).foregroundStyle(.secondary)
            Button("Retry") { Task { await vm.reload(api: api) } }
                .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func dayLabel(_ key: String) -> String {
        return String(key.suffix(2))
    }

    private func monthLabel() -> String {
        guard let firstKey = vm.dayKeys().first else { return "" }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: firstKey) else { return "" }
        formatter.dateFormat = "MMM"
        return formatter.string(from: date).uppercased()
    }

    private func weekRangeLabel() -> String {
        let keys = vm.dayKeys()
        guard let first = keys.first, let last = keys.last else { return "" }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let firstDate = formatter.date(from: first),
              let lastDate = formatter.date(from: last) else { return "" }
        formatter.dateFormat = "MMM d"
        let firstStr = formatter.string(from: firstDate)
        let lastStr = formatter.string(from: lastDate)
        return "\(firstStr) - \(lastStr)"
    }
}

private struct DayCell: View {
    let slots: [EpisodeSlot]
    let dayKey: String
    let serviceId: Int
    let width: CGFloat
    let height: CGFloat
    let expandedSlot: EpisodeSlot?
    let onEpisodeTap: (EpisodeSlot) -> Void

    var body: some View {
        RoundedRectangle(cornerRadius: 16)
            .fill(Color.white.opacity(0.06))
            .overlay(
                VStack(alignment: .leading, spacing: 8) {
                    if slots.isEmpty {
                        Spacer()
                    } else {
                        ForEach(slots.prefix(3)) { slot in
                            let isExpanded = expandedSlot?.id == slot.id
                            if isExpanded {
                                ExpandedEpisodeCard(slot: slot, onTap: { onEpisodeTap(slot) })
                            } else {
                                CompactEpisodeCard(slot: slot, onTap: { onEpisodeTap(slot) })
                            }
                        }
                        if slots.count > 3 {
                            Text("+\(slots.count - 3)")
                                .font(.caption2)
                                .padding(6)
                                .background(Color.white.opacity(0.10))
                                .clipShape(Capsule())
                        }
                        Spacer()
                    }
                }
                .padding(8)
            )
            .frame(width: width, height: height)
    }
}

private struct CompactEpisodeCard: View {
    let slot: EpisodeSlot
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 8) {
                Circle()
                    .fill(Color.accentColor)
                    .frame(width: 6, height: 6)
                Text(seasonEpisode(slot))
                    .font(.system(size: 15, weight: .semibold, design: .default))
                    .foregroundStyle(.white)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 4)
            .padding(.vertical, 2)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .buttonStyle(PlainButtonStyle())
    }

    private func seasonEpisode(_ s: EpisodeSlot) -> String {
        let sn = s.seasonNumber ?? 1
        let ep = s.episodeNumber ?? 0
        return String(format: "S%dE%02d", sn, ep)
    }
}

private struct ExpandedEpisodeCard: View {
    let slot: EpisodeSlot
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(seasonEpisode(slot))
                        .font(.system(size: 15, weight: .semibold, design: .default))
                    Spacer()
                }
                Text(slot.title)
                    .font(.system(size: 13, weight: .regular, design: .default))
                    .lineLimit(2)
                Text("Tap to collapse")
                    .font(.system(size: 11, weight: .regular, design: .default))
                    .opacity(0.7)
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(slot.providerColor.opacity(0.9))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .buttonStyle(PlainButtonStyle())
    }

    private func seasonEpisode(_ s: EpisodeSlot) -> String {
        let sn = s.seasonNumber ?? 1
        let ep = s.episodeNumber ?? 0
        return String(format: "S%dE%02d", sn, ep)
    }
}

private struct EpisodeCard: View {
    let slot: EpisodeSlot
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(seasonEpisode(slot)).font(.subheadline).fontWeight(.semibold)
            Text(slot.title).font(.footnote)
        }
        .foregroundStyle(slot.providerTextColor)
        .padding(.horizontal, 10).padding(.vertical, 8)
        .background(slot.providerColor)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityLabel("\(seasonEpisode(slot)) \(slot.title)")
    }
    private func seasonEpisode(_ s: EpisodeSlot) -> String {
        let sn = s.seasonNumber ?? 1
        let ep = s.episodeNumber ?? 0
        return String(format: "S%dE%02d", sn, ep)
    }
}

private struct PosterFullScreenView: View {
    let url: URL
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            AsyncImage(url: url) { img in
                img.resizable().scaledToFit().ignoresSafeArea()
            } placeholder: { ProgressView().tint(.white) }
        }
        .onTapGesture { dismiss() }
    }
}

private struct VerticalOffsetKey: PreferenceKey { static var defaultValue: CGFloat = 0; static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = nextValue() } }
private struct HorizontalOffsetKey: PreferenceKey { static var defaultValue: CGFloat = 0; static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = nextValue() } }

#if DEBUG
struct TVGuideView_Previews: PreviewProvider {
    final class PreviewApiClient: ApiClient {
        init(previewToken: String = PreviewSecrets.token) { super.init(); self.setTokenForPreview(previewToken) }
    }
    static var previews: some View {
        TVGuideView(api: PreviewApiClient())
            .previewDisplayName("TV Guide v1")
            .preferredColorScheme(.dark)
    }
}
#endif
