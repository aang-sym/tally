import SwiftUI

struct ProviderRail: View {
    // segments: array of (service, showCount)
    let segments: [(service: TVGuideStreamingService, count: Int)]
    let width: CGFloat
    let rowHeight: CGFloat
    let rowSpacing: CGFloat

    var body: some View {
        VStack(spacing: rowSpacing) {
            ForEach(Array(segments.enumerated()), id: \.offset) { _, seg in
                ZStack {
                    Color.clear
                    VStack {
                        Spacer()
                        AsyncImage(url: URL(string: seg.service.logo ?? "")) { img in
                            img.resizable().scaledToFill()
                        } placeholder: { Circle().fill(Color(.systemGray4)) }
                        .frame(width: min(25, width - 2), height: min(25, width - 2))
                        .clipShape(Circle())
                        Spacer()
                    }
                }
                .frame(width: width, height: CGFloat(seg.count) * rowHeight + CGFloat(max(0, seg.count - 1)) * rowSpacing)
            }
        }
        .frame(width: width)
    }
}
