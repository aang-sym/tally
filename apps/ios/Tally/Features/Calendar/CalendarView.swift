import SwiftUI

// TODO (preview): Fade between months on vertical scroll

// MARK: - Calendar View (Screen)
struct CalendarView: View {
    // MARK: - State
    @ObservedObject var api: ApiClient
    @StateObject private var vm = CalendarViewModel()
    @State private var selectedDay: Calendar2Day?

    // MARK: - Body
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                header
                if vm.isLoading { ProgressView("Loading month…") }
                grid
            }
            .padding(.vertical, 17)
            .padding(.horizontal, 10)
        }
        .task { await vm.reload(api: api) }
        .onChange(of: vm.country) { _, _ in Task { await vm.reload(api: api) } }
        .sheet(item: $selectedDay) { day in
            DayDetailListView(day: day, viewModel: vm)
        }
    }

    // MARK: - Header
    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Spacer(minLength: 10)
                Text(monthTitle(vm.monthAnchor)).font(.headline)
                Spacer(minLength: 10)
            }
            HStack {
                Menu("Country: \(vm.country)") {
                    ForEach(CountryManager.all, id: \.self) { code in
                        Button(code) {
                            vm.country = code
                            CountryManager.set(code)
                        }
                    }
                }
                Spacer()
                Button("Today") {
                    vm.monthAnchor = CalendarViewModel.firstOfMonth(Date())
                    Task { await vm.reload(api: api) }
                }
            }
        }
    }

    // MARK: - Grid
    private var grid: some View {
        VStack(spacing: 4) {
            HStack {
                ForEach(["SUN","MON","TUE","WED","THU","FRI","SAT"], id: \.self) { day in
                    Text(day)
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .foregroundStyle(.secondary)
                }
            }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 1), count: 7), spacing: 1) {
                ForEach(vm.days) { day in
                    Calendar2DayCell(
                        day: day,
                        providers: vm.dailyProviders[day.id] ?? [],
                        primaryProvider: vm.primaryProvider(for: day.id),
                        secondaryProviders: vm.secondaryProviders(for: day.id),
                        onTap: {
                            // Only show sheet for days with episodes/providers
                            if vm.hasEpisodes(for: day.id) {
                                selectedDay = day
                            }
                        }
                    )
                }
            }
        }
        .onAppear { vm.makeMonthGrid() }
    }

    // MARK: - Helpers
    private func monthTitle(_ date: Date) -> String {
        let f = DateFormatter(); f.dateFormat = "LLLL, yyyy"; return f.string(from: date)
    }
}

// MARK: - Day Cell
private struct Calendar2DayCell: View {
    let day: Calendar2Day
    let providers: [ProviderBadge]
    let primaryProvider: ProviderBadge?
    let secondaryProviders: [ProviderBadge]
    let onTap: () -> Void

    private var isToday: Bool {
        Calendar.current.isDateInToday(day.date)
    }

    private var cellWidth: CGFloat {
        // Estimate cell width from screen bounds for icon sizing
        let screenWidth = UIScreen.main.bounds.width
        let padding: CGFloat = 24 // approximate horizontal padding
        let spacing: CGFloat = 2 * 6 // 6 spacings between 7 columns
        return (screenWidth - padding - spacing) / 7
    }

    private var iconSize: CGFloat {
        min(cellWidth * 0.58, 46)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Top region: 4/5 height, icon centered
            ZStack {
                if let primary = primaryProvider {
                    AsyncImage(url: URL(string: primary.logo ?? "")) { phase in
                        if case .success(let image) = phase {
                            image
                                .resizable()
                                .scaledToFit()
                                .clipShape(Circle())
                        } else {
                            Circle().fill(color(for: primary.name))
                        }
                    }
                    .frame(width: iconSize, height: iconSize)
                } else if providers.count > 1 {
                    ZStack {
                        Circle()
                            .fill(Color(.systemGray4))
                        Text("+\(providers.count)")
                            .font(.caption2)
                            .foregroundColor(.primary)
                    }
                    .frame(width: iconSize, height: iconSize)
                    .overlay(
                        HStack(spacing: 2) {
                            ForEach(providers.prefix(3), id: \.id) { p in
                                Circle()
                                    .fill(color(for: p.name))
                                    .frame(width: 4, height: 4)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .trailing)
                        .padding(.trailing, 4)
                        , alignment: .bottomTrailing
                    )
                } else if let single = providers.first {
                    AsyncImage(url: URL(string: single.logo ?? "")) { phase in
                        if case .success(let image) = phase {
                            image
                                .resizable()
                                .scaledToFit()
                                .clipShape(Circle())
                        } else {
                            Circle().fill(color(for: single.name))
                        }
                    }
                    .frame(width: iconSize, height: iconSize)
                }
            }
            .frame(height: cellWidth * 0.8)  // center within top 4/5

            // Bottom region: 1/5 height, day number aligned to bottom
            Text(dayNumber2Digits(day.date))
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundStyle(day.inMonth ? .secondary : .tertiary)
                .frame(height: cellWidth * 0.2, alignment: .bottom)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color(.secondarySystemBackground))
        )
        .aspectRatio(1, contentMode: .fit)
        .padding(2)
        .accessibilityLabel(accessibilityText)
        .onTapGesture {
            onTap()
        }
    }

    private func dayNumber(_ d: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "d"
        return f.string(from: d)
    }

    private func dayNumber2Digits(_ d: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "dd"
        return f.string(from: d)
    }

    private var accessibilityText: String {
        let dayFormatter = DateFormatter()
        dayFormatter.dateFormat = "EEEE d MMMM"
        let dateString = dayFormatter.string(from: day.date)

        if let primary = primaryProvider {
            return "\(primary.name) on \(dateString)"
        } else if !providers.isEmpty {
            let providerNames = providers.prefix(3).map { $0.name }.joined(separator: ", ")
            return "\(providerNames) on \(dateString)"
        } else {
            return dateString
        }
    }

    private func color(for name: String) -> Color {
        let n = name.lowercased()
        if n.contains("netflix") { return .red }
        if n.contains("prime") || n.contains("amazon") { return Color(.systemBlue) }
        if n.contains("disney") { return Color(.systemBlue) }
        if n.contains("hbo") || n.contains("max") { return .purple }
        if n.contains("hulu") { return .green }
        return Color(.systemGray)
    }
}

#if DEBUG
// MARK: - Previews
enum PreviewSecrets {
    static let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmN2Y2YmIyYy1lNTM2LTQ2MzUtYWY4NS0xNjI4NjY1NDViNWQiLCJlbWFpbCI6InRlc3QyQGV4YW1wbGUuY29tIiwiZGlzcGxheU5hbWUiOiJ0ZXN0MkBleGFtcGxlLmNvbSIsImlhdCI6MTc1ODUxMDg4NiwiZXhwIjoxNzU5MTE1Njg2fQ.6efppUqAdtO0Hg7AQqRmgFd2-eW_SH-GHMsyBQFjSUA"
}

struct CalendarView_Previews: PreviewProvider {
    final class PreviewApiClient: ApiClient {
        init(previewToken: String = PreviewSecrets.token) {
            super.init()
            self.setTokenForPreview(previewToken)
        }
    }

    static var previews: some View {
        CalendarView(api: PreviewApiClient())
            .previewDisplayName("CalendarView Preview")
            .preferredColorScheme(.dark)
            .previewLayout(.sizeThatFits)
            .padding()
    }
}
#endif
