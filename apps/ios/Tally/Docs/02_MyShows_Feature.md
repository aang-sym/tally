# MyShows Feature Implementation Plan

## 🎯 Overview

Create a comprehensive MyShows feature that displays the user's shows organized by status: Watching, Watchlist, and Completed shows, using the existing backend watchlist API.

## 📡 Backend API Analysis

### **Available Endpoints**

- `GET /api/watchlist` - Get user's complete watchlist
- `GET /api/watchlist?status=watching|watchlist|completed|dropped` - Filter by status
- `POST /api/watchlist` - Add show to watchlist
- `PUT /api/watchlist/:id/status` - Update show status
- `DELETE /api/watchlist/:id` - Remove show from watchlist
- `GET /api/watchlist/stats` - Get user statistics

### **Authentication**

All endpoints require: `Authorization: Bearer <jwt-token>`

### **Response Format**

```json
{
  "success": true,
  "data": {
    "shows": [
      {
        "id": "uuid",
        "status": "watching|watchlist|completed|dropped",
        "show_rating": 8.5,
        "notes": "Great show!",
        "show": {
          "tmdb_id": 66732,
          "title": "Stranger Things",
          "poster_path": "https://image.tmdb.org/t/p/w500/poster.jpg",
          "first_air_date": "2016-07-15",
          "total_seasons": 4
        },
        "streaming_provider": {
          "name": "Netflix",
          "logo_path": "https://image.tmdb.org/t/p/w45/logo.jpg"
        }
      }
    ]
  }
}
```

## 📱 iOS Implementation Plan

### **1. Create Data Models**

Create new model files in `Core/Models/`:

#### **Show.swift**

```swift
struct Show: Codable, Identifiable {
    let id: String
    let tmdbId: Int
    let title: String
    let overview: String?
    let posterPath: String?
    let firstAirDate: String?
    let status: String?
    let totalSeasons: Int?
    let totalEpisodes: Int?
}
```

#### **UserShow.swift**

```swift
struct UserShow: Codable, Identifiable {
    let id: String
    let status: ShowStatus
    let showRating: Double?
    let notes: String?
    let show: Show
    let streamingProvider: StreamingProvider?
}
```

#### **ShowStatus.swift**

```swift
enum ShowStatus: String, Codable, CaseIterable {
    case watchlist = "watchlist"
    case watching = "watching"
    case completed = "completed"
    case dropped = "dropped"
}
```

#### **StreamingProvider.swift**

```swift
struct StreamingProvider: Codable {
    let id: Int
    let name: String
    let logoPath: String
}
```

### **2. Extend ApiClient.swift**

Add watchlist-related methods:

```swift
// Get watchlist optionally filtered by status
func getWatchlist(status: ShowStatus? = nil) async throws -> [UserShow]

// Add show to watchlist
func addToWatchlist(tmdbId: Int, status: ShowStatus = .watchlist) async throws -> UserShow

// Update show status
func updateShowStatus(id: String, status: ShowStatus) async throws

// Remove from watchlist
func removeFromWatchlist(id: String) async throws
```

### **3. Create MyShows Feature**

Create new feature folder: `Features/MyShows/`

#### **MyShowsViewModel.swift**

```swift
@MainActor
class MyShowsViewModel: ObservableObject {
    @Published var shows: [UserShow] = []
    @Published var isLoading: Bool = false
    @Published var error: String? = nil

    func loadShows(api: ApiClient, status: ShowStatus) async
    func refreshShows(api: ApiClient, status: ShowStatus) async
}
```

#### **MyShowsView.swift**

```swift
struct MyShowsView: View {
    @ObservedObject var api: ApiClient
    @StateObject private var viewModel = MyShowsViewModel()
    @State private var selectedStatus: ShowStatus = .watching

    var body: some View {
        NavigationStack {
            VStack {
                // Segmented Control for status filter
                Picker("Status", selection: $selectedStatus) {
                    Text("Watching").tag(ShowStatus.watching)
                    Text("Watchlist").tag(ShowStatus.watchlist)
                    Text("Completed").tag(ShowStatus.completed)
                }
                .pickerStyle(.segmented)
                .padding()

                // Show list with loading/error states
                if viewModel.isLoading {
                    ProgressView("Loading shows...")
                } else if let error = viewModel.error {
                    ErrorView(error: error, retry: { ... })
                } else if viewModel.shows.isEmpty {
                    EmptyStateView(status: selectedStatus)
                } else {
                    List(viewModel.shows) { userShow in
                        ShowRowView(userShow: userShow)
                    }
                }
            }
            .navigationTitle("My Shows")
            .onChange(of: selectedStatus) { _, newStatus in
                Task { await viewModel.loadShows(api: api, status: newStatus) }
            }
            .task {
                await viewModel.loadShows(api: api, status: selectedStatus)
            }
        }
    }
}
```

#### **ShowRowView.swift**

Reusable component for each show item:

```swift
struct ShowRowView: View {
    let userShow: UserShow

    var body: some View {
        HStack {
            // Poster image using AsyncImage
            AsyncImage(url: URL(string: userShow.show.posterPath ?? "")) { image in
                image.resizable().aspectRatio(contentMode: .fit)
            } placeholder: {
                Rectangle().fill(Color.gray.opacity(0.3))
            }
            .frame(width: 60, height: 90)

            VStack(alignment: .leading, spacing: 4) {
                Text(userShow.show.title)
                    .font(.headline)

                if let year = extractYear(from: userShow.show.firstAirDate) {
                    Text(year).font(.subheadline).foregroundColor(.secondary)
                }

                if let provider = userShow.streamingProvider {
                    Text(provider.name).font(.caption).foregroundColor(.blue)
                }

                if userShow.status == .completed, let rating = userShow.showRating {
                    Text("★ \(rating, specifier: "%.1f")").font(.caption)
                }
            }

            Spacer()
        }
        .padding(.vertical, 2)
    }
}
```

### **4. Navigation Integration**

Update `ContentView.swift`:

```swift
NavigationLink("My Shows", destination: MyShowsView(api: api))
    .buttonStyle(.bordered)
```

### **5. UI Components**

#### **EmptyStateView.swift**

```swift
struct EmptyStateView: View {
    let status: ShowStatus

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: iconName)
                .font(.system(size: 48))
                .foregroundColor(.gray)

            Text(emptyMessage)
                .font(.headline)
                .multilineTextAlignment(.center)
        }
        .padding()
    }

    private var iconName: String {
        switch status {
        case .watching: return "play.circle"
        case .watchlist: return "bookmark.circle"
        case .completed: return "checkmark.circle"
        case .dropped: return "xmark.circle"
        }
    }

    private var emptyMessage: String {
        switch status {
        case .watching: return "No shows currently watching\nAdd some shows to get started!"
        case .watchlist: return "Your watchlist is empty\nDiscover new shows to watch later"
        case .completed: return "No completed shows yet\nFinish watching shows to see them here"
        case .dropped: return "No dropped shows"
        }
    }
}
```

## 🔧 Technical Implementation Details

### **API Response Parsing**

- Handle nested `data.shows` array structure
- Parse TMDB poster URLs for AsyncImage
- Extract year from `first_air_date` string
- Handle optional streaming provider data

### **State Management**

- Use `@StateObject` for ViewModel lifecycle
- Use `@ObservedObject` for shared ApiClient
- Implement proper loading/error states
- Handle empty states for each category

### **Image Loading**

- Use SwiftUI's AsyncImage for poster loading
- Implement placeholder rectangles for loading states
- Handle missing poster paths gracefully

### **Error Handling**

- Parse API error responses: `{success: false, error: "message"}`
- Show retry buttons for failed requests
- Implement pull-to-refresh functionality

## 📋 Implementation Steps

1. ✅ **Create Core Models** - Show, UserShow, ShowStatus, StreamingProvider
2. ✅ **Extend ApiClient** - Add watchlist methods with proper response parsing
3. ✅ **Build MyShowsViewModel** - Handle state management and API calls
4. ✅ **Create MyShowsView** - Main UI with segmented control and list
5. ✅ **Add ShowRowView** - Reusable component for each show item
6. ✅ **Create EmptyStateView** - Handle empty states for each status
7. ✅ **Update ContentView** - Add navigation link to MyShows
8. ✅ **Test with real data** - Use existing backend with TMDB integration

## ✅ Success Criteria

- [x] Three-tab view showing Watching/Watchlist/Completed shows
- [x] Proper loading states and error handling
- [x] Show poster images and metadata
- [x] Seamless navigation from main app
- [x] Empty states for categories with no shows
- [x] Follows existing app architecture (MVVM + ObservableObject)

## 🧪 Test Data

The backend connects to real TMDB data. Test shows available:

- **Wednesday** (TMDB ID: 119051)
- **Stranger Things** (TMDB ID: 66732)
- **The Summer I Turned Pretty** (TMDB ID: 194766)

## 📚 Related Documentation

- See `Docs/01.md` for overall iOS plan and architecture decisions
- See `Docs/CLAUDE.md` for project conventions and structure
- Backend API routes in `/apps/api/src/routes/users.ts`
- Database types in `/apps/api/src/types/database.ts`
