//
//  WeekCalendarView.swift
//  Tally
//
//  Vertical list of episodes airing this week, grouped by day
//  Includes horizontal week calendar strip for date navigation
//  iOS 26 optimized with Liquid Glass design
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
            // Horizontal week strip at top with subtle glass
            HStack(spacing: 8) {
                ForEach(weekDates, id: \.self) { date in
                    WeekDateCell(
                        date: date,
                        episodes: episodesForDate(date),
                        isSelected: selectedDate.map { Calendar.current.isDate($0, inSameDayAs: date) } ?? false,
                        namespace: dateNamespace
                    )
                    .onTapGesture {
                        withAnimation(.smooth(duration: 0.35)) {
                            selectedDate = date
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.screenPadding)
            .padding(.vertical, 12)
            .background {
                // Subtle dark background that blends with the gradient
                RoundedRectangle(cornerRadius: 0)
                    .fill(Color.black.opacity(0.15))
            }

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
                        withAnimation(.smooth(duration: 0.4)) {
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
    let namespace: Namespace.ID

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
    
    private var isToday: Bool {
        Calendar.current.isDateInToday(date)
    }

    var body: some View {
        VStack(spacing: 10) {
            // Weekday abbreviation
            Text(weekdayName)
                .font(.system(size: 11, weight: .medium, design: .rounded))
                .foregroundStyle(.secondary)

            // Day number with emphasis on today
            Text(dayNumber)
                .font(.system(size: 18, weight: isSelected ? .bold : (isToday ? .semibold : .regular), design: .rounded))
                .foregroundStyle(isSelected ? .white : (isToday ? .primary : .secondary))
                .contentTransition(.numericText())

            // Provider dots with glass effect
            if !episodes.isEmpty {
                HStack(spacing: 3) {
                    ForEach(Array(episodes.prefix(3).enumerated()), id: \.offset) { _, episode in
                        Circle()
                            .fill(colorForProvider(episode.provider))
                            .frame(width: 5, height: 5)
                            .shadow(color: colorForProvider(episode.provider).opacity(0.5), radius: 2)
                    }
                    
                    if episodes.count > 3 {
                        Text("+\(episodes.count - 3)")
                            .font(.system(size: 8, weight: .semibold))
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal, 6)
                .padding(.vertical, 3)
            } else {
                // Empty spacer to maintain alignment
                Spacer()
                    .frame(height: 14)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .padding(.horizontal, 4)
        .background {
            if isSelected {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(.blue, lineWidth: 2.5)
                    .background {
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(.blue.opacity(0.2))
                    }
                    .matchedGeometryEffect(id: "selectedDate", in: namespace)
            } else if isToday {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(.tertiary, lineWidth: 1)
            }
        }
        .contentShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
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
        VStack(alignment: .leading, spacing: 14) {
            // Date header with modern styling
            Text(formattedDate)
                .font(.system(size: 20, weight: .semibold, design: .rounded))
                .foregroundStyle(.primary)
                .padding(.top, Spacing.sm)
                .padding(.bottom, 4)

            // Episodes or "No episodes" message
            if episodes.isEmpty {
                HStack(spacing: 12) {
                    Image(systemName: "tv.slash")
                        .font(.system(size: 16))
                        .foregroundStyle(.tertiary)
                    
                    Text("No episodes")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, 16)
                .padding(.horizontal, 16)
                .background {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Color.white.opacity(0.03))
                        .overlay {
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .strokeBorder(Color.white.opacity(0.08), lineWidth: 1)
                        }
                }
            } else {
                VStack(spacing: 12) {
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
    
    /// Adjust leading padding based on provider to compensate for internal asset padding
    private var logoLeadingPadding: CGFloat {
        let serviceName = episode.provider.name.lowercased()
        
        // Netflix logo needs to shift left to align properly
        if serviceName.contains("netflix") {
            return -8
        }
        
        // Other logos align well naturally
        return 0
    }

    var body: some View {
        VStack(spacing: 0) {
            // Main card content
            HStack(alignment: .top, spacing: 14) {
                // LEFT: Show poster with smooth size transition
                PosterView(
                    posterPath: episode.show.posterPath,
                    isExpanded: isExpanded
                )

                // RIGHT: Episode info
                VStack(alignment: .leading, spacing: 6) {
                    // Show title
                    Text(episode.show.title)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(.primary)
                        .lineLimit(2)

                    // Episode identifier
                    Text("\(episode.episodeIdentifier) - \(episode.episodeTitle)")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.secondary)
                        .lineLimit(isExpanded ? 3 : 2)

                    Spacer(minLength: 0)
                    
                    // Provider badge at bottom
                    HStack(spacing: 8) {
                        GlowingServiceLogoView(
                            service: convertProviderToService(),
                            baseSize: isExpanded ? 48 : 36,
                            dynamicScale: 1.0,
                            style: .card
                        )
                        .frame(width: isExpanded ? 48 : 36, height: isExpanded ? 48 : 36, alignment: .leading)
                        .padding(.leading, logoLeadingPadding)
                        
                        Spacer()
                        
                        // Expand indicator
                        Image(systemName: isExpanded ? "chevron.up.circle.fill" : "chevron.down.circle")
                            .font(.system(size: 20))
                            .foregroundStyle(.tertiary)
                            .contentTransition(.symbolEffect(.replace))
                    }
                }
                .frame(maxWidth: .infinity, alignment: .topLeading)
            }
            .padding(14)

            // EXPANDED: Additional details
            if isExpanded {
                VStack(alignment: .leading, spacing: 12) {
                    Divider()
                        .padding(.horizontal, 14)
                    
                    // Synopsis
                    Text(episode.synopsis)
                        .font(.system(size: 14))
                        .foregroundStyle(episode.synopsis.starts(with: "Synopsis not yet available") || episode.synopsis.starts(with: "No description") ? .secondary : .primary)
                        .italic(episode.synopsis.starts(with: "Synopsis not yet available") || episode.synopsis.starts(with: "No description"))
                        .multilineTextAlignment(.leading)
                        .padding(.horizontal, 14)

                    // Metadata badges
                    HStack(spacing: 10) {
                        // Cost per episode
                        if let cost = episode.costPerEpisode {
                            MetadataBadge(
                                icon: "dollarsign.circle.fill",
                                text: String(format: "%.2f", cost),
                                color: .green
                            )
                        }

                        // Duration
                        MetadataBadge(
                            icon: "clock.fill",
                            text: "\(episode.runtime)m",
                            color: .blue
                        )

                        Spacer()

                        // Reddit discussion
                        Button {
                            // TODO: Link to Reddit discussion
                            print("Reddit discussion tapped for \(episode.show.title) \(episode.episodeIdentifier)")
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "bubble.left.and.bubble.right.fill")
                                    .font(.system(size: 12))
                                Text("1.1K+")
                                    .font(.system(size: 13, weight: .semibold))
                            }
                            .foregroundStyle(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background {
                                Capsule()
                                    .fill(.orange)
                                    .shadow(color: .orange.opacity(0.3), radius: 4, x: 0, y: 2)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 14)
                    .padding(.bottom, 10)
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .background {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color.white.opacity(0.05))
                .shadow(color: .black.opacity(0.2), radius: 10, x: 0, y: 4)
        }
        .overlay {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(.white.opacity(0.12), lineWidth: 1)
        }
        .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .onTapGesture {
            withAnimation(.smooth(duration: 0.35)) {
                isExpanded.toggle()
            }
        }
    }
}

// MARK: - Supporting Views

private struct PosterView: View {
    let posterPath: String?
    let isExpanded: Bool
    
    var body: some View {
        Group {
            if let posterPath = posterPath,
               let url = URL(string: "https://image.tmdb.org/t/p/w200\(posterPath)") {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(.quaternary)
                }
            } else {
                Rectangle()
                    .fill(.quaternary)
                    .overlay {
                        Image(systemName: "tv")
                            .font(.system(size: 20))
                            .foregroundStyle(.tertiary)
                    }
            }
        }
        .frame(
            width: isExpanded ? 90 : 60,
            height: isExpanded ? 135 : 90
        )
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)
    }
}

private struct MetadataBadge: View {
    let icon: String
    let text: String
    let color: Color
    
    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: icon)
                .font(.system(size: 12))
            Text(text)
                .font(.system(size: 13, weight: .semibold))
        }
        .foregroundStyle(color)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background {
            Capsule()
                .fill(color.opacity(0.15))
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Week Calendar with Episodes") {
    @Previewable @State var episodes: [CalendarEpisode] = [
        // Netflix
        CalendarEpisode(
            id: "preview-netflix",
            show: Show(
                id: "show-1",
                tmdbId: 66732,
                title: "Stranger Things",
                overview: "A group of friends uncover supernatural mysteries...",
                posterPath: "/x2LSRK2Cm7MZhjluni1msVJ3wDF.jpg",
                firstAirDate: "2016-07-15",
                status: "Returning Series",
                totalSeasons: 5,
                totalEpisodes: 42
            ),
            seasonNumber: 5,
            episode: Episode(
                episodeNumber: 3,
                name: "The Aftermath",
                airDate: "2025-10-24",
                overview: "Max faces a difficult choice as the Mind Flayer's influence spreads throughout Hawkins...",
                runtime: 52,
                stillPath: nil
            ),
            provider: StreamingProvider(
                id: 8,
                name: "Netflix",
                logoPath: "/9A1JSVmSxsyaBK4SUFsYVqbAYfW.jpg"
            ),
            airDate: Date(),
            recurringDay: 15,
            providerColor: CodableColor(from: .red),
            costPerEpisode: 3.12
        ),
        // Disney+
        CalendarEpisode(
            id: "preview-disney",
            show: Show(
                id: "show-2",
                tmdbId: 82856,
                title: "The Mandalorian",
                overview: "A lone bounty hunter travels the outer reaches...",
                posterPath: "/eU1i6eHXlzMOlEq0ku1Rzq7Y4wA.jpg",
                firstAirDate: "2019-11-12",
                status: "Returning Series",
                totalSeasons: 4,
                totalEpisodes: 32
            ),
            seasonNumber: 4,
            episode: Episode(
                episodeNumber: 1,
                name: "A New Beginning",
                airDate: "2025-10-24",
                overview: "Mando takes on a dangerous mission that leads him to an uncharted sector...",
                runtime: 45,
                stillPath: nil
            ),
            provider: StreamingProvider(
                id: 337,
                name: "Disney Plus",
                logoPath: "/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg"
            ),
            airDate: Date(),
            recurringDay: 3,
            providerColor: CodableColor(from: Color(red: 0.0, green: 0.3, blue: 0.6)),
            costPerEpisode: 2.50
        ),
        // HBO Max
        CalendarEpisode(
            id: "preview-max",
            show: Show(
                id: "show-3",
                tmdbId: 94997,
                title: "House of the Dragon",
                overview: "The Targaryen civil war unfolds...",
                posterPath: "/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg",
                firstAirDate: "2022-08-21",
                status: "Returning Series",
                totalSeasons: 3,
                totalEpisodes: 24
            ),
            seasonNumber: 3,
            episode: Episode(
                episodeNumber: 8,
                name: "Fire and Blood",
                airDate: "2025-10-24",
                overview: "The battle reaches its peak as the dragons clash over King's Landing...",
                runtime: 68,
                stillPath: nil
            ),
            provider: StreamingProvider(
                id: 384,
                name: "Max",
                logoPath: "/zxrVdFjIjLqkfnwyghnfywTn3Lh.jpg"
            ),
            airDate: Date(),
            recurringDay: 21,
            providerColor: CodableColor(from: .purple),
            costPerEpisode: 4.16
        ),
        // Prime Video
        CalendarEpisode(
            id: "preview-prime",
            show: Show(
                id: "show-4",
                tmdbId: 84958,
                title: "The Lord of the Rings: The Rings of Power",
                overview: "Epic tales from the Second Age of Middle-earth...",
                posterPath: "/mYLOqiStMxDK3fYZFirgrMt8z5d.jpg",
                firstAirDate: "2022-09-01",
                status: "Returning Series",
                totalSeasons: 2,
                totalEpisodes: 16
            ),
            seasonNumber: 2,
            episode: Episode(
                episodeNumber: 5,
                name: "The Forge",
                airDate: "2025-10-24",
                overview: "The forging of the rings begins as dark forces gather...",
                runtime: 65,
                stillPath: nil
            ),
            provider: StreamingProvider(
                id: 9,
                name: "Prime Video",
                logoPath: "/emthp39XA2YScoYL1p0sdbAH2WA.jpg"
            ),
            airDate: Date(),
            recurringDay: 10,
            providerColor: CodableColor(from: .blue),
            costPerEpisode: 2.99
        ),
        // Apple TV+
        CalendarEpisode(
            id: "preview-apple",
            show: Show(
                id: "show-5",
                tmdbId: 93405,
                title: "Severance",
                overview: "Workers undergo a procedure that splits their consciousness...",
                posterPath: "/oTJXGbvngLMnIrv8M3yxG0mVqZL.jpg",
                firstAirDate: "2022-02-18",
                status: "Returning Series",
                totalSeasons: 2,
                totalEpisodes: 18
            ),
            seasonNumber: 2,
            episode: Episode(
                episodeNumber: 4,
                name: "The We We Are",
                airDate: "2025-10-24",
                overview: "Mark discovers a shocking truth about his severance procedure...",
                runtime: 48,
                stillPath: nil
            ),
            provider: StreamingProvider(
                id: 350,
                name: "Apple TV Plus",
                logoPath: "/2E03IAZsX4ZaUqM7tXlctEPMGWS.jpg"
            ),
            airDate: Date(),
            recurringDay: 5,
            providerColor: CodableColor(from: .gray),
            costPerEpisode: 1.99
        ),
        // Crunchyroll
        CalendarEpisode(
            id: "preview-crunchyroll",
            show: Show(
                id: "show-6",
                tmdbId: 85937,
                title: "Demon Slayer",
                overview: "A young boy's quest to become a demon slayer...",
                posterPath: "/npdB6eFzizki0WaZ1OvKcJrWe97.jpg",
                firstAirDate: "2019-04-06",
                status: "Returning Series",
                totalSeasons: 4,
                totalEpisodes: 55
            ),
            seasonNumber: 4,
            episode: Episode(
                episodeNumber: 12,
                name: "The Final Blow",
                airDate: "2025-10-24",
                overview: "Tanjiro faces his greatest challenge yet in an epic showdown...",
                runtime: 24,
                stillPath: nil
            ),
            provider: StreamingProvider(
                id: 283,
                name: "Crunchyroll",
                logoPath: "/8I1XqWhR6QEJ4ASkK2ri6O0aN3m.jpg"
            ),
            airDate: Date(),
            recurringDay: 8,
            providerColor: CodableColor(from: .orange),
            costPerEpisode: 1.50
        )
    ]
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
