import SwiftUI

struct ShowRail: View {
    // Rows in display order: one per show
    let rows: [(service: TVGuideStreamingService, show: TVGuideShow)]
    let width: CGFloat
    let rowHeight: CGFloat
    let onPosterTap: (URL?) -> Void

    var body: some View {
        VStack(spacing: 8) {
            ForEach(Array(rows.enumerated()), id: \.offset) { _, item in
                ZStack {
                    Color.clear
                    ShowPosterView(
                        show: item.show,
                        onTap: { onPosterTap(URL(string: item.show.poster ?? "")) }
                    )
                }
                .frame(width: width, height: rowHeight)
            }
        }
        .frame(width: width)
    }
}

private struct ShowPosterView: View {
    let show: TVGuideShow
    let onTap: () -> Void

    var body: some View {
        AsyncImage(url: URL(string: show.poster ?? "")) { img in
            img.resizable().scaledToFill()
        } placeholder: {
            Color(.systemGray5)
        }
        .frame(width: 35, height: 52)
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .onTapGesture { onTap() }
    }
}
