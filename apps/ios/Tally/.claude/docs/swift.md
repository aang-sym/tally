# Swift & SwiftUI Best Practices for Tally

This document outlines idiomatic Swift and SwiftUI patterns to follow when building the Tally iOS app.

## Core Principles

### 1. Modern State Management with @Observable

**Use `@Observable` (Swift 5.9+) instead of `ObservableObject`**

```swift
// ✅ GOOD: Modern @Observable
import Observation

@Observable
final class CalendarViewModel {
    var selectedDate: Date = Date()
    var isLoading: Bool = false
    var episodes: [Episode] = []

    func loadEpisodes() async {
        isLoading = true
        defer { isLoading = false }
        // ... load logic
    }
}

// ❌ BAD: Old ObservableObject pattern
class CalendarViewModel: ObservableObject {
    @Published var selectedDate: Date = Date()
    @Published var isLoading: Bool = false
    @Published var episodes: [Episode] = []
}
```

### 2. Computed Properties Over State Flags

**Trust SwiftUI's view updates - use computed properties instead of managing state flags**

```swift
// ✅ GOOD: Computed property
@Observable
final class ViewModel {
    var items: [Item] = []

    var isEmpty: Bool {
        items.isEmpty
    }

    var hasMultipleItems: Bool {
        items.count > 1
    }
}

// ❌ BAD: Unnecessary state management
@Observable
final class ViewModel {
    var items: [Item] = [] {
        didSet {
            isEmpty = items.isEmpty
            hasMultipleItems = items.count > 1
        }
    }
    var isEmpty: Bool = true
    var hasMultipleItems: Bool = false
}
```

### 3. Enum-Based View State

**Use enums to represent mutually exclusive states clearly**

```swift
// ✅ GOOD: Enum-based state
enum LoadingState<T> {
    case idle
    case loading
    case loaded(T)
    case error(Error)
}

@Observable
final class ShowDetailViewModel {
    var state: LoadingState<Show> = .idle

    func load() async {
        state = .loading
        do {
            let show = try await api.fetchShow()
            state = .loaded(show)
        } catch {
            state = .error(error)
        }
    }
}

struct ShowDetailView: View {
    let viewModel: ShowDetailViewModel

    var body: some View {
        switch viewModel.state {
        case .idle:
            Text("Ready to load")
        case .loading:
            ProgressView()
        case .loaded(let show):
            ShowContent(show: show)
        case .error(let error):
            ErrorView(error: error)
        }
    }
}

// ❌ BAD: Multiple boolean flags
@Observable
final class ShowDetailViewModel {
    var isLoading = false
    var hasError = false
    var show: Show?
    var error: Error?
    // Hard to maintain: what if isLoading && hasError?
}
```

### 4. Structured Concurrency (Swift 6)

**Use proper async/await patterns - no detached tasks or polling**

```swift
// ✅ GOOD: Structured concurrency
@MainActor
final class TVGuideViewModel: ObservableObject {
    func loadData() async {
        do {
            // Parallel loading of independent data
            async let shows = api.fetchShows()
            async let providers = api.fetchProviders()

            let (loadedShows, loadedProviders) = try await (shows, providers)

            self.shows = loadedShows
            self.providers = loadedProviders
        } catch {
            self.error = error
        }
    }
}

// ❌ BAD: Detached tasks and race conditions
final class TVGuideViewModel: ObservableObject {
    func loadData() {
        Task.detached { [weak self] in
            let shows = try? await api.fetchShows()
            DispatchQueue.main.async {
                self?.shows = shows ?? []
            }
        }

        Task.detached { [weak self] in
            let providers = try? await api.fetchProviders()
            DispatchQueue.main.async {
                self?.providers = providers ?? []
            }
        }
    }
}
```

### 5. No DispatchQueue Hacks

**Trust SwiftUI's lifecycle instead of using delays**

```swift
// ✅ GOOD: Pure SwiftUI state management
struct NavigationView: View {
    @State private var selectedItem: Item?

    var body: some View {
        List(items) { item in
            Button(item.title) {
                selectedItem = item
            }
        }
        .navigationDestination(item: $selectedItem) { item in
            DetailView(item: item)
        }
    }
}

// ❌ BAD: Using delays to work around state issues
struct NavigationView: View {
    @State private var isNavigating = false
    @State private var selectedItem: Item?

    var body: some View {
        List(items) { item in
            Button(item.title) {
                guard !isNavigating else { return }
                isNavigating = true
                selectedItem = item

                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    isNavigating = false
                }
            }
        }
    }
}
```

### 6. Protocol-Based Dependency Injection

**Make everything testable through protocols**

```swift
// ✅ GOOD: Protocol-based architecture
protocol ApiClientProtocol {
    func fetchShows() async throws -> [Show]
    func fetchEpisodes(showId: Int) async throws -> [Episode]
}

final class LiveApiClient: ApiClientProtocol {
    func fetchShows() async throws -> [Show] {
        // Real network call
    }
}

final class MockApiClient: ApiClientProtocol {
    var mockShows: [Show] = []

    func fetchShows() async throws -> [Show] {
        mockShows
    }
}

@Observable
final class WatchlistViewModel {
    private let api: ApiClientProtocol
    var shows: [Show] = []

    init(api: ApiClientProtocol) {
        self.api = api
    }
}

// In tests:
let mockApi = MockApiClient()
mockApi.mockShows = [testShow1, testShow2]
let viewModel = WatchlistViewModel(api: mockApi)

// ❌ BAD: Hard dependency on concrete type
@Observable
final class WatchlistViewModel {
    private let api = LiveApiClient() // Can't test!
    var shows: [Show] = []
}
```

## SwiftUI View Patterns

### View Composition

Break down complex views into smaller, focused components:

```swift
// ✅ GOOD: Composed views
struct CalendarView: View {
    let viewModel: CalendarViewModel

    var body: some View {
        VStack {
            CalendarHeader(month: viewModel.currentMonth)
            CalendarGrid(days: viewModel.days)
            EpisodeList(episodes: viewModel.selectedDayEpisodes)
        }
    }
}

struct CalendarHeader: View {
    let month: Date

    var body: some View {
        // Header implementation
    }
}

struct CalendarGrid: View {
    let days: [CalendarDay]

    var body: some View {
        // Grid implementation
    }
}

// ❌ BAD: Monolithic view
struct CalendarView: View {
    var body: some View {
        VStack {
            // 200 lines of view code...
        }
    }
}
```

### Preview Variants for Design Exploration

Use previews to explore multiple design options:

```swift
// ✅ GOOD: Multiple preview variants
#Preview("Default State") {
    EpisodeCard(episode: .preview)
}

#Preview("Loading State") {
    EpisodeCard(episode: nil)
}

#Preview("Error State") {
    EpisodeCard(episode: .preview, error: .networkError)
}

#Preview("Dark Mode") {
    EpisodeCard(episode: .preview)
        .preferredColorScheme(.dark)
}

#Preview("Small Text") {
    EpisodeCard(episode: .preview)
        .environment(\.sizeCategory, .extraSmall)
}

#Preview("Large Text") {
    EpisodeCard(episode: .preview)
        .environment(\.sizeCategory, .accessibilityExtraLarge)
}
```

## Error Handling

### Typed Errors

Use specific error types:

```swift
// ✅ GOOD: Typed errors
enum ApiError: LocalizedError {
    case unauthorized
    case notFound
    case serverError(statusCode: Int)
    case networkError(Error)
    case decodingError(Error)

    var errorDescription: String? {
        switch self {
        case .unauthorized:
            return "Please sign in to continue"
        case .notFound:
            return "Content not found"
        case .serverError(let code):
            return "Server error (code: \(code))"
        case .networkError:
            return "Network connection lost"
        case .decodingError:
            return "Invalid response from server"
        }
    }
}

// ❌ BAD: Generic errors
enum ApiError: Error {
    case error(String)
}
```

## Testing Patterns

### Swift Testing Framework

```swift
import Testing
@testable import Tally

@Suite("Calendar ViewModel Tests")
struct CalendarViewModelTests {

    @Test("Loads episodes for selected month")
    func loadEpisodesForMonth() async throws {
        // Given
        let mockApi = MockApiClient()
        mockApi.mockEpisodes = [.preview1, .preview2]
        let viewModel = CalendarViewModel(api: mockApi)

        // When
        await viewModel.loadMonth(Date())

        // Then
        #expect(viewModel.episodes.count == 2)
        #expect(viewModel.isLoading == false)
    }

    @Test("Handles network errors gracefully")
    func handlesNetworkError() async {
        // Given
        let mockApi = MockApiClient()
        mockApi.shouldFail = true
        let viewModel = CalendarViewModel(api: mockApi)

        // When
        await viewModel.loadMonth(Date())

        // Then
        #expect(viewModel.error != nil)
        #expect(viewModel.episodes.isEmpty)
    }
}
```

## Common Anti-Patterns to Avoid

### 1. Over-reliance on @State in ViewModels

```swift
// ❌ BAD: Using @State in a ViewModel
@Observable
final class ViewModel {
    @State var count = 0 // Don't do this!
}

// ✅ GOOD: Regular properties in Observable
@Observable
final class ViewModel {
    var count = 0
}
```

### 2. Force Unwrapping

```swift
// ❌ BAD: Force unwrapping
let show = shows.first!
let poster = URL(string: show.posterPath!)!

// ✅ GOOD: Safe unwrapping
guard let show = shows.first else { return }
guard let posterPath = show.posterPath,
      let poster = URL(string: posterPath) else { return }
```

### 3. Massive View Models

```swift
// ❌ BAD: God object ViewModel
final class AppViewModel: ObservableObject {
    // Auth
    var user: User?
    func login() { }

    // Shows
    var shows: [Show]
    func fetchShows() { }

    // Settings
    var settings: Settings
    func updateSettings() { }

    // 500 more lines...
}

// ✅ GOOD: Focused ViewModels
final class AuthViewModel: ObservableObject { /* auth only */ }
final class ShowsViewModel: ObservableObject { /* shows only */ }
final class SettingsViewModel: ObservableObject { /* settings only */ }
```

## Quick Reference Checklist

Before considering any iOS feature complete, verify:

- [ ] Tests written BEFORE implementation
- [ ] Using `@Observable` instead of `ObservableObject`
- [ ] Computed properties instead of redundant state
- [ ] Enums for mutually exclusive states
- [ ] Proper async/await patterns (no detached tasks)
- [ ] No `DispatchQueue.asyncAfter` workarounds
- [ ] Protocol-based dependencies for testability
- [ ] Views broken into focused components
- [ ] Multiple preview variants created
- [ ] Errors are typed and user-friendly
- [ ] No force unwrapping (`!` or `as!`)
- [ ] Code follows "Is this idiomatic?" principle
