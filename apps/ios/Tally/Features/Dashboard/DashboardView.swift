//
//  DashboardView.swift
//  Tally
//
//  Main dashboard view composing hero, summary cards, and subscription list
//

import SwiftUI

enum DashboardTab: Hashable {
    case calendar
    case recommendations
    case subscriptions
    case search
}

struct DashboardView: View {
    @ObservedObject var api: ApiClient
    @State private var viewModel = DashboardViewModel()
    @State private var selectedDate: Date?
    @State private var stableServices: [StreamingService] = []

    // Subscription state
    @State private var selectedSubscription: Subscription?

    // Tab selection
    @State private var selectedTab: DashboardTab = .calendar

    // Search state
    @State private var searchText = ""

    // Hero collapse state
    @State private var isHeroCollapsed = false
    @State private var dragOffset: CGFloat = 0

    var body: some View {
        ZStack {
            backgroundGradient

            // Loading/error/empty states
            if viewModel.isLoading {
                loadingView
            } else if let error = viewModel.error {
                errorView(message: error)
            } else if viewModel.subscriptions.isEmpty {
                emptyView
            } else {
                // Main content with persistent hero
                mainContentWithHero
            }
        }
        .sheet(item: $selectedSubscription) { subscription in
            ProviderDetailSheet(subscription: subscription)
        }
        .task {
            await viewModel.load(api: api)
            await viewModel.loadUpcomingEpisodes(api: api)
            stableServices = viewModel.uniqueServices.sorted { $0.id < $1.id }
        }
    }

    private var mainContentWithHero: some View {
        TabView(selection: $selectedTab) {
            // Tab 1: Calendar
            Tab("Calendar", systemImage: "calendar", value: .calendar) {
                VStack(spacing: 0) {
                    heroContent
                    calendarTabContent
                }
                .transaction { $0.disablesAnimations = false }
            }

            // Tab 2: Recommendations
            Tab("Discover", systemImage: "sparkles", value: .recommendations) {
                VStack(spacing: 0) {
                    heroContent
                    recommendationsTabContent
                }
                .transaction { $0.disablesAnimations = false }
            }

            // Tab 3: Subscriptions
            Tab("Library", systemImage: "square.stack.3d.up", value: .subscriptions) {
                VStack(spacing: 0) {
                    heroContent
                    subscriptionsTabContent
                }
                .transaction { $0.disablesAnimations = false }
            }

            // Search button (floating in bottom right with .search role)
            // Native iOS 26 search - system provides icon automatically
            Tab(value: .search, role: .search) {
                NavigationStack {
                    searchResultsContent
                }
            }
        }
        .searchable(text: $searchText, prompt: "Search for shows...")
        .frame(maxHeight: .infinity)
    }

    // MARK: - Hero Content (shared across tabs)

    private var heroContent: some View {
        VStack(spacing: 0) {
            // Hero section
            HeroSection(services: stableServices) { tappedService in
                // Find subscription matching the tapped service and show detail sheet
                if let subscription = viewModel.subscriptions.first(where: { $0.service?.id == tappedService.id }) {
                    selectedSubscription = subscription
                }
            }
            .frame(height: heroHeight)
            // No clipping here - allow logo glows to overflow into metrics area
            .scaleEffect(crtScaleEffect, anchor: .center)
            .opacity(heroOpacity)
            .ignoresSafeArea(edges: .horizontal)
            .animation(.easeIn(duration: 0.35), value: isHeroCollapsed)

            // Metrics row with collapse gesture
            MetricsRow(
                subscriptionsCount: viewModel.totalActiveSubscriptions,
                showsCount: viewModel.totalShows,
                monthlyTotal: viewModel.formattedMonthlyCost,
                showScanlines: false // Disable internal scanlines, handled by CRTOverlayView
            )
            .contentShape(Rectangle())
            .gesture(
                DragGesture()
                    .onChanged { value in
                        dragOffset = value.translation.height
                    }
                    .onEnded { value in
                        let dragThreshold: CGFloat = 100
                        if abs(value.translation.height) > dragThreshold {
                            withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                                isHeroCollapsed.toggle()
                            }
                        }
                        dragOffset = 0
                    }
            )
        }
        .overlay(alignment: .top) {
            // Constrain the GeometryReader to prevent it from expanding into tab content
            GeometryReader { geo in
                let topInset = geo.safeAreaInsets.top
                let metricsHeight: CGFloat = 80 // if this changes, consider measuring
                let overlayHeight = topInset + heroHeight + metricsHeight

                CRTOverlayView(height: overlayHeight)
                    .frame(width: geo.size.width, height: overlayHeight, alignment: .top)
                    .position(x: geo.size.width / 2, y: overlayHeight / 2)
                    .ignoresSafeArea(edges: .top)   // <- draw into the notch
                    .allowsHitTesting(false)
            }
            .frame(height: heroHeight + 80) // Limit GeometryReader height to hero + metrics
            .clipShape(
                // Custom clip that only clips bottom, allows overflow to top (notch)
                BottomOnlyClipShape()
            )
        }
    }

    // MARK: - Tab Content Views

    private var calendarTabContent: some View {
        WeekCalendarView(
            episodes: $viewModel.upcomingEpisodes,
            selectedDate: $selectedDate
        )
    }

    private var recommendationsTabContent: some View {
        RecommendationsPageView(subscriptions: viewModel.activeSubscriptions)
    }

    private var subscriptionsTabContent: some View {
        SubscriptionListView(
            subscriptions: viewModel.activeSubscriptions,
            onSelectSubscription: { subscription in
                selectedSubscription = subscription
            }
        )
    }

    private var searchResultsContent: some View {
        Group {
            if searchText.isEmpty {
                // Empty search state
                VStack(spacing: 16) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 48))
                        .foregroundColor(.white.opacity(0.3))
                    Text("Search for shows")
                        .font(.title3)
                        .foregroundColor(.white.opacity(0.6))
                }
            } else {
                // Search results
                SearchView(
                    api: api,
                    lastSelectedTab: selectedTab.tabIndex,
                    onDismiss: {
                        searchText = ""
                        selectedTab = .calendar
                    }
                )
            }
        }
    }

    // MARK: - Computed Properties

    private var backgroundGradient: some View {
        LinearGradient(
            gradient: Gradient(colors: [
                Color(red: 0.15, green: 0.05, blue: 0.25),
                Color.black
            ]),
            startPoint: .top,
            endPoint: .bottom
        )
        .ignoresSafeArea()
    }

    private var heroHeight: CGFloat {
        isHeroCollapsed ? 0 : 300
    }

    private var crtScaleEffect: CGSize {
        isHeroCollapsed ? CGSize(width: 0.0, height: 0.1) : CGSize(width: 1.0, height: 1.0)
    }

    private var heroOpacity: Double {
        isHeroCollapsed ? 0 : 1
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

// MARK: - Helper Extension

extension DashboardTab {
    var tabIndex: Int {
        switch self {
        case .calendar: return 0
        case .recommendations: return 1
        case .subscriptions: return 2
        case .search: return 3
        }
    }
}

// MARK: - Custom Clip Shape

/// A shape that clips only the bottom edge, allowing content to overflow at the top
private struct BottomOnlyClipShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        
        // Create a rectangle that extends far above the top edge
        // but clips precisely at the bottom edge
        let extendedRect = CGRect(
            x: rect.minX,
            y: rect.minY - 1000, // Extend 1000 points above to allow notch area
            width: rect.width,
            height: rect.height + 1000 // Total height includes the extension
        )
        
        path.addRect(extendedRect)
        return path
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Dashboard with data") {
    DashboardView(api: PreviewApiClient())
        .onAppear {
            // Simulate loaded state
        }
}

#Preview("Dashboard loading") {
    DashboardView(api: PreviewApiClient())
}

#Preview("Dashboard empty") {
    DashboardView(api: PreviewApiClient())
}

#Preview("Dashboard error") {
    DashboardView(api: PreviewApiClient())
}
#endif
