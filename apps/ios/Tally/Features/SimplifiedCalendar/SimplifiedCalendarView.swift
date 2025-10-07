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
                ScrollViewReader { scrollProxy in
                    ScrollView {
                        LazyVStack(spacing: 0, pinnedViews: [.sectionHeaders]) {
                            ForEach(Array(viewModel.weeks.enumerated()), id: \.element.id) { index, week in
                                Section {
                                    WeekView(
                                        week: week,
                                        weekIndex: index,
                                        viewModel: viewModel
                                    )
                                    .id(week.id)
                                } header: {
                                    // Sticky month header
                                    if shouldShowMonthHeader(for: index) {
                                        SimplifiedMonthHeaderView(monthYear: monthYearFor(week: week))
                                    }
                                }
                            }
                        }
                    }
                    .onAppear {
                        // Scroll to today's week on initial load
                        if let todayWeekIndex = viewModel.findTodayWeekIndex(),
                           todayWeekIndex < viewModel.weeks.count {
                            let todayWeek = viewModel.weeks[todayWeekIndex]
                            scrollProxy.scrollTo(todayWeek.id, anchor: .top)
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

    private func shouldShowMonthHeader(for weekIndex: Int) -> Bool {
        // Show header for first week and when month changes
        guard weekIndex > 0 else { return true }

        let currentWeek = viewModel.weeks[weekIndex]
        let previousWeek = viewModel.weeks[weekIndex - 1]

        let calendar = Calendar.current
        let currentMonth = calendar.component(.month, from: currentWeek.startDate)
        let previousMonth = calendar.component(.month, from: previousWeek.startDate)

        return currentMonth != previousMonth
    }

    private func monthYearFor(week: WeekData) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: week.startDate)
    }
}

// MARK: - Month Header

struct SimplifiedMonthHeaderView: View {
    let monthYear: String

    var body: some View {
        Text(monthYear)
            .font(.system(size: 20, weight: .bold))
            .foregroundColor(.primary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color(.systemGroupedBackground))
    }
}

// MARK: - Week View

struct WeekView: View {
    let week: WeekData
    let weekIndex: Int
    @ObservedObject var viewModel: SimplifiedCalendarViewModel

    var body: some View {
        VStack(spacing: 0) {
            // Week row with 7 days
            HStack(spacing: 8) {
                ForEach(week.days) { day in
                    SimplifiedDayCell(
                        day: day,
                        isSelected: viewModel.isSelected(day),
                        onTap: {
                            viewModel.selectDay(day)
                        }
                    )
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)

            // Episode cards (shown when this week is locked)
            if viewModel.isWeekLocked(weekIndex), let selectedDate = viewModel.selectedDate {
                EpisodeListView(
                    dateString: selectedDate,
                    viewModel: viewModel
                )
                .id(selectedDate) // Force view to reload when date changes
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
            VStack(spacing: 4) {
                // Date number
                Text("\(day.dayNumber)")
                    .font(.system(size: 18, weight: isSelected ? .bold : .medium))
                    .foregroundColor(isSelected ? .white : (day.isPast ? .secondary : .primary))

                // Provider logos (max 2 visible + indicator)
                ProviderStackView(providers: Array(day.providers.prefix(2)), hasMore: day.providers.count > 2)
                    .frame(height: 24)

                // Episode pips (max 3 + indicator)
                EpisodePipsView(pips: Array(day.episodePips.prefix(3)), hasMore: day.episodePips.count > 3)
                    .frame(height: 8)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 80)
            .background(isSelected ? Color.blue : Color(.systemBackground))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(
                        day.isPast ? Color.secondary.opacity(0.3) : Color.clear,
                        lineWidth: 1
                    )
            )
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

    var body: some View {
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

                // Reddit discussion button
                HStack {
                    Spacer()
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
    }
}

// MARK: - Preview

#if DEBUG
struct SimplifiedCalendarView_Previews: PreviewProvider {
    final class PreviewApiClient: ApiClient {
        init(previewToken: String = PreviewSecrets.token) {
            super.init()
            self.setTokenForPreview(previewToken)
        }
    }

    static var previews: some View {
        SimplifiedCalendarView(api: PreviewApiClient())
            .previewDisplayName("SimplifiedCalendarView Preview")
    }
}
#endif
