//
//  CalendarView.swift
//  Tally
//
//  Monthly calendar showing streaming provider indicators per day
//

import SwiftUI

struct CalendarView: View {
    @ObservedObject var api: ApiClient
    @StateObject private var viewModel = CalendarViewModel()
    @State private var selectedDay: CalendarDay?
    @State private var showingDaySheet = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Header with navigation and country selector
                HeaderView()

                // Content area
                Group {
                    if viewModel.isLoading {
                        LoadingView()
                    } else if let errorMessage = viewModel.error {
                        ErrorView(message: errorMessage) {
                            viewModel.clearError()
                        }
                    } else {
                        MonthGridView()
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .navigationTitle("Calendar")
            .sheet(isPresented: $showingDaySheet, content: {
                if let day = selectedDay {
                    DayDetailSheet(day: day)
                        .presentationDetents([.medium])
                        .presentationDragIndicator(.visible)
                }
            })
        }
        .environmentObject(viewModel)
        .onAppear {
            viewModel.api = api
            Task {
                await viewModel.loadForMonth()
            }
        }
    }

    // MARK: - Header View
    private func HeaderView() -> some View {
        VStack(spacing: 12) {
            // Month navigation
            HStack {
                Button(action: {
                    viewModel.previousMonth()
                    Task { await viewModel.loadForMonth() }
                }) {
                    Image(systemName: "chevron.left")
                        .font(.title2)
                        .foregroundColor(.blue)
                }

                Spacer()

                VStack(spacing: 2) {
                    Text(viewModel.monthTitle)
                        .font(.title2)
                        .fontWeight(.semibold)

                    Text("\(viewModel.yearTitle)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button(action: {
                    viewModel.nextMonth()
                    Task { await viewModel.loadForMonth() }
                }) {
                    Image(systemName: "chevron.right")
                        .font(.title2)
                        .foregroundColor(.blue)
                }
            }

            // Country selector and Today button
            HStack {
                Menu("Country: \(viewModel.country)") {
                    ForEach(CountryManager.all, id: \.self) { code in
                        Button(code) {
                            viewModel.setCountry(code)
                            Task { await viewModel.loadForMonth() }
                        }
                    }
                }
                .font(.subheadline)

                Spacer()

                Button("Today") {
                    viewModel.goToToday()
                    Task { await viewModel.loadForMonth() }
                }
                .buttonStyle(.bordered)
                .font(.subheadline)
            }
        }
        .padding()
        .background(Color(.systemGroupedBackground))
    }

    // MARK: - Loading View
    private func LoadingView() -> some View {
        VStack(spacing: 12) {
            ProgressView()
                .scaleEffect(1.2)
            Text("Loading calendar...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Error View
    private func ErrorView(message: String, onRetry: @escaping () -> Void) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 32))
                .foregroundStyle(.orange)

            Text(message)
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)

            Button("Dismiss") {
                onRetry()
            }
            .buttonStyle(.bordered)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }

    // MARK: - Month Grid View
    private func MonthGridView() -> some View {
        VStack(spacing: 0) {
            // Day headers (Sun, Mon, Tue, ...)
            HStack {
                ForEach(viewModel.weekDayNames, id: \.self) { dayName in
                    Text(dayName)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)

            // Calendar grid (6 rows x 7 columns)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 8) {
                ForEach(viewModel.visibleDays, id: \.date) { day in
                    DayCell(day: day) {
                        selectedDay = day
                        showingDaySheet = true
                    }
                }
            }
            .padding(.horizontal)
        }
    }
}

// MARK: - Day Cell
private struct DayCell: View {
    let day: CalendarDay
    let onTap: () -> Void
    @EnvironmentObject private var viewModel: CalendarViewModel

    private var isToday: Bool {
        Calendar.current.isDateInToday(day.date)
    }

    private var isCurrentMonth: Bool {
        let calendar = Calendar.current
        let dayMonth = calendar.component(.month, from: day.date)
        let currentMonth = calendar.component(.month, from: viewModel.monthAnchor)
        return dayMonth == currentMonth
    }

    private var dayNumber: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d"
        return formatter.string(from: day.date)
    }

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 4) {
                Text(dayNumber)
                    .font(.subheadline)
                    .fontWeight(isToday ? .bold : .regular)
                    .foregroundColor(dayTextColor)

                // Provider indicators
                if !day.providers.isEmpty {
                    if day.providers.count <= 3 {
                        // Show provider logos when 3 or fewer
                        HStack(spacing: 2) {
                            ForEach(Array(day.providers.prefix(3)), id: \.id) { provider in
                                AsyncImage(url: URL(string: provider.logo ?? "")) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                } placeholder: {
                                    Circle()
                                        .fill(providerColor(for: provider))
                                        .frame(width: 6, height: 6)
                                }
                                .frame(width: 12, height: 12)
                                .clipShape(Circle())
                            }
                        }
                    } else {
                        // Show colored dots + overflow indicator
                        VStack(spacing: 1) {
                            HStack(spacing: 2) {
                                ForEach(Array(day.providers.prefix(3)), id: \.id) { provider in
                                    Circle()
                                        .fill(providerColor(for: provider))
                                        .frame(width: 6, height: 6)
                                }
                            }
                            Text("+\(day.providers.count - 3)")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                } else {
                    // Placeholder to maintain consistent height
                    Spacer()
                        .frame(height: 16)
                }
            }
            .frame(width: 40, height: 60)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(isToday ? Color.blue.opacity(0.2) : Color.clear)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(isToday ? Color.blue : Color.clear, lineWidth: 2)
                    )
            )
        }
        .buttonStyle(.plain)
        .opacity(isCurrentMonth ? 1.0 : 0.3)
    }

    private var dayTextColor: Color {
        if isToday {
            return .blue
        } else if isCurrentMonth {
            return .primary
        } else {
            return .secondary
        }
    }

    private func providerColor(for provider: Provider) -> Color {
        // Simple hash-based color assignment for consistency
        let colors: [Color] = [.blue, .green, .orange, .purple, .red, .pink, .yellow, .cyan]
        let index = abs(provider.name.hashValue) % colors.count
        return colors[index]
    }
}

// MARK: - Day Detail Sheet
private struct DayDetailSheet: View {
    let day: CalendarDay

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .full
        return formatter.string(from: day.date)
    }

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                // Date header
                Text(formattedDate)
                    .font(.headline)
                    .padding(.horizontal)

                if day.providers.isEmpty {
                    // Empty state
                    VStack(spacing: 12) {
                        Image(systemName: "calendar.badge.exclamationmark")
                            .font(.system(size: 32))
                            .foregroundStyle(.secondary)

                        Text("No shows airing today")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    // Provider list
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(day.providers, id: \.id) { provider in
                                ProviderRow(provider: provider)
                            }
                        }
                        .padding(.horizontal)
                    }
                }

                Spacer()
            }
            .navigationTitle("Shows")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

// MARK: - Provider Row
private struct ProviderRow: View {
    let provider: Provider

    var body: some View {
        HStack(spacing: 12) {
            // Provider logo
            AsyncImage(url: URL(string: provider.logo ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } placeholder: {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color(.systemGray5))
                    .overlay {
                        Image(systemName: "tv")
                            .foregroundStyle(.secondary)
                    }
            }
            .frame(width: 32, height: 32)
            .clipShape(RoundedRectangle(cornerRadius: 4))

            // Provider info
            VStack(alignment: .leading, spacing: 2) {
                Text(provider.name)
                    .font(.subheadline)
                    .fontWeight(.medium)

                // TODO: Add show titles when available in provider model
                Text("Shows available")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding(.vertical, 4)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}

// MARK: - Previews
#Preview {
    let api = ApiClient()
    return CalendarView(api: api)
}