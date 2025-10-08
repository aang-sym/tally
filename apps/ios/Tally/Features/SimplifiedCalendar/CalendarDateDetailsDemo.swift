//
//  CalendarDateDetailsDemo.swift
//  Tally
//
//  Demo of expandable date details bottom sheet design
//  This is a throwaway file for design exploration - not production code
//

import SwiftUI

// MARK: - Mock Data Models

struct MockEpisode: Identifiable {
    let id = UUID()
    let showTitle: String
    let providerName: String
    let providerLogo: String
    let seasonNumber: Int
    let episodeNumber: Int
    let episodeTitle: String
    let synopsis: String
    let runtime: Int
    let posterPath: String?
    let airDate: String
}

// MARK: - Episode Detail Card

struct EpisodeDetailCard: View {
    let episode: MockEpisode
    @State private var isWatched = false
    @State private var reminderSet = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with provider and show
            HStack(spacing: 12) {
                // Provider logo
                Circle()
                    .fill(providerColor)
                    .frame(width: 40, height: 40)
                    .overlay {
                        Text(String(episode.providerName.prefix(1)))
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                    }

                VStack(alignment: .leading, spacing: 2) {
                    Text(episode.showTitle)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.primary)

                    Text("Season \(episode.seasonNumber), Episode \(episode.episodeNumber)")
                        .font(.system(size: 13))
                        .foregroundColor(.secondary)
                }

                Spacer()
            }

            // Episode title
            Text(episode.episodeTitle)
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(.primary)

            // Synopsis
            Text(episode.synopsis)
                .font(.system(size: 14))
                .foregroundColor(.secondary)
                .lineLimit(2)

            // Metadata and actions
            HStack(spacing: 16) {
                // Runtime
                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.system(size: 12))
                    Text("\(episode.runtime) min")
                        .font(.system(size: 13))
                }
                .foregroundColor(.secondary)

                Spacer()

                // Remind me button
                Button {
                    reminderSet.toggle()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: reminderSet ? "bell.fill" : "bell")
                            .font(.system(size: 13))
                        Text(reminderSet ? "Reminder set" : "Remind me")
                            .font(.system(size: 13, weight: .medium))
                    }
                    .foregroundColor(reminderSet ? .blue : .primary)
                }

                // Mark watched button
                Button {
                    isWatched.toggle()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: isWatched ? "checkmark.circle.fill" : "circle")
                            .font(.system(size: 13))
                        Text(isWatched ? "Watched" : "Mark watched")
                            .font(.system(size: 13, weight: .medium))
                    }
                    .foregroundColor(isWatched ? .green : .primary)
                }
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    var providerColor: Color {
        switch episode.providerName {
        case "Prime Video": return Color.blue
        case "Disney+": return Color(red: 0.05, green: 0.2, blue: 0.4)
        case "HBO Max": return Color.purple
        case "Crunchyroll": return Color.orange
        case "Netflix": return Color.red
        default: return Color.gray
        }
    }
}

// MARK: - Date Details Sheet

struct DateDetailsSheet: View {
    let date: String
    let episodes: [MockEpisode]
    @Binding var isPresented: Bool

    var body: some View {
        VStack(spacing: 0) {
            // Drag indicator
            RoundedRectangle(cornerRadius: 2.5)
                .fill(Color.secondary.opacity(0.3))
                .frame(width: 36, height: 5)
                .padding(.top, 8)
                .padding(.bottom, 20)

            // Header
            VStack(spacing: 4) {
                Text(date)
                    .font(.system(size: 20, weight: .bold))

                Text("\(episodes.count) episode\(episodes.count == 1 ? "" : "s") airing")
                    .font(.system(size: 15))
                    .foregroundColor(.secondary)
            }
            .padding(.bottom, 20)

            // Episode cards
            ScrollView {
                VStack(spacing: 12) {
                    ForEach(episodes) { episode in
                        EpisodeDetailCard(episode: episode)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }

            // Dismiss button
            Button {
                isPresented = false
            } label: {
                Text("Dismiss")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.blue)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color(.systemBackground))
            }
        }
        .background(Color(.systemGroupedBackground))
    }
}

// MARK: - Simplified Calendar Grid (for demo)

struct CalendarDemoView: View {
    @State private var selectedDate: String?
    @State private var showSheet = false

    let monthDays = [
        (1, []), (2, ["Prime"]), (3, ["Prime", "Disney+", "HBO"]),
        (4, ["HBO"]), (5, ["Crunchyroll"]), (6, []), (7, ["HBO"]),
        (8, []), (9, ["Prime"]), (10, ["Prime"]), (11, ["HBO"]),
        (12, ["Disney+", "Crunchyroll"]), (13, []), (14, ["HBO"])
    ]

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Month header
                Text("SEPTEMBER 2025")
                    .font(.system(size: 18, weight: .bold))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 16)

                // Weekday headers
                HStack(spacing: 0) {
                    ForEach(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"], id: \.self) { day in
                        Text(day)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 8)

                // Calendar grid
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 7), spacing: 8) {
                    ForEach(monthDays, id: \.0) { day, providers in
                        CalendarDateCell(
                            day: day,
                            providers: providers,
                            isSelected: selectedDate == "Sept \(day)"
                        )
                        .onTapGesture {
                            if !providers.isEmpty {
                                selectedDate = "Sept \(day)"
                                showSheet = true
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)

                Spacer()
            }
            .navigationTitle("Calendar")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showSheet) {
                DateDetailsSheet(
                    date: selectedDate ?? "",
                    episodes: mockEpisodes(for: selectedDate ?? ""),
                    isPresented: $showSheet
                )
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.hidden)
            }
        }
    }

    func mockEpisodes(for date: String) -> [MockEpisode] {
        if date == "Sept 3" {
            return [
                MockEpisode(
                    showTitle: "Stranger Things",
                    providerName: "Prime Video",
                    providerLogo: "",
                    seasonNumber: 5,
                    episodeNumber: 3,
                    episodeTitle: "The Aftermath",
                    synopsis: "Max faces a difficult choice as the Mind Flayer's influence spreads throughout Hawkins...",
                    runtime: 52,
                    posterPath: nil,
                    airDate: "Sept 3"
                ),
                MockEpisode(
                    showTitle: "The Mandalorian",
                    providerName: "Disney+",
                    providerLogo: "",
                    seasonNumber: 4,
                    episodeNumber: 1,
                    episodeTitle: "A New Beginning",
                    synopsis: "Mando takes on a dangerous mission that leads him to an uncharted sector...",
                    runtime: 45,
                    posterPath: nil,
                    airDate: "Sept 3"
                ),
                MockEpisode(
                    showTitle: "House of the Dragon",
                    providerName: "HBO Max",
                    providerLogo: "",
                    seasonNumber: 3,
                    episodeNumber: 8,
                    episodeTitle: "Fire and Blood",
                    synopsis: "The battle reaches its peak as the dragons clash over King's Landing...",
                    runtime: 68,
                    posterPath: nil,
                    airDate: "Sept 3"
                )
            ]
        } else if date == "Sept 2" {
            return [
                MockEpisode(
                    showTitle: "Stranger Things",
                    providerName: "Prime Video",
                    providerLogo: "",
                    seasonNumber: 5,
                    episodeNumber: 2,
                    episodeTitle: "The Return",
                    synopsis: "Joyce and Hopper investigate strange occurrences at the old lab...",
                    runtime: 48,
                    posterPath: nil,
                    airDate: "Sept 2"
                )
            ]
        } else {
            return []
        }
    }
}

struct CalendarDateCell: View {
    let day: Int
    let providers: [String]
    let isSelected: Bool

    var body: some View {
        VStack(spacing: 8) {
            Text("\(day)")
                .font(.system(size: 18))
                .foregroundColor(.primary)

            if !providers.isEmpty {
                HStack(spacing: 4) {
                    ForEach(providers.prefix(3), id: \.self) { provider in
                        Circle()
                            .fill(colorFor(provider: provider))
                            .frame(width: 6, height: 6)
                    }
                }
            }
        }
        .frame(height: 60)
        .frame(maxWidth: .infinity)
        .background(isSelected ? Color.blue.opacity(0.1) : Color(.systemBackground))
        .cornerRadius(8)
        .overlay {
            if isSelected {
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.blue, lineWidth: 2)
            }
        }
    }

    func colorFor(provider: String) -> Color {
        switch provider {
        case "Prime": return .blue
        case "Disney+": return Color(red: 0.05, green: 0.2, blue: 0.4)
        case "HBO": return .purple
        case "Crunchyroll": return .orange
        case "Netflix": return .red
        default: return .gray
        }
    }
}

// MARK: - Previews

#Preview("Calendar with Sheet Closed") {
    CalendarDemoView()
}

#Preview("Single Episode Sheet") {
    VStack {
        Spacer()
        DateDetailsSheet(
            date: "Sept 2",
            episodes: [
                MockEpisode(
                    showTitle: "Stranger Things",
                    providerName: "Prime Video",
                    providerLogo: "",
                    seasonNumber: 5,
                    episodeNumber: 2,
                    episodeTitle: "The Return",
                    synopsis: "Joyce and Hopper investigate strange occurrences at the old lab...",
                    runtime: 48,
                    posterPath: nil,
                    airDate: "Sept 2"
                )
            ],
            isPresented: .constant(true)
        )
        .frame(height: 400)
    }
    .background(Color.black.opacity(0.3))
}

#Preview("Three Episodes Sheet") {
    VStack {
        Spacer()
        DateDetailsSheet(
            date: "Sept 3",
            episodes: [
                MockEpisode(
                    showTitle: "Stranger Things",
                    providerName: "Prime Video",
                    providerLogo: "",
                    seasonNumber: 5,
                    episodeNumber: 3,
                    episodeTitle: "The Aftermath",
                    synopsis: "Max faces a difficult choice as the Mind Flayer's influence spreads throughout Hawkins...",
                    runtime: 52,
                    posterPath: nil,
                    airDate: "Sept 3"
                ),
                MockEpisode(
                    showTitle: "The Mandalorian",
                    providerName: "Disney+",
                    providerLogo: "",
                    seasonNumber: 4,
                    episodeNumber: 1,
                    episodeTitle: "A New Beginning",
                    synopsis: "Mando takes on a dangerous mission that leads him to an uncharted sector...",
                    runtime: 45,
                    posterPath: nil,
                    airDate: "Sept 3"
                ),
                MockEpisode(
                    showTitle: "House of the Dragon",
                    providerName: "HBO Max",
                    providerLogo: "",
                    seasonNumber: 3,
                    episodeNumber: 8,
                    episodeTitle: "Fire and Blood",
                    synopsis: "The battle reaches its peak as the dragons clash over King's Landing...",
                    runtime: 68,
                    posterPath: nil,
                    airDate: "Sept 3"
                )
            ],
            isPresented: .constant(true)
        )
        .frame(height: 600)
    }
    .background(Color.black.opacity(0.3))
}

#Preview("Many Episodes Sheet (Scrollable)") {
    VStack {
        Spacer()
        DateDetailsSheet(
            date: "Sept 15",
            episodes: [
                MockEpisode(
                    showTitle: "Stranger Things",
                    providerName: "Prime Video",
                    providerLogo: "",
                    seasonNumber: 5,
                    episodeNumber: 3,
                    episodeTitle: "The Aftermath",
                    synopsis: "Max faces a difficult choice as the Mind Flayer's influence spreads...",
                    runtime: 52,
                    posterPath: nil,
                    airDate: "Sept 15"
                ),
                MockEpisode(
                    showTitle: "The Mandalorian",
                    providerName: "Disney+",
                    providerLogo: "",
                    seasonNumber: 4,
                    episodeNumber: 1,
                    episodeTitle: "A New Beginning",
                    synopsis: "Mando takes on a dangerous mission...",
                    runtime: 45,
                    posterPath: nil,
                    airDate: "Sept 15"
                ),
                MockEpisode(
                    showTitle: "House of the Dragon",
                    providerName: "HBO Max",
                    providerLogo: "",
                    seasonNumber: 3,
                    episodeNumber: 8,
                    episodeTitle: "Fire and Blood",
                    synopsis: "The battle reaches its peak...",
                    runtime: 68,
                    posterPath: nil,
                    airDate: "Sept 15"
                ),
                MockEpisode(
                    showTitle: "One Piece",
                    providerName: "Crunchyroll",
                    providerLogo: "",
                    seasonNumber: 1,
                    episodeNumber: 1087,
                    episodeTitle: "The Final Battle Begins",
                    synopsis: "Luffy faces Kaido in an epic showdown...",
                    runtime: 24,
                    posterPath: nil,
                    airDate: "Sept 15"
                ),
                MockEpisode(
                    showTitle: "Demon Slayer",
                    providerName: "Crunchyroll",
                    providerLogo: "",
                    seasonNumber: 4,
                    episodeNumber: 12,
                    episodeTitle: "Hashira Training",
                    synopsis: "Tanjiro continues his intense training...",
                    runtime: 24,
                    posterPath: nil,
                    airDate: "Sept 15"
                ),
                MockEpisode(
                    showTitle: "The Witcher",
                    providerName: "Netflix",
                    providerLogo: "",
                    seasonNumber: 4,
                    episodeNumber: 3,
                    episodeTitle: "The Wild Hunt",
                    synopsis: "Geralt encounters the legendary Wild Hunt...",
                    runtime: 58,
                    posterPath: nil,
                    airDate: "Sept 15"
                )
            ],
            isPresented: .constant(true)
        )
        .frame(height: 650)
    }
    .background(Color.black.opacity(0.3))
}

#Preview("Episode Detail Card") {
    VStack {
        EpisodeDetailCard(
            episode: MockEpisode(
                showTitle: "Stranger Things",
                providerName: "Prime Video",
                providerLogo: "",
                seasonNumber: 5,
                episodeNumber: 3,
                episodeTitle: "The Aftermath",
                synopsis: "Max faces a difficult choice as the Mind Flayer's influence spreads throughout Hawkins. The party must decide whether to trust a mysterious ally.",
                runtime: 52,
                posterPath: nil,
                airDate: "Sept 3"
            )
        )
        .padding()

        Spacer()
    }
    .background(Color(.systemGroupedBackground))
}
