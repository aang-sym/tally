//
//  WeekCalendarView.swift
//  Tally
//
//  Horizontal week calendar strip showing upcoming episode air dates
//  Displays 7 days with colored provider dots for episodes airing each day
//

import SwiftUI

struct WeekCalendarView: View {
    @Binding var episodes: [CalendarEpisode]
    @Binding var selectedDate: Date?
    @Binding var showSheet: Bool

    // Get current week dates (starting from today)
    private var weekDates: [Date] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        return (0..<7).compactMap { offset in
            calendar.date(byAdding: .day, value: offset, to: today)
        }
    }

    var body: some View {
        VStack(spacing: Spacing.lg) {
            // Week title
            Text("This Week")
                .font(.heading2)
                .foregroundColor(.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .screenPadding()

            // Horizontal week strip
            HStack(spacing: 4) {
                ForEach(weekDates, id: \.self) { date in
                    WeekDateCell(
                        date: date,
                        episodes: episodesForDate(date),
                        isSelected: selectedDate.map { Calendar.current.isDate($0, inSameDayAs: date) } ?? false
                    )
                    .onTapGesture {
                        let dateEpisodes = episodesForDate(date)
                        if !dateEpisodes.isEmpty {
                            selectedDate = date
                            showSheet = true
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.screenPadding)
            .glassEffect(.clear, in: .rect(cornerRadius: Spacing.cardCornerRadius))

            Spacer()
        }
        .background(
            // Subtle gradient for liquid glass visibility
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.heroBackground.opacity(0.3),
                    Color.background,
                    Color.backgroundSecondary.opacity(0.5)
                ]),
                startPoint: .top,
                endPoint: .bottom
            )
        )
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
                .foregroundColor(.textTertiary)

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
        .frame(maxWidth: .infinity, minHeight: 80)
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

// MARK: - Preview

#if DEBUG
#Preview("Week Calendar with Episodes") {
    @Previewable @State var episodes = CalendarEpisode.previews
    @Previewable @State var selectedDate: Date? = nil
    @Previewable @State var showSheet = false

    WeekCalendarView(
        episodes: $episodes,
        selectedDate: $selectedDate,
        showSheet: $showSheet
    )
    .background(Color.background)
}

#Preview("Week Calendar Empty") {
    @Previewable @State var episodes: [CalendarEpisode] = []
    @Previewable @State var selectedDate: Date? = nil
    @Previewable @State var showSheet = false

    WeekCalendarView(
        episodes: $episodes,
        selectedDate: $selectedDate,
        showSheet: $showSheet
    )
    .background(Color.background)
}
#endif
