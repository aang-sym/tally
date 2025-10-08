//
//  SimplifiedCalendarView.swift
//  Tally
//
//  Main vertical scrolling calendar view
//

import SwiftUI

struct SimplifiedCalendarView: View {
    @StateObject private var viewModel = SimplifiedCalendarViewModel()
    @ObservedObject var api: ApiClient

    var body: some View {
        ZStack {
            Color(.systemGroupedBackground)
                .ignoresSafeArea()

            if viewModel.isLoading {
                ProgressView("Loading calendar...")
            } else if let error = viewModel.error {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 48))
                        .foregroundColor(.orange)
                    Text("Error loading calendar")
                        .font(.headline)
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                    Button("Retry") {
                        Task {
                            await viewModel.reload(api: api)
                        }
                    }
                    .buttonStyle(.bordered)
                }
                .padding()
            } else {
                VStack(spacing: 0) {
                    // Provider Legend - stays at top
                    ProviderLegendView(viewModel: viewModel)
                        .padding(.bottom, 4)

                    Divider()
                        .padding(.vertical, 4)

                    // Fixed weekday labels
                    HStack(spacing: 8) {
                        ForEach(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"], id: \.self) { day in
                            Text(day)
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .frame(maxWidth: .infinity)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color(.systemGroupedBackground))

                    ScrollViewReader { scrollProxy in
                        ScrollView {
                            LazyVStack(spacing: 0, pinnedViews: [.sectionHeaders]) {
                                ForEach(Array(viewModel.months.enumerated()), id: \.element.id) { monthIndex, month in
                                    Section {
                                        ForEach(Array(month.weeks.enumerated()), id: \.element.id) { weekIndex, week in
                                            WeekView(
                                                week: week,
                                                monthIndex: monthIndex,
                                                weekIndex: weekIndex,
                                                viewModel: viewModel,
                                                scrollProxy: scrollProxy
                                            )
                                            .id(week.id)
                                        }
                                    } header: {
                                        // Sticky month header (one per month)
                                        SimplifiedMonthHeaderView(monthYear: month.monthYear)
                                            .id("\(month.id)-header")
                                    }
                                }
                            }
                        }
                        .onAppear {
                            // Scroll to today's week on initial load
                            if let (monthIndex, weekIndex) = viewModel.findTodayWeekIndex(),
                               monthIndex < viewModel.months.count,
                               weekIndex < viewModel.months[monthIndex].weeks.count {
                                let todayWeek = viewModel.months[monthIndex].weeks[weekIndex]
                                scrollProxy.scrollTo(todayWeek.id, anchor: .top)
                            }
                        }
                    }
                }
            }
        }
        .task {
            await viewModel.reload(api: api)
            // Pre-select today after data loads
            viewModel.selectToday()
        }
    }

}

// MARK: - Provider Legend

struct ProviderLegendView: View {
    @ObservedObject var viewModel: SimplifiedCalendarViewModel
    @State private var expandedProviderId: Int?

    var body: some View {
        let allProviders = viewModel.getAllProviders()

        if !allProviders.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(allProviders, id: \.id) { provider in
                        Button(action: {
                            // Toggle expanded state with animation
                            withAnimation(.easeInOut(duration: 0.3)) {
                                if expandedProviderId == provider.id {
                                    expandedProviderId = nil
                                } else {
                                    expandedProviderId = provider.id
                                }
                            }
                        }) {
                            HStack(spacing: 6) {
                                // Provider logo
                                if let logoPath = provider.logo,
                                   let url = URL(string: logoPath) {
                                    ProviderLogoView(
                                        url: url,
                                        size: 20,
                                        fallbackColor: viewModel.colorForProvider(provider.id)
                                    )
                                } else {
                                    Circle()
                                        .fill(viewModel.colorForProvider(provider.id))
                                        .frame(width: 20, height: 20)
                                }

                                // Show text only when expanded
                                if expandedProviderId == provider.id {
                                    Text(provider.name)
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(.secondary)
                                        .transition(.opacity.combined(with: .scale(scale: 0.8, anchor: .leading)))
                                }

                                // Colored pip matching calendar
                                Circle()
                                    .fill(viewModel.colorForProvider(provider.id))
                                    .frame(width: 6, height: 6)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(
                                expandedProviderId == provider.id
                                    ? viewModel.colorForProvider(provider.id).opacity(0.15)
                                    : Color(.systemBackground)
                            )
                            .cornerRadius(12)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding(.horizontal, 16)
            }
            .background(Color(.systemGroupedBackground))
        }
    }
}

// MARK: - Month Header

struct SimplifiedMonthHeaderView: View {
    let monthYear: String

    var body: some View {
        Text(monthYear.uppercased())
            .font(.system(size: 18, weight: .bold))
            .foregroundColor(.primary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color(.systemGray6))
    }
}

// MARK: - Week View

struct WeekView: View {
    let week: WeekData
    let monthIndex: Int
    let weekIndex: Int
    @ObservedObject var viewModel: SimplifiedCalendarViewModel
    let scrollProxy: ScrollViewProxy

    var body: some View {
        VStack(spacing: 0) {
            // Week row with 7 days (may include empty cells)
            HStack(spacing: 6) {
                ForEach(0..<7, id: \.self) { index in
                    if let day = week.days[index] {
                        SimplifiedDayCell(
                            day: day,
                            isSelected: viewModel.isSelected(day),
                            onTap: {
                                withAnimation(.easeInOut(duration: 0.3)) {
                                    viewModel.selectDay(day, monthIndex: monthIndex, weekIndex: weekIndex)
                                }
                            }
                        )
                    } else {
                        // Empty cell placeholder
                        Color.clear
                            .frame(maxWidth: .infinity)
                            .frame(height: 80)
                            .background(Color.clear)
                            .cornerRadius(8)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)

            // Episode cards (shown when this week is locked)
            if viewModel.isWeekLocked(monthIndex: monthIndex, weekIndex: weekIndex), let selectedDate = viewModel.selectedDate {
                EpisodeListView(
                    dateString: selectedDate,
                    viewModel: viewModel
                )
                .id(selectedDate) // Force view to reload when date changes
                .transition(.asymmetric(
                    insertion: .move(edge: .top).combined(with: .opacity),
                    removal: .move(edge: .top).combined(with: .opacity)
                ))
            }
        }
    }
}

// MARK: - Day Cell

struct SimplifiedDayCell: View {
    let day: DayData
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 0) {
                // Date number - always at top with fixed height
                Text("\(day.dayNumber)")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(day.isPast ? .secondary : .primary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .frame(height: 24)
                    .padding(.top, 4)

                // Middle section - centered logo between number and pips
                ZStack {
                    if let resubProvider = day.resubscriptionProviders.first {
                        if let logoPath = resubProvider.logo,
                           let url = URL(string: logoPath) {
                            ProviderLogoView(
                                url: url,
                                size: 28,
                                fallbackColor: .gray
                            )
                            .shadow(color: .black.opacity(0.15), radius: 2, x: 0, y: 1)
                        } else {
                            let _ = print("⭕️ Grey circle for day \(day.dayNumber): provider=\(resubProvider.name), logo=\(resubProvider.logo ?? "nil")")
                            Circle()
                                .fill(Color.gray.opacity(0.3))
                                .frame(width: 28, height: 28)
                        }
                    }
                }
                .frame(maxHeight: .infinity)

                // Episode pips (max 3 + indicator)
                EpisodePipsView(pips: Array(day.episodePips.prefix(3)), hasMore: day.episodePips.count > 3)
                    .frame(height: 8)
                    .padding(.bottom, 6)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 80)
            .background(Color(.systemBackground))
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .strokeBorder(
                        isSelected ? Color.blue : (day.isPast ? Color.secondary.opacity(0.3) : Color.clear),
                        lineWidth: isSelected ? 2 : 1
                    )
            )
            .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Provider Stack View

struct ProviderStackView: View {
    let providers: [ProviderBadge]
    let hasMore: Bool

    var body: some View {
        HStack(spacing: -8) {
            ForEach(providers) { provider in
                if let logoPath = provider.logo, let url = URL(string: "https://image.tmdb.org/t/p/original\(logoPath)") {
                    ProviderLogoView(
                        url: url,
                        size: 24,
                        shadow: true,
                        fallbackColor: .gray
                    )
                }
            }

            if hasMore {
                ZStack {
                    Circle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 20, height: 20)

                    Text("+")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                }
            }
        }
    }
}

// MARK: - Episode Pips View

struct EpisodePipsView: View {
    let pips: [ProviderPip]
    let hasMore: Bool

    var body: some View {
        HStack(spacing: 4) {
            ForEach(pips) { pip in
                Circle()
                    .fill(pip.providerColor)
                    .frame(width: 6, height: 6)
            }

            if hasMore {
                Text("+")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundColor(.secondary)
            }
        }
    }
}

// MARK: - Episode List View

struct EpisodeListView: View {
    let dateString: String
    @ObservedObject var viewModel: SimplifiedCalendarViewModel
    @State private var episodes: [EpisodeCardData] = []

    var body: some View {
        VStack(spacing: 12) {
            if episodes.isEmpty {
                Text("No episodes airing on this day")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding()
            } else {
                ForEach(episodes) { episode in
                    SimplifiedEpisodeCard(episode: episode)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(.systemGray6))
        .task {
            episodes = await viewModel.getEpisodeCards(for: dateString)
        }
    }
}

// MARK: - Episode Card

struct SimplifiedEpisodeCard: View {
    let episode: EpisodeCardData
    @State private var showRenewsLabel = false

    private func ordinalDay(_ day: Int) -> String {
        let suffix: String
        switch day {
        case 1, 21, 31:
            suffix = "st"
        case 2, 22:
            suffix = "nd"
        case 3, 23:
            suffix = "rd"
        default:
            suffix = "th"
        }
        return "\(day)\(suffix)"
    }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            HStack(alignment: .top, spacing: 12) {
            // Poster
            if let posterPath = episode.posterPath,
               let url = URL(string: "https://image.tmdb.org/t/p/w200\(posterPath)") {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                }
                .frame(width: 80, height: 120)
                .cornerRadius(8)
            } else {
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .frame(width: 80, height: 120)
                    .cornerRadius(8)
            }

            // Episode info with Reddit button
            VStack(alignment: .leading, spacing: 6) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(episode.showTitle)
                        .font(.system(size: 16, weight: .semibold))
                        .lineLimit(1)

                    Text("\(episode.episodeNumber) - \(episode.episodeTitle)")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.secondary)
                        .lineLimit(1)

                    Text(episode.synopsis)
                        .font(.system(size: 13))
                        .italic(episode.synopsis.starts(with: "Synopsis not yet available"))
                        .foregroundColor(episode.synopsis.starts(with: "Synopsis not yet available") ? .secondary : .primary)
                        .multilineTextAlignment(.leading)
                        .padding(.top, 4)
                }

                Spacer()

                // Cost per episode and Reddit discussion
                HStack(spacing: 8) {
                    // Cost per episode indicator
                    HStack(spacing: 4) {
                        Image(systemName: "dollarsign.circle.fill")
                            .font(.system(size: 14))
                        Text("3.12")
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(.green)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.green.opacity(0.15))
                    .cornerRadius(6)

                    Spacer()

                    // Reddit discussion button
                    Button(action: {
                        // TODO: Link to Reddit discussion
                        print("Reddit discussion tapped for \(episode.showTitle) \(episode.episodeNumber)")
                        print("Synopsis: \(episode.synopsis)")
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "bubble.left.and.bubble.right.fill")
                                .font(.system(size: 12))
                            Text("1.1K+")
                                .font(.system(size: 12, weight: .medium))
                        }
                        .foregroundColor(.orange)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.orange.opacity(0.15))
                        .cornerRadius(6)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .frame(maxWidth: .infinity, alignment: .topLeading)
            }
            .padding(12)
            .background(Color(.systemBackground))
            .cornerRadius(12)

            // Provider pill badge in top-right corner
            if let logoPath = episode.providerLogo,
               let url = URL(string: logoPath),
               let recurringDay = episode.recurringDay,
               let providerColor = episode.providerColor {
                VStack(spacing: 4) {
                    Button(action: {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            showRenewsLabel.toggle()
                        }
                    }) {
                        HStack(spacing: 6) {
                            // Provider logo
                            ProviderLogoView(
                                url: url,
                                size: 20,
                                fallbackColor: .gray
                            )

                            // Recurring day number
                            Text(ordinalDay(recurringDay))
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(providerColor)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(providerColor.opacity(0.15))
                        .cornerRadius(12)
                    }
                    .buttonStyle(PlainButtonStyle())

                    // "Renews" label (shown when tapped)
                    if showRenewsLabel {
                        Text("Renews")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.secondary)
                            .transition(.opacity.combined(with: .scale(scale: 0.8)))
                    }
                }
                .padding(8)
            }
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview("SimplifiedCalendarView") {
    SimplifiedCalendarView(api: PreviewApiClient())
}
#endif
