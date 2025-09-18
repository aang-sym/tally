import SwiftUI

struct ProviderRail: View {
    let groups: [TVGuideServiceGroup]
    let width: CGFloat
    let rowHeight: CGFloat

    var body: some View {
        VStack(spacing: 8) {
            ForEach(groups, id: \.service.id) { group in
                RoundedRectangle(cornerRadius: 18)
                    .fill(Color(hex: group.service.color ?? "#6B7280").opacity(0.35))
                    .overlay(
                        VStack {
                            Spacer()
                            AsyncImage(url: URL(string: group.service.logo ?? "")) { img in
                                img.resizable().scaledToFit()
                            } placeholder: { Circle().fill(.secondary.opacity(0.2)) }
                            .frame(width: 48, height: 48)
                            Spacer()
                        }
                    )
                    .frame(width: width, height: rowHeight)
            }
        }
        .frame(width: width)
    }
}
