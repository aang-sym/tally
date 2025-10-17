//
//  WeekCalendarView.swift
//  Tally
//
//  Vertical list of episodes airing this week, grouped by day
//  Includes horizontal week calendar strip for date navigation
//

import SwiftUI

struct WeekCalendarView: View {
    @Binding var episodes: [CalendarEpisode]
    @Binding var selectedDate: Date?
    @Namespace private var dateNamespace

    // Get current week dates (7 days starting from today)
    private var weekDates: [Date] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        return (0..<7).compactMap { offset in
            calendar.date(byAdding: .day, value: offset, to: today)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Horizontal week strip at top
            HStack(spacing: 4) {
                ForEach(weekDates, id: \.self) { date in
                    WeekDateCell(
                        date: date,
                        episodes: episodesForDate(date),
                        isSelected: selectedDate.map { Calendar.current.isDate($0, inSameDayAs: date) } ?? false
                    )
                    .onTapGesture {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            selectedDate = date
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.screenPadding)
            .background(Color.clear)

            // Scrollable episode list
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        // Group episodes by day
                        ForEach(weekDates, id: \.self) { date in
                            DaySection(
                                date: date,
                                episodes: episodesForDate(date)
                            )
                            .id(date)
                        }
                    }
                    .screenPadding()
                    .padding(.top, Spacing.sm)
                }
                .onChange(of: selectedDate) { _, newDate in
                    if let newDate = newDate {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            proxy.scrollTo(newDate, anchor: .top)
                        }
                    }
                }
            }
        }
        .background(Color.clear)
    }

    /// Get episodes airing on a specific date
    private func episodesForDate(_ date: Date) -> [CalendarEpisode] {
        episodes.filter { episode in
            Calendar.current.isDate(episode.airDate, inSameDayAs: date)
        }
    }
}

// MARK: - Week Date Cell

private struct WeekDateCell: View {
    let date: Date
    let episodes: [CalendarEpisode]
    let isSelected: Bool

    private var dayNumber: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d"
        return formatter.string(from: date)
    }

    private var weekdayName: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter.string(from: date).uppercased()
    }

    var body: some View {
        VStack(spacing: 8) {
            // Weekday abbreviation
            Text(weekdayName)
                .font(.captionMedium)
                .foregroundColor(.textSecondary)

            // Day number
            Text(dayNumber)
                .font(.bodyLarge)
                .foregroundColor(isSelected ? .tallyPrimary : .textPrimary)
                .fontWeight(isSelected ? .semibold : .regular)

            // Provider dots
            if !episodes.isEmpty {
                HStack(spacing: 4) {
                    ForEach(Array(episodes.prefix(3).enumerated()), id: \.offset) { _, episode in
                        Circle()
                            .fill(colorForProvider(episode.provider))
                            .frame(width: 6, height: 6)
                    }
                }
            } else {
                // Empty spacer to maintain alignment
                Circle()
                    .fill(Color.clear)
                    .frame(width: 6, height: 6)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 4)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(isSelected ? Color.tallyPrimary.opacity(0.1) : Color.clear)
        )
        .overlay {
            if isSelected {
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.tallyPrimary, lineWidth: 2)
            }
        }
    }

    /// Get color for streaming provider
    private func colorForProvider(_ provider: StreamingProvider) -> Color {
        switch provider.name {
        case "Netflix": return .red
        case "Disney Plus", "Disney+": return Color(red: 0.05, green: 0.2, blue: 0.4)
        case "Max", "HBO Max": return .purple
        case "Crunchyroll": return .orange
        case "Prime Video", "Amazon Prime Video": return .blue
        case "Apple TV+", "Apple TV Plus": return .gray
        case "Hulu": return .green
        default: return .gray
        }
    }
}

// MARK: - Day Section

private struct DaySection: View {
    let date: Date
    let episodes: [CalendarEpisode]

    private var formattedDate: String {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let dateToCheck = calendar.startOfDay(for: date)

        // Check if date is today
        if calendar.isDate(dateToCheck, inSameDayAs: today) {
            return "Today"
        }

        // Check if date is tomorrow
        if let tomorrow = calendar.date(byAdding: .day, value: 1, to: today),
           calendar.isDate(dateToCheck, inSameDayAs: tomorrow) {
            return "Tomorrow"
        }

        // Otherwise use formatted date
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE d'\(daySuffix(calendar.component(.day, from: date)))' MMMM"
        return formatter.string(from: date)
    }

    private func daySuffix(_ day: Int) -> String {
        switch day {
        case 1, 21, 31: return "st"
        case 2, 22: return "nd"
        case 3, 23: return "rd"
        default: return "th"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Date header
            Text(formattedDate)
                .font(.bodyMedium)
                .fontWeight(.semibold)
                .foregroundColor(.textPrimary)
                .padding(.top, Spacing.xs)

            // Episodes or "No episodes" message
            if episodes.isEmpty {
                Text("No episodes")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
                    .italic()
                    .padding(.leading, Spacing.sm)
                    .padding(.bottom, Spacing.xs)
            } else {
                VStack(spacing: Spacing.cardSpacing) {
                    ForEach(episodes) { episode in
                        CollapsibleEpisodeCard(episode: episode)
                    }
                }
            }
        }
    }
}

// MARK: - Collapsible Episode Card

private struct CollapsibleEpisodeCard: View {
    let episode: CalendarEpisode
    @State private var isExpanded = false

    /// Convert StreamingProvider to StreamingService for glowing logo
    private func convertProviderToService() -> StreamingService {
        return StreamingService(
            id: String(episode.provider.id),
            tmdbProviderId: episode.provider.id,
            name: episode.provider.name,
            logoPath: episode.provider.logoPath,
            homepage: nil,
            prices: [],
            defaultPrice: nil
        )
    }

    var body: some View {
        ZStack(alignment: .trailing) {
            HStack(alignment: .top, spacing: 12) {
                // LEFT: Show poster (collapsed: 50x75, expanded: 80x120)
                if let posterPath = episode.show.posterPath,
                   let url = URL(string: "https://image.tmdb.org/t/p/w200\(posterPath)") {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                    }
                    .frame(
                        width: isExpanded ? 80 : 50,
                        height: isExpanded ? 120 : 75
                    )
                    .cornerRadius(8)
                    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isExpanded)
                } else {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(
                            width: isExpanded ? 80 : 50,
                            height: isExpanded ? 120 : 75
                        )
                        .cornerRadius(8)
                        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isExpanded)
                }

                // RIGHT: Episode info
                VStack(alignment: .leading, spacing: 6) {
                    Text(episode.show.title)
                        .font(.system(size: 16, weight: .semibold))
                        .lineLimit(2)

                    Text("\(episode.episodeIdentifier) - \(episode.episodeTitle)")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.secondary)
                        .lineLimit(2)

                    // Summary (only when expanded)
                    if isExpanded {
                        Text(episode.synopsis)
                            .font(.system(size: 13))
                            .italic(episode.synopsis.starts(with: "Synopsis not yet available") || episode.synopsis.starts(with: "No description"))
                            .foregroundColor(episode.synopsis.starts(with: "Synopsis not yet available") || episode.synopsis.starts(with: "No description") ? .secondary : .primary)
                            .multilineTextAlignment(.leading)
                            .padding(.top, 4)
                            .transition(.opacity.combined(with: .move(edge: .top)))
                    }

                    Spacer()

                    // BOTTOM: Cost + Duration + Reddit badges (only when expanded)
                    if isExpanded {
                        HStack(spacing: 8) {
                            // Cost per episode
                            if let cost = episode.costPerEpisode {
                                Text(String(format: "%.2f", cost))
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(.green)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.green.opacity(0.15))
                                    .cornerRadius(6)
                            }

                            // Duration
                            HStack(spacing: 4) {
                                Image(systemName: "clock")
                                    .font(.system(size: 12))
                                Text("\(episode.runtime) min")
                                    .font(.system(size: 12, weight: .medium))
                            }
                            .foregroundColor(.secondary)

                            Spacer()

                            // Reddit discussion
                            Button(action: {
                                // TODO: Link to Reddit discussion
                                print("Reddit discussion tapped for \(episode.show.title) \(episode.episodeIdentifier)")
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
                            .transition(.opacity.combined(with: .scale(scale: 0.8)))
                        }
                    }
                }
                .padding(.trailing, 52)
                .frame(maxWidth: .infinity, alignment: .topLeading)
            }
            .padding(12)

            // TOP-RIGHT: Provider glowing logo
            GlowingServiceLogoView(
                service: convertProviderToService(),
                baseSize: 36,
                dynamicScale: 1.0,
                style: .card
            )
            .frame(width: 36, height: 36)
            .padding(8)
            .padding(.trailing, 12)
        }
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .glassEffect(.regular, in: .rect(cornerRadius: 12))
        .onTapGesture {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                isExpanded.toggle()
            }
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Week Calendar with Episodes") {
    @Previewable @State var episodes = CalendarEpisode.previews
    @Previewable @State var selectedDate: Date? = nil

    WeekCalendarView(
        episodes: $episodes,
        selectedDate: $selectedDate
    )
    .background(Color.background)
}

#Preview("Week Calendar Empty") {
    @Previewable @State var episodes: [CalendarEpisode] = []
    @Previewable @State var selectedDate: Date? = nil

    WeekCalendarView(
        episodes: $episodes,
        selectedDate: $selectedDate
    )
    .background(Color.background)
}
#endif
