# Swift Testing Framework Guidelines

This document provides guidelines for testing the Tally iOS app using the Swift Testing framework.

## Core Testing Principles

### Test-Driven Development (TDD) Workflow

**ALWAYS write tests before implementation:**

1. **Red**: Write a failing test
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve while keeping tests green
4. **Repeat**: Next feature

### Test Structure: Given-When-Then

```swift
import Testing
@testable import Tally

@Test("Does something specific")
func testBehavior() async throws {
    // Given - Setup
    let mock = MockDependency()
    let sut = SystemUnderTest(dependency: mock)

    // When - Execute
    await sut.performAction()

    // Then - Assert
    #expect(sut.result == expectedValue)
}
```

## Swift Testing Framework Basics

### Importing and Setup

```swift
import Testing
@testable import Tally  // Access internal types

@Suite("Feature Name Tests")
struct FeatureTests {
    // Tests go here
}
```

### Test Attributes

```swift
// Basic test
@Test("Description of what is being tested")
func testSomething() {
    // test code
}

// Async test
@Test("Async operation")
func testAsync() async {
    await someAsyncFunction()
}

// Test that should throw
@Test("Error handling")
func testError() throws {
    try somethingThatThrows()
}

// Parameterized test
@Test("Multiple inputs", arguments: [1, 2, 3, 4])
func testWithParam(value: Int) {
    #expect(value > 0)
}

// Conditional test (run only on iOS 17+)
@Test(.enabled(if: ProcessInfo.processInfo.operatingSystemVersion.majorVersion >= 17))
func testNewerFeature() {
    // test code
}
```

### Assertions

```swift
// Basic expectation
#expect(value == expected)

// Boolean check
#expect(items.isEmpty)
#expect(!hasError)

// Optionals
#expect(user != nil)

// Throwing
#expect(throws: ApiError.unauthorized) {
    try api.fetch()
}

// Custom message
#expect(count == 5, "Expected 5 items but got \(count)")

// Multiple conditions
#expect(user.name == "Alice")
#expect(user.age == 30)
```

## Testing Patterns

### 1. ViewModel Testing

```swift
import Testing
@testable import Tally

@Suite("Watchlist ViewModel Tests")
struct WatchlistViewModelTests {

    @Test("Loads shows successfully")
    func loadsShows() async {
        // Given
        let mockApi = MockApiClient()
        mockApi.mockShows = [
            .preview(title: "Breaking Bad"),
            .preview(title: "The Office")
        ]
        let sut = WatchlistViewModel(api: mockApi)

        // When
        await sut.loadShows()

        // Then
        #expect(sut.shows.count == 2)
        #expect(sut.shows[0].title == "Breaking Bad")
        #expect(sut.error == nil)
    }

    @Test("Handles API error gracefully")
    func handlesError() async {
        // Given
        let mockApi = MockApiClient()
        mockApi.shouldFail = true
        let sut = WatchlistViewModel(api: mockApi)

        // When
        await sut.loadShows()

        // Then
        #expect(sut.shows.isEmpty)
        #expect(sut.error != nil)
    }

    @Test("Filters shows by status", arguments: ShowStatus.allCases)
    func filtersShows(status: ShowStatus) async {
        // Given
        let mockApi = MockApiClient()
        mockApi.mockShows = [
            .preview(status: .watching),
            .preview(status: .completed),
            .preview(status: .watchlist)
        ]
        let sut = WatchlistViewModel(api: mockApi)

        // When
        await sut.filterBy(status: status)

        // Then
        #expect(sut.filteredShows.allSatisfy { $0.status == status })
    }
}
```

### 2. Service/API Client Testing

```swift
@Suite("API Client Tests")
struct ApiClientTests {

    @Test("Parses login response correctly")
    func parsesLoginResponse() async throws {
        // Given
        let mockData = """
        {
            "success": true,
            "data": {
                "user": { "id": "123", "email": "test@example.com" },
                "token": "abc123"
            }
        }
        """.data(using: .utf8)!

        let mockSession = MockURLSession(data: mockData, statusCode: 200)
        let sut = LiveApiClient(session: mockSession)

        // When
        let user = try await sut.login(email: "test@example.com", password: "pass")

        // Then
        #expect(user.id == "123")
        #expect(user.email == "test@example.com")
        #expect(user.token == "abc123")
    }

    @Test("Throws unauthorized error on 401")
    func throwsUnauthorized() async {
        // Given
        let mockSession = MockURLSession(statusCode: 401)
        let sut = LiveApiClient(session: mockSession)

        // When/Then
        await #expect(throws: ApiError.unauthorized) {
            try await sut.login(email: "test@example.com", password: "wrong")
        }
    }
}
```

### 3. Business Logic Testing

```swift
@Suite("Episode Scheduling Logic Tests")
struct EpisodeSchedulingTests {

    @Test("Calculates next episode date for weekly show")
    func calculatesWeeklyEpisode() {
        // Given
        let pattern = ReleasePattern.weekly
        let lastEpisode = Date(timeIntervalSince1970: 1000000)

        // When
        let nextDate = EpisodeScheduler.calculateNext(
            after: lastEpisode,
            pattern: pattern
        )

        // Then
        let expectedDate = Calendar.current.date(
            byAdding: .day,
            value: 7,
            to: lastEpisode
        )!
        #expect(nextDate == expectedDate)
    }

    @Test("Handles different release patterns", arguments: [
        (ReleasePattern.weekly, 7),
        (ReleasePattern.biweekly, 14),
        (ReleasePattern.monthly, 30)
    ])
    func handlesPatterns(pattern: ReleasePattern, expectedDays: Int) {
        // Given
        let baseDate = Date()

        // When
        let nextDate = EpisodeScheduler.calculateNext(
            after: baseDate,
            pattern: pattern
        )

        // Then
        let daysDiff = Calendar.current.dateComponents(
            [.day],
            from: baseDate,
            to: nextDate
        ).day
        #expect(daysDiff == expectedDays)
    }
}
```

### 4. State Management Testing

```swift
@Suite("Loading State Tests")
struct LoadingStateTests {

    @Test("Transitions through states correctly")
    func stateTransitions() async {
        // Given
        let mockApi = MockApiClient()
        let sut = ShowDetailViewModel(api: mockApi)

        // Initial state
        #expect(sut.state == .idle)

        // When - Start loading
        Task {
            await sut.load()
        }

        // Then - Should be loading
        try? await Task.sleep(nanoseconds: 10_000_000) // 10ms
        #expect(sut.state == .loading)

        // Wait for completion
        try? await Task.sleep(nanoseconds: 100_000_000) // 100ms
        if case .loaded(let show) = sut.state {
            #expect(show != nil)
        } else {
            Issue.record("Expected loaded state")
        }
    }
}
```

## Mock Objects

### Creating Effective Mocks

```swift
// Protocol definition
protocol ApiClientProtocol {
    func fetchShows() async throws -> [Show]
    func fetchEpisodes(showId: Int) async throws -> [Episode]
}

// Mock implementation
final class MockApiClient: ApiClientProtocol {
    // Control behavior
    var shouldFail = false
    var failureError: Error = ApiError.network

    // Mock data
    var mockShows: [Show] = []
    var mockEpisodes: [Episode] = []

    // Track calls (useful for verification)
    var fetchShowsCalled = false
    var fetchEpisodesCallCount = 0

    func fetchShows() async throws -> [Show] {
        fetchShowsCalled = true

        if shouldFail {
            throw failureError
        }

        return mockShows
    }

    func fetchEpisodes(showId: Int) async throws -> [Episode] {
        fetchEpisodesCallCount += 1

        if shouldFail {
            throw failureError
        }

        return mockEpisodes
    }

    // Helper to reset state between tests
    func reset() {
        shouldFail = false
        mockShows = []
        mockEpisodes = []
        fetchShowsCalled = false
        fetchEpisodesCallCount = 0
    }
}
```

### Mock URL Session

```swift
final class MockURLSession {
    let data: Data
    let response: HTTPURLResponse
    let error: Error?

    init(
        data: Data = Data(),
        statusCode: Int = 200,
        error: Error? = nil
    ) {
        self.data = data
        self.response = HTTPURLResponse(
            url: URL(string: "http://test.com")!,
            statusCode: statusCode,
            httpVersion: nil,
            headerFields: nil
        )!
        self.error = error
    }

    func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        if let error = error {
            throw error
        }
        return (data, response)
    }
}
```

## Preview Data

Create reusable preview data:

```swift
// In Model files
extension Show {
    static func preview(
        title: String = "Breaking Bad",
        status: ShowStatus = .watching
    ) -> Show {
        Show(
            id: UUID().uuidString,
            tmdbId: 1396,
            title: title,
            overview: "A high school chemistry teacher turned methamphetamine producer.",
            posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
            status: status.rawValue
        )
    }

    static var previewData: [Show] {
        [
            .preview(title: "Breaking Bad", status: .watching),
            .preview(title: "The Office", status: .completed),
            .preview(title: "Stranger Things", status: .watchlist)
        ]
    }
}

extension Episode {
    static func preview(
        number: Int = 1,
        title: String = "Pilot"
    ) -> Episode {
        Episode(
            id: "\(number)",
            episodeNumber: number,
            name: title,
            airDate: "2024-01-01",
            overview: "The first episode"
        )
    }
}
```

## Test Organization

### File Structure

```
Tests/
├── ViewModelTests/
│   ├── WatchlistViewModelTests.swift
│   ├── CalendarViewModelTests.swift
│   └── SearchViewModelTests.swift
├── ServiceTests/
│   ├── ApiClientTests.swift
│   ├── PersistenceTests.swift
│   └── SchedulerTests.swift
├── BusinessLogicTests/
│   ├── EpisodeSchedulingTests.swift
│   └── CostCalculationTests.swift
└── Mocks/
    ├── MockApiClient.swift
    ├── MockPersistence.swift
    └── MockURLSession.swift
```

### Test Suite Naming

```swift
// Feature-based suites
@Suite("Watchlist Feature Tests")
@Suite("Calendar Feature Tests")

// Component-based suites
@Suite("API Client Tests")
@Suite("Episode Scheduler Tests")

// Behavior-based suites
@Suite("Authentication Flow Tests")
@Suite("Episode Progress Tracking Tests")
```

## Coverage Guidelines

### What to Test

✅ **Must Test:**

- All ViewModels
- Business logic (calculations, scheduling, etc.)
- API response parsing
- Error handling paths
- State transitions
- Edge cases (empty lists, nil values, etc.)

✅ **Should Test:**

- Complex view logic
- Custom algorithms
- Data transformations
- Integration between layers

❌ **Don't Test:**

- SwiftUI framework behavior
- Simple getters/setters
- Pure UI rendering (use manual testing/previews)

### Coverage Targets

- **ViewModels**: 90%+ coverage
- **Business Logic**: 100% coverage
- **Services**: 80%+ coverage
- **Overall**: 80%+ coverage

## Running Tests

### Command Line

```bash
# Run all tests
swift test

# Run specific suite
swift test --filter WatchlistViewModelTests

# Run with coverage
swift test --enable-code-coverage
```

### Xcode

- **⌘ + U**: Run all tests
- **⌃ + ⌥ + ⌘ + U**: Run tests in current file
- Click diamond in gutter: Run single test

## Common Testing Patterns

### Testing Async Operations

```swift
@Test("Async load completes")
func asyncLoad() async {
    let sut = ViewModel(api: mockApi)
    await sut.load()
    #expect(sut.isLoaded)
}
```

### Testing Errors

```swift
@Test("Handles specific error")
func handlesError() async {
    #expect(throws: ApiError.unauthorized) {
        try await api.login(email: "", password: "")
    }
}
```

### Testing State Changes

```swift
@Test("Updates state on success")
func updatesState() async {
    let sut = ViewModel(api: mockApi)
    await sut.load()

    if case .loaded(let data) = sut.state {
        #expect(data.count > 0)
    } else {
        Issue.record("Expected loaded state")
    }
}
```

### Testing with Multiple Parameters

```swift
@Test("Validates different inputs", arguments: [
    ("valid@email.com", true),
    ("invalid", false),
    ("", false)
])
func validatesEmail(email: String, expected: Bool) {
    let result = EmailValidator.validate(email)
    #expect(result == expected)
}
```

## TDD Example: Complete Cycle

Let's implement a feature to filter shows by streaming provider using TDD:

### Step 1: Write Failing Test

```swift
@Test("Filters shows by provider")
func filtersShowsByProvider() async {
    // Given
    let netflix = StreamingProvider(id: 8, name: "Netflix")
    let hulu = StreamingProvider(id: 15, name: "Hulu")

    let mockApi = MockApiClient()
    mockApi.mockShows = [
        .preview(title: "Show 1", provider: netflix),
        .preview(title: "Show 2", provider: hulu),
        .preview(title: "Show 3", provider: netflix)
    ]

    let sut = WatchlistViewModel(api: mockApi)
    await sut.loadShows()

    // When
    sut.filterByProvider(netflix)

    // Then
    #expect(sut.filteredShows.count == 2)
    #expect(sut.filteredShows.allSatisfy { $0.provider?.id == 8 })
}
```

### Step 2: Minimal Implementation

```swift
@Observable
final class WatchlistViewModel {
    var shows: [Show] = []
    var filteredShows: [Show] = []

    func filterByProvider(_ provider: StreamingProvider) {
        filteredShows = shows.filter { $0.provider?.id == provider.id }
    }
}
```

### Step 3: Run Test (Should Pass)

### Step 4: Refactor

```swift
@Observable
final class WatchlistViewModel {
    var shows: [Show] = []
    var selectedProvider: StreamingProvider?

    var filteredShows: [Show] {
        guard let provider = selectedProvider else {
            return shows
        }
        return shows.filter { $0.provider?.id == provider.id }
    }

    func selectProvider(_ provider: StreamingProvider?) {
        selectedProvider = provider
    }
}
```

### Step 5: Test Still Passes ✅

## Checklist: Before Merging Code

- [ ] All tests pass
- [ ] New features have tests
- [ ] Tests follow Given-When-Then structure
- [ ] Mocks are used for dependencies
- [ ] Edge cases are covered
- [ ] Error paths are tested
- [ ] Async operations are properly tested
- [ ] No flaky tests (tests that randomly fail)
