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

    // Subscription state
    @State private var selectedSubscription: Subscription?

    // Page tracking for custom page indicator
    @State private var currentPage = 0

    // Hero collapse state
    @State private var isHeroCollapsed = false
    @State private var dragOffset: CGFloat = 0

    var body: some View {
        NavigationStack {
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

                // Dashboard content
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

                // CRT overlay across entire dashboard
                CRTOverlayView()
                    .ignoresSafeArea()
            }
            .navigationBarHidden(true)
        }
        .sheet(item: $selectedSubscription) { subscription in
            ProviderDetailSheet(subscription: subscription)
        }
        .task {
            await viewModel.load(api: api)
            await viewModel.loadUpcomingEpisodes(api: api)
            // Stabilize services array with consistent ordering
            stableServices = viewModel.uniqueServices.sorted { $0.id < $1.id }
        }
        .refreshable {
            await viewModel.refresh(api: api)
            // Update stable services after refresh
            stableServices = viewModel.uniqueServices.sorted { $0.id < $1.id }
        }
    }

    // MARK: - Computed Properties

    private var currentDayOfMonth: String {
        let day = Calendar.current.component(.day, from: Date())
        return String(format: "%02d", day)
    }

    private var heroHeight: CGFloat {
        isHeroCollapsed ? 0 : 300
    }

    private var crtScaleEffect: CGSize {
        if isHeroCollapsed {
            // CRT switch-off effect: collapse to horizontal line
            return CGSize(width: 0.0, height: 0.1)
        } else {
            return CGSize(width: 1.0, height: 1.0)
        }
    }

    private var heroOpacity: Double {
        isHeroCollapsed ? 0 : 1
    }

    // MARK: - Bottom Toolbar Components

    private var bottomToolbar: some View {
        HStack(spacing: 12) {
            // Full segmented picker
            tabSelector

            // Circular search button (NavigationLink)
            NavigationLink(destination: SearchView(api: api, lastSelectedTab: currentPage)) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .background(Circle().fill(Color.gray.opacity(0.3)))
            }
        }
        .padding(.horizontal, Spacing.screenPadding)
        .padding(.bottom, 16)
    }

    private var tabSelector: some View {
        Picker("Navigation", selection: $currentPage) {
            Text(currentDayOfMonth)
                .font(.system(size: 14, weight: .semibold))
                .tag(0)
            Image(systemName: "sparkles")
                .font(.system(size: 16, weight: .semibold))
                .tag(1)
            Image(systemName: "square.stack.3d.up")
                .font(.system(size: 16, weight: .semibold))
                .tag(2)
        }
        .pickerStyle(.segmented)
        .background {
            RoundedRectangle(cornerRadius: 9)
                .fill(Color.black.opacity(0.6))
                .overlay(
                    RoundedRectangle(cornerRadius: 9)
                        .stroke(Color.white.opacity(0.1), lineWidth: 0.5)
                )
        }
        .clipShape(RoundedRectangle(cornerRadius: 9))
        .frame(maxWidth: 220, maxHeight: 44)
    }


    // MARK: - Content View

    private var contentView: some View {
        ZStack(alignment: .top) {
            // Bouncing logos constrained to hero section (behind all UI, glow bleeds through)
            if !stableServices.isEmpty {
                ScatteredLogosView(
                    services: stableServices,
                    collisionManager: logoCollisionManager,
                    heroHeight: 300,
                    onLogoTap: { service in
                        // Find subscription for this service
                        if let subscription = viewModel.activeSubscriptions.first(where: { $0.service?.id == service.id }) {
                            selectedSubscription = subscription
                        }
                    }
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }

            VStack(spacing: 0) {
                // Fixed Header: Hero section (transparent, logos show through)
                HeroSection(services: viewModel.uniqueServices)
                    .frame(height: heroHeight)
                    .scaleEffect(crtScaleEffect, anchor: .center)
                    .opacity(heroOpacity)
                    .ignoresSafeArea(edges: .horizontal)
                    .animation(.easeIn(duration: 0.35), value: isHeroCollapsed)

                // Fixed Header: Metrics row
                MetricsRow(
                    subscriptionsCount: viewModel.totalActiveSubscriptions,
                    showsCount: viewModel.totalShows,
                    monthlyTotal: viewModel.formattedMonthlyCost
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

                // Paginated Content: Calendar Week View, Recommendations & Subscriptions
                TabView(selection: $currentPage) {
                    // Page 0: Calendar Week View
                    WeekCalendarView(
                        episodes: $viewModel.upcomingEpisodes,
                        selectedDate: $selectedDate
                    )
                    .simultaneousGesture(DragGesture())
                    .tag(0)

                    // Page 1: Recommendations
                    RecommendationsPageView(subscriptions: viewModel.activeSubscriptions)
                        .simultaneousGesture(DragGesture())
                        .tag(1)

                    // Page 2: Subscriptions
                    SubscriptionListView(
                        subscriptions: viewModel.activeSubscriptions,
                        onSelectSubscription: { subscription in
                            selectedSubscription = subscription
                        }
                    )
                    .simultaneousGesture(DragGesture())
                    .tag(2)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .overlay(alignment: .bottom) {
                    bottomToolbar
                }
                .overlay(alignment: .bottom) {
                    // Bottom fade to black gradient
                    LinearGradient(
                        colors: [.clear, .black],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .frame(height: 100)
                    .allowsHitTesting(false)
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
