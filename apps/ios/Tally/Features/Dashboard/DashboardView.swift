//
//  DashboardView.swift
//  Tally
//
//  Main dashboard view composing hero, summary cards, and subscription list
//

import SwiftUI

enum DashboardTab: Hashable {
    case home
    case calendar
    case recommendations
    case search
}

struct DashboardView: View {
    @ObservedObject var api: ApiClient
    @State private var viewModel = DashboardViewModel()
    @State private var selectedDate: Date?
    @State private var stableServices: [StreamingService] = []

    // Tab selection
    @State private var selectedTab: DashboardTab = .home

    // Search state
    @State private var searchText = ""

    // Subscription list sheet state
    @State private var showSubscriptionsList = false

    // Ticker state
    @State private var showTickerExpanded = false
    @Namespace private var tickerNamespace
    @Namespace private var providerNamespace

    // Provider detail state
    @State private var showProviderDetail = false
    @State private var selectedProviderSubscription: Subscription?

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
        .task {
            await viewModel.load(api: api)
            await viewModel.loadUpcomingEpisodes(api: api)
            stableServices = viewModel.uniqueServices.sorted { $0.id < $1.id }
        }
    }

    private var mainContentWithHero: some View {
        TabView(selection: $selectedTab) {
            // Tab 1: Home (with full-screen hero)
            Tab("Home", systemImage: "house.fill", value: .home) {
                homeTabContent
            }

            // Tab 2: Calendar (no hero)
            Tab("Calendar", systemImage: "calendar", value: .calendar) {
                calendarTabContent
            }

            // Tab 3: Recommendations (no hero)
            Tab("Discover", systemImage: "sparkles", value: .recommendations) {
                recommendationsTabContent
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

    // MARK: - Tab Content Views

    private var homeTabContent: some View {
        GeometryReader { geometry in
            // Capture safe area BEFORE ignoresSafeArea is applied
            let safeAreaTop = geometry.safeAreaInsets.top

            ZStack {
                VStack(spacing: 0) {
                    // Hero section - fills from notch to metrics
                    HeroSection(
                        services: stableServices,
                        safeAreaTop: safeAreaTop, // Pass captured safe area
                        scanlineStyle: "horizontal-rgb-fill",
                        scanlineFillMode: true
                    ) { tappedService in
                        // Find subscription matching the tapped service and show detail overlay
                        if let subscription = viewModel.subscriptions.first(where: { $0.service?.id == tappedService.id }) {
                            withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                                selectedProviderSubscription = subscription
                                showProviderDetail = true
                            }
                        }
                    }
                    .frame(maxHeight: .infinity)
                    .ignoresSafeArea(edges: .top)

                    // Liquid Glass Ticker with alignment guide for anchoring
                    GlassEffectContainer(spacing: 20.0) {
                        LiquidGlassTicker(
                            items: viewModel.tickerItems,
                            isExpanded: $showTickerExpanded,
                            namespace: tickerNamespace
                        )
                        .padding(.horizontal, Spacing.screenPadding)
                        .padding(.top, Spacing.sm)
                    }
                    .alignmentGuide(.tickerAnchor) { d in d[VerticalAlignment.top] }
                    .zIndex(1) // Ensure ticker is above overlays when closed

                    // Metrics row (tappable subscriptions count)
                    MetricsRow(
                        subscriptionsCount: viewModel.totalActiveSubscriptions,
                        showsCount: viewModel.totalShows,
                        monthlyTotal: viewModel.formattedMonthlyCost,
                        showScanlines: false,
                        onSubscriptionsTap: {
                            withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                                showSubscriptionsList = true
                            }
                        }
                    )
                    .zIndex(1) // Ensure metrics is above overlays when closed
                }
                .overlay { // Full-screen dimmed background overlay
                    if showTickerExpanded || showSubscriptionsList || showProviderDetail {
                        Color.black.opacity(0.4)
                            .ignoresSafeArea(edges: .all)
                            .onTapGesture {
                                withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                                    if showTickerExpanded {
                                        showTickerExpanded = false
                                    }
                                    if showSubscriptionsList {
                                        showSubscriptionsList = false
                                    }
                                    if showProviderDetail {
                                        showProviderDetail = false
                                    }
                                }
                            }
                            .zIndex(50) // Lower than content but still visible
                    }
                }
                .overlay(alignment: Alignment(horizontal: .center, vertical: .tickerAnchor)) {
                    // Expanded ticker overlay - anchored using custom alignment
                    ZStack {
                        // Expanded ticker - bottom edge anchored to ticker top
                        if showTickerExpanded {
                            GlassEffectContainer(spacing: 20.0) {
                                LiquidGlassTickerExpanded(
                                    items: viewModel.tickerItems,
                                    isExpanded: $showTickerExpanded,
                                    namespace: tickerNamespace,
                                    onItemTap: { item in
                                        handleTickerItemTap(item)
                                    }
                                )
                                .padding(.horizontal, Spacing.screenPadding)
                                .transition(.scale(scale: 0.95).combined(with: .opacity))
                            }
                            .frame(maxHeight: heroHeight - 16, alignment: .bottom) // Constrain height with padding from notch
                            .alignmentGuide(.tickerAnchor) { d in d[VerticalAlignment.bottom] }
                            .animation(.spring(response: 0.5, dampingFraction: 0.8), value: showTickerExpanded)
                            .allowsHitTesting(showTickerExpanded)
                            .zIndex(100)
                        }

                        // Subscriptions list - bottom edge anchored to ticker top (same as expanded ticker)
                        if showSubscriptionsList {
                            GlassEffectContainer(spacing: 20.0) {
                                SubscriptionListView(
                                    subscriptions: viewModel.activeSubscriptions,
                                    onSelectSubscription: { subscription in
                                        withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                                            selectedProviderSubscription = subscription
                                            showSubscriptionsList = false
                                            showProviderDetail = true
                                        }
                                    },
                                    namespace: providerNamespace, isShown: $showSubscriptionsList
                                )
                                .padding(.horizontal, Spacing.screenPadding)
                                .transition(.scale(scale: 0.95).combined(with: .opacity))
                            }
                            .frame(maxHeight: heroHeight - 16, alignment: .bottom) // Same constraint as ticker
                            .alignmentGuide(.tickerAnchor) { d in d[VerticalAlignment.bottom] }
                            .animation(.spring(response: 0.5, dampingFraction: 0.8), value: showSubscriptionsList)
                            .allowsHitTesting(showSubscriptionsList)
                            .zIndex(101)
                        }

                        // Provider detail - bottom edge anchored to ticker top (same as expanded ticker)
                        if showProviderDetail, let subscription = selectedProviderSubscription {
                            GlassEffectContainer(spacing: 20.0) {
                                ProviderDetailSheet(
                                    subscription: subscription,
                                    namespace: providerNamespace,
                                    isShown: $showProviderDetail
                                )
                                .padding(.horizontal, Spacing.screenPadding)
                                .transition(.scale(scale: 0.95).combined(with: .opacity))
                            }
                            .frame(maxHeight: heroHeight - 16, alignment: .bottom) // Same constraint as ticker
                            .alignmentGuide(.tickerAnchor) { d in d[VerticalAlignment.bottom] }
                            .animation(.spring(response: 0.5, dampingFraction: 0.8), value: showProviderDetail)
                            .allowsHitTesting(showProviderDetail)
                            .zIndex(102)
                        }
                    }
                }
                .overlay(alignment: .top) {
                    // Extend scanlines from the notch down behind the metrics row
                    GeometryReader { geo in
                        let topInset = geo.safeAreaInsets.top
                        let metricsHeight: CGFloat = 80 // keep in sync with MetricsRow height
                        let overlayHeight = topInset + heroHeight + metricsHeight
                        
                        CRTOverlayView(height: overlayHeight)
                            .frame(width: geo.size.width, height: overlayHeight, alignment: .top)
                            .position(x: geo.size.width / 2, y: overlayHeight / 2)
                            .ignoresSafeArea(edges: .top) // draw into notch
                            .allowsHitTesting(false)
                    }
                    // Limit GeometryReader height to hero + metrics so it doesn't spill into content
                    .frame(height: heroHeight + 80)
                    .clipShape(BottomOnlyClipShape())
                }
            }
        }
    }

    private var calendarTabContent: some View {
        WeekCalendarView(
            episodes: $viewModel.upcomingEpisodes,
            selectedDate: $selectedDate
        )
    }

    private var recommendationsTabContent: some View {
        RecommendationsPageView(subscriptions: viewModel.activeSubscriptions)
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
        300 // Fixed height for hero section
    }

    // MARK: - Ticker Item Handler

    private func handleTickerItemTap(_ item: TickerItem) {
        // Handle deep-link navigation for ticker items
        guard let deepLink = item.deepLink else {
            // No deep link - just close the expanded view
            withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                showTickerExpanded = false
            }
            return
        }

        // TODO: Implement actual deep-link navigation
        // For now, just log the action and close the expanded view
        print("📍 Ticker item tapped: \(item.title)")
        print("📍 Deep link: \(deepLink.absoluteString)")

        withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
            showTickerExpanded = false
        }

        // Future implementation would navigate to:
        // - Show detail page for show-related items
        // - Movie detail page for movie items
        // - Subscription settings for billing items
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

// MARK: - Custom Alignment for Ticker Anchoring

extension VerticalAlignment {
    /// Custom alignment for anchoring expanded ticker to collapsed ticker's top edge
    private struct TickerAnchorAlignment: AlignmentID {
        static func defaultValue(in context: ViewDimensions) -> CGFloat {
            context[VerticalAlignment.center]
        }
    }
    
    static let tickerAnchor = VerticalAlignment(TickerAnchorAlignment.self)
}

// MARK: - Helper Extension

extension DashboardTab {
    var tabIndex: Int {
        switch self {
        case .home: return 0
        case .calendar: return 1
        case .recommendations: return 2
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

