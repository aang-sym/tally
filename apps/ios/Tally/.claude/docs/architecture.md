# Tally iOS Architecture Patterns

This document outlines the architecture patterns and dependency injection approach for the Tally iOS app.

## Protocol-Based Dependency Injection

### Core Principle

Every external dependency (networking, persistence, device services) should be abstracted behind a protocol. This makes code testable, maintainable, and flexible.

### Pattern Structure

```
Protocol (Interface) → Live Implementation + Mock Implementation
                    ↓
              ViewModels/Services use protocol
```

### Example: API Client

```swift
// 1. Define the protocol
protocol ApiClientProtocol {
    func login(email: String, password: String) async throws -> AuthenticatedUser
    func fetchShows() async throws -> [Show]
    func fetchEpisodes(showId: Int) async throws -> [Episode]
}

// 2. Live implementation (production)
final class LiveApiClient: ApiClientProtocol {
    private let baseURL: URL
    private var token: String?

    init(baseURL: URL) {
        self.baseURL = baseURL
    }

    func login(email: String, password: String) async throws -> AuthenticatedUser {
        // Real network implementation
        let url = baseURL.appendingPathComponent("/api/users/login")
        // ... actual HTTP call
    }

    func fetchShows() async throws -> [Show] {
        // Real network implementation
    }
}

// 3. Mock implementation (testing & previews)
final class MockApiClient: ApiClientProtocol {
    var mockUser: AuthenticatedUser?
    var mockShows: [Show] = []
    var shouldFail: Bool = false

    func login(email: String, password: String) async throws -> AuthenticatedUser {
        if shouldFail {
            throw ApiError.unauthorized
        }
        return mockUser ?? AuthenticatedUser.preview
    }

    func fetchShows() async throws -> [Show] {
        if shouldFail {
            throw ApiError.network
        }
        return mockShows
    }
}

// 4. ViewModels depend on protocol, not concrete type
@Observable
@MainActor
final class WatchlistViewModel {
    private let api: ApiClientProtocol
    var shows: [Show] = []
    var error: Error?

    init(api: ApiClientProtocol) {
        self.api = api
    }

    func loadShows() async {
        do {
            shows = try await api.fetchShows()
        } catch {
            self.error = error
        }
    }
}

// 5. Usage in production
let liveApi = LiveApiClient(baseURL: URL(string: "https://api.tally.com")!)
let viewModel = WatchlistViewModel(api: liveApi)

// 6. Usage in tests
let mockApi = MockApiClient()
mockApi.mockShows = [.preview1, .preview2]
let viewModel = WatchlistViewModel(api: mockApi)

// 7. Usage in previews
#Preview {
    let mockApi = MockApiClient()
    mockApi.mockShows = Show.previewData
    let vm = WatchlistViewModel(api: mockApi)
    WatchlistView(viewModel: vm)
}
```

## Current Architecture in Tally

### Existing Pattern: ApiClient

The `ApiClient.swift` already follows a good pattern, but can be enhanced:

**Current State (apps/ios/Tally/Services/ApiClient.swift:626-658):**

- Concrete class with optional protocol methods for testing
- `#if DEBUG` injection methods for previews

**Enhancement Opportunity:**

1. Extract `ApiClientProtocol` interface
2. Rename current `ApiClient` to `LiveApiClient`
3. Create `MockApiClient` for testing
4. Update ViewModels to depend on protocol

### Persistence Layer

**Current:** Direct `UserDefaults` usage in some places

**Idiomatic Pattern:**

```swift
protocol PersistenceProtocol {
    func save<T: Codable>(_ value: T, forKey key: String) throws
    func load<T: Codable>(forKey key: String) throws -> T?
    func delete(forKey key: String)
}

final class UserDefaultsPersistence: PersistenceProtocol {
    private let userDefaults: UserDefaults

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
    }

    func save<T: Codable>(_ value: T, forKey key: String) throws {
        let data = try JSONEncoder().encode(value)
        userDefaults.set(data, forKey: key)
    }
    // ... rest of implementation
}

final class MockPersistence: PersistenceProtocol {
    var storage: [String: Any] = [:]

    func save<T: Codable>(_ value: T, forKey key: String) throws {
        storage[key] = value
    }
    // ... rest of implementation
}
```

### Device Services

For services like location, notifications, etc:

```swift
protocol LocationServiceProtocol {
    func requestPermission() async -> Bool
    func getCurrentLocation() async throws -> Location
}

final class LiveLocationService: LocationServiceProtocol {
    private let locationManager = CLLocationManager()
    // Real implementation
}

final class MockLocationService: LocationServiceProtocol {
    var mockLocation: Location?
    var shouldGrantPermission: Bool = true

    func requestPermission() async -> Bool {
        shouldGrantPermission
    }

    func getCurrentLocation() async throws -> Location {
        guard let location = mockLocation else {
            throw LocationError.notAvailable
        }
        return location
    }
}
```

## Dependency Container (Optional)

For complex apps, a simple dependency container helps manage object creation:

```swift
@MainActor
final class AppDependencies {
    let api: ApiClientProtocol
    let persistence: PersistenceProtocol

    init(
        api: ApiClientProtocol,
        persistence: PersistenceProtocol
    ) {
        self.api = api
        self.persistence = persistence
    }

    // Production dependencies
    static func production() -> AppDependencies {
        let api = LiveApiClient(baseURL: Environment.apiURL)
        let persistence = UserDefaultsPersistence()
        return AppDependencies(api: api, persistence: persistence)
    }

    // Testing dependencies
    static func mock() -> AppDependencies {
        let api = MockApiClient()
        let persistence = MockPersistence()
        return AppDependencies(api: api, persistence: persistence)
    }
}

// Usage in app entry point
@main
struct TallyApp: App {
    let dependencies = AppDependencies.production()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.dependencies, dependencies)
        }
    }
}

// Custom environment key
private struct DependenciesKey: EnvironmentKey {
    static let defaultValue = AppDependencies.mock()
}

extension EnvironmentValues {
    var dependencies: AppDependencies {
        get { self[DependenciesKey.self] }
        set { self[DependenciesKey.self] = newValue }
    }
}

// Usage in views
struct WatchlistView: View {
    @Environment(\.dependencies) private var deps
    @State private var viewModel: WatchlistViewModel?

    var body: some View {
        // ...
        .task {
            viewModel = WatchlistViewModel(api: deps.api)
        }
    }
}
```

## ViewModel Architecture

### Structure

```swift
@Observable
@MainActor
final class [Feature]ViewModel {
    // MARK: - Dependencies
    private let api: ApiClientProtocol
    private let persistence: PersistenceProtocol

    // MARK: - Published State
    var state: LoadingState<Data> = .idle
    var selectedItem: Item?

    // MARK: - Computed Properties
    var isEmpty: Bool {
        // Derived from state
    }

    // MARK: - Initialization
    init(api: ApiClientProtocol, persistence: PersistenceProtocol) {
        self.api = api
        self.persistence = persistence
    }

    // MARK: - Public Methods
    func load() async {
        // Implementation
    }

    func select(_ item: Item) {
        // Implementation
    }

    // MARK: - Private Helpers
    private func handleError(_ error: Error) {
        // Error handling
    }
}
```

### ViewModel Rules

1. **Single Responsibility**: Each ViewModel handles one feature/screen
2. **Dependencies via Protocol**: All external dependencies injected through protocols
3. **@MainActor**: Mark ViewModels that update UI state
4. **Computed Properties**: Derive state instead of storing duplicates
5. **Async Methods**: Use async/await for asynchronous operations
6. **Error Handling**: Handle errors gracefully and update state

## Testing with DI

### Unit Test Example

```swift
import Testing
@testable import Tally

@Suite("Watchlist ViewModel Tests")
struct WatchlistViewModelTests {

    @Test("Loads shows successfully")
    func loadsShows() async throws {
        // Given
        let mockApi = MockApiClient()
        mockApi.mockShows = [
            Show.preview(title: "Show 1"),
            Show.preview(title: "Show 2")
        ]
        let viewModel = WatchlistViewModel(api: mockApi)

        // When
        await viewModel.loadShows()

        // Then
        #expect(viewModel.shows.count == 2)
        #expect(viewModel.shows[0].title == "Show 1")
    }

    @Test("Handles network error")
    func handlesNetworkError() async {
        // Given
        let mockApi = MockApiClient()
        mockApi.shouldFail = true
        let viewModel = WatchlistViewModel(api: mockApi)

        // When
        await viewModel.loadShows()

        // Then
        #expect(viewModel.shows.isEmpty)
        #expect(viewModel.error != nil)
    }
}
```

## File Organization

```
Tally/
├── App/
│   ├── TallyApp.swift
│   └── Config/
│       ├── Environment.swift
│       └── Dependencies.swift
├── Core/
│   ├── Models/          # Domain models
│   ├── Protocols/       # All protocol definitions
│   │   ├── ApiClientProtocol.swift
│   │   ├── PersistenceProtocol.swift
│   │   └── ...
│   └── Utilities/
├── Services/
│   ├── API/
│   │   ├── LiveApiClient.swift
│   │   └── MockApiClient.swift
│   ├── Persistence/
│   │   ├── UserDefaultsPersistence.swift
│   │   └── MockPersistence.swift
│   └── ...
├── Features/
│   ├── Watchlist/
│   │   ├── WatchlistView.swift
│   │   ├── WatchlistViewModel.swift
│   │   └── Components/
│   ├── Calendar/
│   │   ├── CalendarView.swift
│   │   ├── CalendarViewModel.swift
│   │   └── Components/
│   └── ...
├── UI/
│   ├── Components/      # Reusable UI components
│   └── Theme/
└── Tests/
    ├── ViewModelTests/
    ├── ServiceTests/
    └── Mocks/           # Shared mock implementations
```

## Migration Path for Existing Code

1. **Extract Protocols First**

   ```swift
   // Create ApiClientProtocol.swift
   protocol ApiClientProtocol { /* extract from ApiClient */ }
   ```

2. **Make Existing Class Conform**

   ```swift
   // Update ApiClient.swift
   final class ApiClient: ApiClientProtocol { /* existing code */ }
   ```

3. **Create Mock Implementation**

   ```swift
   // Create MockApiClient.swift
   final class MockApiClient: ApiClientProtocol { /* mock methods */ }
   ```

4. **Update ViewModels**

   ```swift
   // Change from: let api = ApiClient()
   // Change to:   let api: ApiClientProtocol
   init(api: ApiClientProtocol) { self.api = api }
   ```

5. **Update Tests and Previews**
   ```swift
   // Tests: Use MockApiClient
   // Previews: Use MockApiClient with preview data
   ```

## Benefits Summary

✅ **Testability**: Easy to test with mock implementations
✅ **Flexibility**: Swap implementations without changing business logic
✅ **Previews**: Quick SwiftUI previews with fake data
✅ **Maintainability**: Clear separation of concerns
✅ **Type Safety**: Compile-time checking of dependencies
✅ **Isolation**: Features don't depend on concrete implementations
