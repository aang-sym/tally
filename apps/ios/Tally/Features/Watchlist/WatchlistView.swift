

import SwiftUI

struct WatchlistView: View {
    @ObservedObject var api: ApiClient
    @StateObject private var vm = WatchlistViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading {
                    ProgressView("Loading shows…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let err = vm.error {
                    VStack(spacing: 12) {
                        Text(err)
                            .multilineTextAlignment(.center)
                            .foregroundStyle(.secondary)
                        Button("Retry") { Task { await vm.load(api: api) } }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if vm.shows.isEmpty {
                    EmptyState(status: vm.selectedStatus)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(vm.shows) { us in
                        Row(userShow: us)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("My Shows")
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Picker("Status", selection: $vm.selectedStatus) {
                        Text("Watching").tag(ShowStatus.watching)
                        Text("Watchlist").tag(ShowStatus.watchlist)
                        Text("Completed").tag(ShowStatus.completed)
                    }
                    .pickerStyle(.segmented)
                    .frame(maxWidth: 360)
                }
            }
            .onChange(of: vm.selectedStatus) { _, _ in
                Task { await vm.load(api: api) }
            }
            .task { await vm.load(api: api) }
        }
    }
}

// MARK: - Empty state
private struct EmptyState: View {
    let status: ShowStatus
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "film.stack")
                .imageScale(.large)
            Text(title)
                .font(.headline)
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
    private var title: String {
        switch status {
        case .watching: return "No shows in progress"
        case .watchlist: return "Your watchlist is empty"
        case .completed: return "No completed shows yet"
        case .dropped: return "Nothing dropped"
        }
    }
    private var subtitle: String {
        switch status {
        case .watching: return "Start watching something from your list."
        case .watchlist: return "Add shows you want to watch."
        case .completed: return "Mark shows as completed when you finish."
        case .dropped: return "Shows you stop watching will appear here."
        }
    }
}

// MARK: - Row
private struct Row: View {
    let userShow: UserShow
    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: artworkURL) { img in
                img.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                Rectangle().opacity(0.15)
            }
            .frame(width: 60, height: 90)
            .clipped()
            .cornerRadius(6)

            VStack(alignment: .leading, spacing: 4) {
                Text(userShow.show.title)
                    .font(.headline)
                if let yearText = year { Text(yearText).font(.subheadline).foregroundStyle(.secondary) }
                if let p = userShow.streamingProvider?.name { Text(p).font(.caption).foregroundStyle(.blue) }
                if userShow.status == .completed, let r = userShow.showRating { Text("★ \(r, specifier: "%.1f")").font(.caption) }
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }

    private var artworkURL: URL? {
        guard let path = userShow.show.posterPath, !path.isEmpty else { return nil }
        return URL(string: path)
    }
    private var year: String? {
        guard let s = userShow.show.firstAirDate, s.count >= 4 else { return nil }
        return String(s.prefix(4))
    }
}

#Preview {
    let api = ApiClient()
    return WatchlistView(api: api)
}
