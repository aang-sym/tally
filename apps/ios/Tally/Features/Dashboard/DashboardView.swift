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
    @StateObject private var logoCollisionManager = LogoCollisionManager()
    @State private var stableServices: [StreamingService] = []

    // Search state
    @State private var searchQuery = ""
    @State private var isSearchActive = false
    @StateObject private var searchViewModel = SearchViewModel()

    // Page tracking for custom page indicator
    @State private var currentPage = 0

    var body: some View {
        ZStack {
            Color.background
                .ignoresSafeArea()

            // Purple to black gradient background
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.15, green: 0.05, blue: 0.25), // Darker deep purple (top)
                    Color.black                                // Black (bottom)
                ]),
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            // Dashboard content (fades when search is active)
            Group {
                if viewModel.isLoading {
                    loadingView
                } else if let error = viewModel.error {
                    errorView(message: error)
                } else if viewModel.subscriptions.isEmpty {
                    emptyView
                } else {
                    contentView
                }
            }
            .opacity(isSearchActive ? 0.15 : 1.0)
            .animation(.easeInOut(duration: 0.3), value: isSearchActive)

            // CRT overlay across entire dashboard
            CRTOverlayView()
                .ignoresSafeArea()
                .opacity(isSearchActive ? 0.15 : 1.0)
                .animation(.easeInOut(duration: 0.3), value: isSearchActive)

            // Search results overlay (when active)
            if isSearchActive {
                ZStack {
                    // Tappable background to dismiss search
                    Color.clear
                        .contentShape(Rectangle())
                        .onTapGesture {
                            isSearchActive = false
                            searchQuery = ""
                        }

                    DashboardSearchResults(
                        viewModel: searchViewModel,
                        onDismiss: {
                            isSearchActive = false
                            searchQuery = ""
                        }
                    )
                    .padding(.top, 60) // Space for search bar
                }
                .transition(.opacity)
            }

            // Search bar (always visible at top)
            VStack {
                DashboardSearchBar(
                    query: $searchQuery,
                    isActive: $isSearchActive
                )
                .padding(.horizontal, Spacing.screenPadding)
                .padding(.top, Spacing.sm)

                Spacer()
            }
        }
        .task {
            await viewModel.load(api: api)
            await viewModel.loadUpcomingEpisodes(api: api)
            // Stabilize services array with consistent ordering
            stableServices = viewModel.uniqueServices.sorted { $0.id < $1.id }
            // Set API reference for search
            searchViewModel.api = api
        }
        .refreshable {
            await viewModel.refresh(api: api)
            // Update stable services after refresh
            stableServices = viewModel.uniqueServices.sorted { $0.id < $1.id }
        }
        .onChange(of: searchQuery) { _, newValue in
            searchViewModel.query = newValue
            if !newValue.isEmpty {
                searchViewModel.scheduleSearch(api: api)
            }
        }
    }

    // MARK: - Computed Properties

    private var currentDayOfMonth: String {
        let day = Calendar.current.component(.day, from: Date())
        return String(format: "%02d", day)
    }

    // MARK: - Content View

    private var contentView: some View {
        ZStack(alignment: .top) {
            // Bouncing logos constrained to hero section (behind all UI, glow bleeds through)
            if !stableServices.isEmpty {
                ScatteredLogosView(
                    services: stableServices,
                    collisionManager: logoCollisionManager,
                    heroHeight: 300
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }

            VStack(spacing: 0) {
                // Fixed Header: Hero section (transparent, logos show through)
                HeroSection(services: viewModel.uniqueServices)
                    .frame(height: 300)
                    .ignoresSafeArea(edges: .horizontal)

                // Fixed Header: Metrics row
                MetricsRow(
                    subscriptionsCount: viewModel.totalActiveSubscriptions,
                    showsCount: viewModel.totalShows,
                    monthlyTotal: viewModel.formattedMonthlyCost
                )

                // Paginated Content: Subscriptions, Calendar Week View, & Recommendations
                TabView(selection: $currentPage) {
                    // Page 1: Subscriptions List
                    DashboardPageView(subscriptions: viewModel.activeSubscriptions)
                        .tag(0)

                    // Page 2: Calendar Week View
                    WeekCalendarView(
                        episodes: $viewModel.upcomingEpisodes,
                        selectedDate: $selectedDate
                    )
                    .tag(1)

                    // Page 3: Recommendations
                    RecommendationsPageView(subscriptions: viewModel.activeSubscriptions)
                        .tag(2)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .overlay(alignment: .bottom) {
                    // Custom page indicator with icons (floating)
                    HStack(spacing: 12) {
                        // TV icon for subscriptions page
                        Image(systemName: "tv")
                            .font(.system(size: 16, weight: currentPage == 0 ? .semibold : .regular))
                            .foregroundColor(currentPage == 0 ? .textPrimary : .textSecondary)
                            .opacity(currentPage == 0 ? 1.0 : 0.5)

                        // Current date number for calendar page
                        Text(currentDayOfMonth)
                            .font(.system(size: 16, weight: currentPage == 1 ? .semibold : .regular))
                            .foregroundColor(currentPage == 1 ? .textPrimary : .textSecondary)
                            .opacity(currentPage == 1 ? 1.0 : 0.5)

                        // Sparkles icon for recommendations page
                        Image(systemName: "sparkles")
                            .font(.system(size: 16, weight: currentPage == 2 ? .semibold : .regular))
                            .foregroundColor(currentPage == 2 ? .textPrimary : .textSecondary)
                            .opacity(currentPage == 2 ? 1.0 : 0.5)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(
                        Capsule()
                            .fill(Color.black.opacity(0.3))
                            .background(
                                Capsule()
                                    .fill(.ultraThinMaterial)
                            )
                    )
                    .padding(.bottom, 16)
                }
            }
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
