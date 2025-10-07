---
description: Enforce TDD workflow - write tests before implementation
---

Let's practice Test-Driven Development (TDD). I will help you write tests BEFORE implementing the feature.

## TDD Process:

1. **Write a Failing Test**
   - Define what the feature should do
   - Write a test that expects that behavior
   - Run the test and confirm it fails

2. **Implement Minimal Code**
   - Write just enough code to make the test pass
   - No extra features or premature optimization

3. **Refactor**
   - Improve the code while keeping tests green
   - Check for idiomatic patterns

4. **Repeat**
   - Add the next test for the next piece of functionality

## Test Requirements:

- Use Swift Testing framework (`import Testing`)
- Include `@Suite` and `@Test` attributes
- Use `#expect` for assertions
- Test should be in `apps/ios/Tally/Tests/`
- Use mock/fake dependencies (protocols)
- Cover happy path, error cases, and edge cases

## Example Test Structure:

```swift
import Testing
@testable import Tally

@Suite("Feature Name Tests")
struct FeatureTests {

    @Test("Does something specific")
    func testSpecificBehavior() async throws {
        // Given
        let mockDependency = MockDependency()
        let sut = SystemUnderTest(dependency: mockDependency)

        // When
        await sut.performAction()

        // Then
        #expect(sut.result == expectedValue)
    }
}
```

## Ready to Start TDD?

What feature are you implementing? I'll help you write the test first.
