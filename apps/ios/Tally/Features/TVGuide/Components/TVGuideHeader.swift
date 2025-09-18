import SwiftUI

struct TVGuideHeader: View {
    let dayKeys: [String]
    let dayWidth: CGFloat
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(dayKeys, id: \.self) { key in
                    VStack { Text(Self.dd(from: key)).font(.headline) }
                        .frame(width: dayWidth, height: 44)
                        .background(Color(.systemGray5))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding(.horizontal, 8)
        }
    }
    static func dd(from key: String) -> String { String(key.suffix(2)) }
}

