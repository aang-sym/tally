import SwiftUI

struct TVGuideView: View {
    @ObservedObject var api: ApiClient
    @StateObject private var vm = TVGuideViewModel()

    // Layout constants
    private let providerRailWidth: CGFloat = 108
    private let showRailWidth: CGFloat = 92
    private let dayWidth: CGFloat = 132
    private let rowHeight: CGFloat = 92

    @State private var verticalOffset: CGFloat = 0
    @State private var horizontalOffset: CGFloat = 0
    private struct PosterItem: Identifiable { let url: URL; var id: URL { url } }
    @State private var posterItem: PosterItem?

    var body: some View {
        VStack(spacing: 0) {
            if vm.isLoading { loadingHeader } else { header }
            Divider()
            if vm.isLoading { loadingContent }
            else if vm.data != nil { content }
            else if let err = vm.error { errorView(err) }
            else { content }
        }
        .task { await vm.reload(api: api) }
        .onChange(of: vm.country) { _, _ in Task { await vm.reload(api: api) } }
        .fullScreenCover(item: $posterItem) { item in
            PosterFullScreenView(url: item.url)
        }
    }

    private var header: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                // Month pill aligned above rails
                VStack { Text("SEP").font(.headline) }
                    .frame(width: providerRailWidth + showRailWidth, height: 44)
                    .background(Color(.systemGray5))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                ForEach(vm.dayKeys(), id: \.self) { key in
                    VStack {
                        Text(dayLabel(key)).font(.headline)
                    }
                    .frame(width: dayWidth, height: 44)
                    .background(Color(.systemGray5))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding(.horizontal, 8)
        }
        .onPreferenceChange(HorizontalOffsetKey.self) { horizontalOffset = $0 }
    }

    private var content: some View {
        GeometryReader { _ in
            ScrollView(.vertical, showsIndicators: true) {
                HStack(spacing: 8) {
                    ProviderRail(groups: vm.data?.services ?? [], width: providerRailWidth, rowHeight: rowHeight)
                    ShowRail(groups: vm.data?.services ?? [], width: showRailWidth, rowHeight: rowHeight, onPosterTap: { url in
                        if let u = url { posterItem = PosterItem(url: u) }
                    })
                    grid
                }
                .padding(.horizontal, 8)
            }
        }
    }

    // Rails now in components

    private var grid: some View {
        ScrollView(.horizontal, showsIndicators: true) {
            VStack(spacing: 8) {
                ForEach(vm.data?.services ?? [], id: \.service.id) { group in
                    HStack(spacing: 12) {
                        ForEach(vm.dayKeys(), id: \.self) { key in
                            let slots = vm.index[key]?[group.service.id] ?? []
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color(.secondarySystemBackground))
                                .overlay(
                                    VStack(alignment: .leading, spacing: 8) {
                                        ForEach(slots.prefix(3)) { slot in
                                            EpisodeCard(slot: slot)
                                        }
                                        if slots.count > 3 {
                                            Text("+\(slots.count - 3)")
                                                .font(.caption2)
                                                .padding(6)
                                                .background(Color(.systemGray5))
                                                .clipShape(Capsule())
                                        }
                                        Spacer()
                                    }
                                    .padding(8)
                                )
                                .frame(width: dayWidth, height: rowHeight)
                        }
                    }
                }
            }
            .background(GeometryReader { geo in
                Color.clear.preference(key: HorizontalOffsetKey.self, value: -geo.frame(in: .named("gridspace")).origin.x)
            })
        }
        .coordinateSpace(name: "gridspace")
    }

    private var loadingHeader: some View {
        HStack {
            Color.clear.frame(width: providerRailWidth + showRailWidth)
            ForEach(0..<7, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(.systemGray5))
                    .frame(width: dayWidth, height: 44)
            }
        }
        .padding(.horizontal, 8)
    }

    private var loadingContent: some View {
        HStack(spacing: 8) {
            VStack(spacing: 8) {
                ForEach(0..<5, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 18)
                        .fill(Color(.systemGray5))
                        .frame(width: providerRailWidth, height: rowHeight)
                }
            }
            VStack(spacing: 8) {
                ForEach(0..<5, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 18)
                        .fill(Color(.systemGray6))
                        .frame(width: showRailWidth, height: rowHeight)
                }
            }
            ScrollView(.horizontal) {
                VStack(spacing: 8) {
                    ForEach(0..<5, id: \.self) { _ in
                        HStack(spacing: 12) {
                            ForEach(0..<7, id: \.self) { _ in
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(Color(.secondarySystemBackground))
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
        // key: yyyy-MM-dd → return dd
        return String(key.suffix(2))
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
            .preferredColorScheme(.light)
    }
}
#endif
