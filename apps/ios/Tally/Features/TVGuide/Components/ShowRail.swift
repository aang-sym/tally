import SwiftUI

struct ShowRail: View {
    let groups: [TVGuideServiceGroup]
    let width: CGFloat
    let rowHeight: CGFloat
    let onPosterTap: (URL?) -> Void

    var body: some View {
        VStack(spacing: 8) {
            ForEach(groups, id: \.service.id) { group in
                ZStack {
                    Color.clear
                    HStack(spacing: 8) {
                        VStack(spacing: 8) {
                            ForEach(group.shows.prefix(3), id: \.tmdbId) { show in
                                let url = URL(string: show.poster ?? "")
                                AsyncImage(url: url) { img in
                                    img.resizable().scaledToFill()
                                } placeholder: { Rectangle().fill(Color(.systemGray5)) }
                                .frame(width: 56, height: 72)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                .onTapGesture { onPosterTap(url) }
                            }
                            if group.shows.count > 3 {
                                Text("+\(group.shows.count - 3)")
                                    .font(.caption2)
                                    .padding(6)
                                    .background(Color(.systemGray5))
                                    .clipShape(Capsule())
                            }
                        }
                        Spacer(minLength: 0)
                    }
                    .padding(.horizontal, 8)
                }
                .frame(width: width, height: rowHeight)
            }
        }
        .frame(width: width)
    }
}
