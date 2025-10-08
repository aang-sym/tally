---
description: Review code for idiomatic Swift/SwiftUI patterns
---

Review the code for non-idiomatic patterns and suggest idiomatic alternatives.

Check for these common anti-patterns:

1. **State Management Issues**
   - Using state flags instead of computed properties
   - Multiple booleans instead of enum-based state
   - Unnecessary `@Published` or state variables

2. **Concurrency Problems**
   - Detached tasks instead of structured concurrency
   - `DispatchQueue.asyncAfter` workarounds
   - Missing `@MainActor` annotations

3. **SwiftUI Anti-Patterns**
   - Force unwrapping (`!` or `as!`)
   - Not trusting SwiftUI lifecycle
   - Overriding built-in behaviors unnecessarily

4. **Architecture Issues**
   - Hard dependencies (no protocol abstraction)
   - Mixing business logic with view code
   - Massive view models or views

For each issue found:

1. Explain why it's not idiomatic
2. Show the idiomatic alternative
3. Estimate lines of code that can be removed
4. Highlight any performance or maintainability benefits

Reference: `apps/ios/Tally/.claude/docs/swift.md` for patterns.

What code would you like me to review?
