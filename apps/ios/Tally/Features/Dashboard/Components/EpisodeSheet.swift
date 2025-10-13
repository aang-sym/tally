//
//  EpisodeSheet.swift
//  Tally
//
//  Bottom sheet showing episode details for a selected date
//  Displays episodes airing on that date with provider info and actions
//

import SwiftUI

struct EpisodeSheet: View {
    let date: Date
    let episodes: [CalendarEpisode]
    let isLoading: Bool
    @Binding var isPresented: Bool

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Drag indicator
            RoundedRectangle(cornerRadius: 2.5)
                .fill(Color.textTertiary.opacity(0.3))
                .frame(width: 36, height: 5)
                .padding(.top, 8)
                .padding(.bottom, 20)

            // Header
            VStack(spacing: 4) {
                Text(formattedDate)
                    .font(.heading1)
                    .foregroundColor(.textPrimary)

                if isLoading {
                    Text("Loading episodes...")
                        .font(.bodyMedium)
                        .foregroundColor(.textSecondary)
                } else {
                    Text("\(episodes.count) episode\(episodes.count == 1 ? "" : "s") airing")
                        .font(.bodyMedium)
                        .foregroundColor(.textSecondary)
                }
            }
            .padding(.bottom, 20)

            // Episode cards or loading indicator
            if isLoading {
                VStack(spacing: 12) {
                    ProgressView()
                        .scaleEffect(1.2)
                        .tint(.textPrimary)
                    Text("Fetching episodes...")
                        .font(.bodySmall)
                        .foregroundColor(.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 200)
                .padding(.vertical, 40)
            } else if episodes.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "tv.slash")
                        .font(.system(size: 48))
                        .foregroundColor(.textTertiary)
                    Text("No episodes airing")
                        .font(.bodyMedium)
                        .foregroundColor(.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 200)
                .padding(.vertical, 40)
            } else {
                ScrollView {
                    VStack(spacing: Spacing.md) {
                        ForEach(episodes) { episode in
                            EpisodeCard(episode: episode)
                        }
                    }
                    .padding(.bottom, 32)
                }
            }
        }
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top) // Fill available space
        .background(
            GeometryReader { geometry in
                Color.clear.onAppear {
                    print("📐 [EpisodeSheet] Initial geometry size: \(geometry.size)")
                }
                .onChange(of: geometry.size) { oldValue, newValue in
                    print("📐 [EpisodeSheet] Geometry changed: \(oldValue) -> \(newValue)")
                }
            }
        )
        .presentationBackground(.ultraThinMaterial)
        .onAppear {
            print("📋 [EpisodeSheet] Sheet appeared")
            print("   - date: \(formattedDate)")
            print("   - isLoading: \(isLoading)")
            print("   - episodes count: \(episodes.count)")
        }
    }
}

// MARK: - Episode Card (SimplifiedCalendar Style)

private struct EpisodeCard: View {
    let episode: CalendarEpisode
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
                // LEFT: Show poster (80x120)
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
                    .frame(width: 80, height: 120)
                    .cornerRadius(8)
                } else {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 80, height: 120)
                        .cornerRadius(8)
                }

                // RIGHT: Episode info
                VStack(alignment: .leading, spacing: 6) {
                    Text(episode.show.title)
                        .font(.system(size: 16, weight: .semibold))
                        .lineLimit(1)

                    Text("\(episode.episodeIdentifier) - \(episode.episodeTitle)")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.secondary)
                        .lineLimit(1)

                    Text(episode.synopsis)
                        .font(.system(size: 13))
                        .italic(episode.synopsis.starts(with: "Synopsis not yet available") || episode.synopsis.starts(with: "No description"))
                        .foregroundColor(episode.synopsis.starts(with: "Synopsis not yet available") || episode.synopsis.starts(with: "No description") ? .secondary : .primary)
                        .multilineTextAlignment(.leading)
                        .padding(.top, 4)

                    Spacer()

                    // BOTTOM: Cost + Duration + Reddit badges
                    HStack(spacing: 8) {
                        // Cost per episode
                        if let cost = episode.costPerEpisode {
                            HStack(spacing: 4) {
                                Image(systemName: "dollarsign.circle.fill")
                                    .font(.system(size: 14))
                                Text(String(format: "%.2f", cost))
                                    .font(.system(size: 12, weight: .medium))
                            }
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
                    }
                }
                .frame(maxWidth: .infinity, alignment: .topLeading)
            }
            .padding(12)

            // TOP-RIGHT: Provider pill badge
            if let providerColor = episode.providerColor,
               let recurringDay = episode.recurringDay,
               let logoPath = episode.provider.logoPath {
                VStack(spacing: 4) {
                    Button(action: {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            showRenewsLabel.toggle()
                        }
                    }) {
                        HStack(spacing: 6) {
                            // Provider logo
                            if let url = URL(string: logoPath) {
                                ProviderLogoView(
                                    url: url,
                                    size: 20,
                                    fallbackColor: .gray
                                )
                            }

                            // Recurring day
                            Text(ordinalDay(recurringDay))
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(providerColor.color)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(providerColor.color.opacity(0.15))
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
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .glassEffect(.regular, in: .rect(cornerRadius: 12))
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Episode Sheet - Single Episode") {
    VStack {
        Spacer()
        EpisodeSheet(
            date: Date(),
            episodes: [CalendarEpisode.preview],
            isLoading: false,
            isPresented: .constant(true)
        )
        .frame(height: 400)
    }
    .background(Color.black.opacity(0.3))
}

#Preview("Episode Sheet - Multiple Episodes") {
    VStack {
        Spacer()
        EpisodeSheet(
            date: Date(),
            episodes: CalendarEpisode.previews,
            isLoading: false,
            isPresented: .constant(true)
        )
        .frame(height: 600)
    }
    .background(Color.black.opacity(0.3))
}

#Preview("Episode Sheet - Loading") {
    VStack {
        Spacer()
        EpisodeSheet(
            date: Date(),
            episodes: [],
            isLoading: true,
            isPresented: .constant(true)
        )
        .frame(height: 400)
    }
    .background(Color.black.opacity(0.3))
}

#Preview("Episode Sheet - Empty") {
    VStack {
        Spacer()
        EpisodeSheet(
            date: Date(),
            episodes: [],
            isLoading: false,
            isPresented: .constant(true)
        )
        .frame(height: 400)
    }
    .background(Color.black.opacity(0.3))
}

#Preview("Episode Card") {
    VStack {
        EpisodeCard(episode: CalendarEpisode.preview)
            .padding()

        Spacer()
    }
    .background(Color.background)
}
#endif
