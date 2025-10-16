//
//  DashboardSearchResults.swift
//  Tally
//
//  Search results overlay for dashboard with liquid glass styling
//

import SwiftUI

struct DashboardSearchResults: View {
    @ObservedObject var viewModel: SearchViewModel
    let onDismiss: () -> Void
    @State private var expandedShow: Show?

    var body: some View {
        VStack(spacing: 0) {
            // Results container
            if viewModel.isLoading {
                loadingView
            } else if let errorMessage = viewModel.error {
                errorView(message: errorMessage)
            } else if viewModel.results.isEmpty && !viewModel.query.isEmpty {
                emptyResultsView
            } else if viewModel.results.isEmpty {
                emptyStateView
            } else {
                resultsScrollView
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 16) {
            Spacer()

            ProgressView()
                .scaleEffect(1.5)

            Text("Searching...")
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)

            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Error View

    private func errorView(message: String) -> some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 40))
                .foregroundColor(.error)

            Text(message)
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.xl)

            Button("Dismiss") {
                viewModel.clearError()
                onDismiss()
            }
            .font(.labelLarge)
            .foregroundColor(.white)
            .padding(.horizontal, Spacing.xl)
            .padding(.vertical, Spacing.md)
            .background(Color.tallyPrimary)
            .cornerRadius(Spacing.buttonCornerRadius)

            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Empty Results View

    private var emptyResultsView: some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "magnifyingglass")
                .font(.system(size: 40))
                .foregroundColor(.textSecondary)

            Text("No results found")
                .font(.heading2)
                .foregroundColor(.textPrimary)

            Text("Try searching for a different show")
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)

            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Empty State View

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "tv")
                .font(.system(size: 40))
                .foregroundColor(.textSecondary)

            Text("Search for Shows")
                .font(.heading2)
                .foregroundColor(.textPrimary)

            Text("Enter a show name to find and add to your watchlist")
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.xl)

            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Results Scroll View

    private var resultsScrollView: some View {
        ScrollView {
            VStack(spacing: Spacing.cardSpacing) {
                ForEach(viewModel.results) { show in
                    SearchResultCard(
                        show: show,
                        viewModel: viewModel,
                        onTap: { expandedShow = show }
                    )
                }
            }
            .screenPadding()
            .padding(.top, Spacing.md)
            .padding(.bottom, Spacing.xxxl)
        }
        .sheet(item: $expandedShow) { show in
            ShowDetailSheet(show: show, viewModel: viewModel)
        }
    }
}

// MARK: - Search Result Card

private struct SearchResultCard: View {
    let show: Show
    @ObservedObject var viewModel: SearchViewModel
    let onTap: () -> Void

    private var posterURL: URL? {
        guard let path = show.posterPath, !path.isEmpty else { return nil }
        return URL(string: path)
    }

    private var releaseYear: String? {
        guard let dateString = show.firstAirDate,
              dateString.count >= 4 else { return nil }
        return String(dateString.prefix(4))
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Poster image
            if let url = posterURL {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .overlay {
                            Image(systemName: "tv")
                                .foregroundColor(.textSecondary)
                        }
                }
                .frame(width: 60, height: 90)
                .cornerRadius(8)
            } else {
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .overlay {
                        Image(systemName: "tv")
                            .foregroundColor(.textSecondary)
                    }
                    .frame(width: 60, height: 90)
                    .cornerRadius(8)
            }

            // Show details
            VStack(alignment: .leading, spacing: 6) {
                Text(show.title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.textPrimary)
                    .lineLimit(2)

                if let year = releaseYear {
                    Text(year)
                        .font(.bodyMedium)
                        .foregroundColor(.textSecondary)
                }

                Spacer()

                // Add to watchlist button
                Button(action: {
                    Task {
                        await viewModel.addToWatchlist(api: viewModel.api!, show: show)
                    }
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 14))
                        Text("Add to Watchlist")
                            .font(.system(size: 13, weight: .medium))
                    }
                    .foregroundColor(.tallyPrimary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.tallyPrimary.opacity(0.15))
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .padding(12)
        .glassEffect(.clear, in: .rect(cornerRadius: 12))
        .onTapGesture {
            onTap()
        }
    }
}

// MARK: - Show Detail Sheet

private struct ShowDetailSheet: View {
    let show: Show
    @ObservedObject var viewModel: SearchViewModel
    @Environment(\.dismiss) private var dismiss

    private var posterURL: URL? {
        guard let path = show.posterPath, !path.isEmpty else { return nil }
        return URL(string: path)
    }

    private var releaseYear: String? {
        guard let dateString = show.firstAirDate,
              dateString.count >= 4 else { return nil }
        return String(dateString.prefix(4))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    // Poster and basic info
                    HStack(alignment: .top, spacing: 16) {
                        if let url = posterURL {
                            AsyncImage(url: url) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Rectangle()
                                    .fill(Color.gray.opacity(0.3))
                                    .overlay {
                                        Image(systemName: "tv")
                                            .foregroundColor(.textSecondary)
                                    }
                            }
                            .frame(width: 120, height: 180)
                            .cornerRadius(12)
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Text(show.title)
                                .font(.heading2)
                                .foregroundColor(.textPrimary)

                            if let year = releaseYear {
                                Text(year)
                                    .font(.bodyLarge)
                                    .foregroundColor(.textSecondary)
                            }

                            if let seasons = show.totalSeasons, seasons > 0 {
                                Text("\(seasons) Season\(seasons == 1 ? "" : "s")")
                                    .font(.bodyMedium)
                                    .foregroundColor(.textSecondary)
                            }

                            Spacer()

                            // Add to watchlist button
                            Button(action: {
                                Task {
                                    await viewModel.addToWatchlist(api: viewModel.api!, show: show)
                                    dismiss()
                                }
                            }) {
                                HStack(spacing: 6) {
                                    Image(systemName: "plus.circle.fill")
                                    Text("Add to Watchlist")
                                }
                                .font(.labelLarge)
                                .foregroundColor(.white)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(Color.tallyPrimary)
                                .cornerRadius(10)
                            }
                        }
                    }

                    // Overview
                    if let overview = show.overview, !overview.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Overview")
                                .font(.heading3)
                                .foregroundColor(.textPrimary)

                            Text(overview)
                                .font(.bodyMedium)
                                .foregroundColor(.textSecondary)
                                .lineSpacing(4)
                        }
                    }
                }
                .padding()
            }
            .background(Color.background)
            .navigationTitle("Show Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Search Results with Data") {
    let viewModel = SearchViewModel()

    // Mock some results
    viewModel.results = [
        Show(
            id: "1",
            tmdbId: 1,
            title: "Breaking Bad",
            overview: "A high school chemistry teacher turned methamphetamine producer partners with a former student.",
            posterPath: "https://image.tmdb.org/t/p/w200/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
            firstAirDate: "2008-01-20",
            status: nil,
            totalSeasons: 5,
            totalEpisodes: 62
        ),
        Show(
            id: "2",
            tmdbId: 2,
            title: "Game of Thrones",
            overview: "Nine noble families fight for control over the lands of Westeros.",
            posterPath: "https://image.tmdb.org/t/p/w200/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg",
            firstAirDate: "2011-04-17",
            status: nil,
            totalSeasons: 8,
            totalEpisodes: 73
        )
    ]

    return ZStack {
        Color.background
            .ignoresSafeArea()

        DashboardSearchResults(
            viewModel: viewModel,
            onDismiss: {}
        )
    }
}

#Preview("Search Results Loading") {
    let viewModel = SearchViewModel()
    viewModel.isLoading = true

    return ZStack {
        Color.background
            .ignoresSafeArea()

        DashboardSearchResults(
            viewModel: viewModel,
            onDismiss: {}
        )
    }
}

#Preview("Search Results Empty") {
    let viewModel = SearchViewModel()
    viewModel.query = "asdfasdfasdf"

    return ZStack {
        Color.background
            .ignoresSafeArea()

        DashboardSearchResults(
            viewModel: viewModel,
            onDismiss: {}
        )
    }
}
#endif
