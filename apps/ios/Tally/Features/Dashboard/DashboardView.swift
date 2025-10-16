
//
//  DashboardView.swift
//  Tally
//
//  Main dashboard view composing hero, summary cards, and subscription list
//

import SwiftUI

struct DashboardView: View {
    @ObservedObject var api: ApiClient
    @State private var viewModel = DashboardViewModel()
    @State private var selectedDate: Date?
    @State private var showEpisodeSheet = false
    @State private var selectedDetent: PresentationDetent = .medium

    var body: some View {
        ZStack {
            Color.background
                .ignoresSafeArea()

            if viewModel.isLoading {
                loadingView
            } else if let error = viewModel.error {
                errorView(message: error)
            } else if viewModel.subscriptions.isEmpty {
                emptyView
            } else {
                contentView
            }

            // CRT overlay across entire dashboard
            CRTOverlayView()
                .ignoresSafeArea()
        }
        .navigationTitle("Dashboard")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.load(api: api)
            await viewModel.loadUpcomingEpisodes(api: api)
        }
        .refreshable {
            await viewModel.refresh(api: api)
        }
        .sheet(isPresented: $showEpisodeSheet) {
            if let date = selectedDate {
                EpisodeSheet(
                    date: date,
                    episodes: viewModel.episodesForDate(date),
                    isLoading: viewModel.isLoadingEpisodes,
                    isPresented: $showEpisodeSheet
                )
                .presentationDetents([.medium, .large], selection: $selectedDetent)
                .presentationDragIndicator(.visible)
                .presentationBackgroundInteraction(.enabled(upThrough: .medium))
            }
        }
        .onChange(of: showEpisodeSheet) { oldValue, newValue in
            if newValue {
                print("📊 [DashboardView] Sheet opened")
                print("   - isLoadingEpisodes: \(viewModel.isLoadingEpisodes)")
                print("   - episodes count: \(viewModel.episodesForDate(selectedDate ?? Date()).count)")
                print("   - selectedDetent: \(selectedDetent)")
                // Reset to medium detent when opening
                selectedDetent = .medium
            } else {
                print("📊 [DashboardView] Sheet closed")
            }
        }
        .onChange(of: selectedDetent) { oldValue, newValue in
            print("📊 [DashboardView] Detent changed: \(oldValue) -> \(newValue)")
        }
    }

    // MARK: - Content View

    private var contentView: some View {
        VStack(spacing: 0) {
            // Fixed Header: Hero section with scattered logos (will animate later)
            HeroSection(services: viewModel.uniqueServices)
                .frame(height: 300)
                .ignoresSafeArea(edges: .horizontal)

            // Fixed Header: Metrics row
            MetricsRow(
                subscriptionsCount: viewModel.totalActiveSubscriptions,
                showsCount: viewModel.totalShows,
                monthlyTotal: viewModel.formattedMonthlyCost
            )
            .background(Color.background)

            // Paginated Content: Subscriptions & Calendar Week View
            TabView {
                // Page 1: Subscriptions List
                DashboardPageView(subscriptions: viewModel.activeSubscriptions)
                    .tag(0)

                // Page 2: Calendar Week View
                WeekCalendarView(
                    episodes: $viewModel.upcomingEpisodes,
                    selectedDate: $selectedDate,
                    showSheet: $showEpisodeSheet
                )
                .tag(1)
            }
            .tabViewStyle(.page)
            .indexViewStyle(.page(backgroundDisplayMode: .always))
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: Spacing.lg) {
            ProgressView()
                .scaleEffect(1.5)

            Text("Loading dashboard...")
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
        }
    }

    // MARK: - Error View

    private func errorView(message: String) -> some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundColor(.error)

            Text("Error")
                .font(.heading1)
                .foregroundColor(.textPrimary)

            Text(message)
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.xxxl)

            Button {
                Task {
                    await viewModel.refresh(api: api)
                }
            } label: {
                Text("Try Again")
                    .font(.labelLarge)
                    .foregroundColor(.white)
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, Spacing.md)
                    .background(Color.tallyPrimary)
                    .cornerRadius(Spacing.buttonCornerRadius)
            }
        }
        .padding()
    }

    // MARK: - Empty View

    private var emptyView: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "tv.slash")
                .font(.system(size: 64))
                .foregroundColor(.textTertiary)

            Text("No Subscriptions")
                .font(.heading1)
                .foregroundColor(.textPrimary)

            Text("Add your first streaming subscription to get started tracking your entertainment costs.")
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.xxxl)

            Button {
                // TODO: Navigate to add subscription flow
            } label: {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "plus.circle.fill")
                    Text("Add Subscription")
                }
                .font(.labelLarge)
                .foregroundColor(.white)
                .padding(.horizontal, Spacing.xl)
                .padding(.vertical, Spacing.md)
                .background(Color.tallyPrimary)
                .cornerRadius(Spacing.buttonCornerRadius)
            }
        }
        .padding()
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Dashboard with data") {
    NavigationStack {
        DashboardView(api: PreviewApiClient())
            .onAppear {
                // Simulate loaded state
            }
    }
}

#Preview("Dashboard loading") {
    NavigationStack {
        DashboardView(api: PreviewApiClient())
    }
}

#Preview("Dashboard empty") {
    NavigationStack {
        DashboardView(api: PreviewApiClient())
    }
}

#Preview("Dashboard error") {
    NavigationStack {
        DashboardView(api: PreviewApiClient())
    }
}
#endif
