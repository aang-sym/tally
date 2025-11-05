# iOS 26 SwiftUI Compliance Audit for DashboardView

**File**: `apps/ios/Tally/Features/Dashboard/DashboardView.swift`
**Last Reviewed**: 2025-11-05
**iOS Target**: iOS 26
**Status**:  Mostly compliant, minor improvements recommended

---

## Overview

DashboardView has been audited against SwiftUI iOS 26 documentation using Context7. The implementation uses modern patterns correctly, but there are opportunities to leverage newer iOS 26 APIs for better performance and more idiomatic code.

---

##  Current iOS 26 Patterns (Well Implemented)

### 1. **Modern TabView with Tab Role** (Lines 69-92)
-  Uses new `Tab` view structure with `.search` role
-  Implements native iOS 26 search button behavior
-  Proper tab selection binding with `@State`

```swift
Tab(value: .search, role: .search) {
    NavigationStack {
        searchResultsContent
    }
}
```

### 2. **Native Searchable Modifier** (Line 93)
-  Uses `.searchable(text:prompt:)` correctly
-  Proper `@State` binding for search text

### 3. **Custom Alignment Guides** (Lines 591-609)
-  Correctly implements `AlignmentID` protocol
-  Custom `tickerAnchor` and `expandedTickerTop` alignments
-  Proper default value implementation

```swift
extension VerticalAlignment {
    private struct TickerAnchorAlignment: AlignmentID {
        static func defaultValue(in context: ViewDimensions) -> CGFloat {
            context[VerticalAlignment.center]
        }
    }
    static let tickerAnchor = VerticalAlignment(TickerAnchorAlignment.self)
}
```

### 4. **Namespace for Matched Geometry** (Lines 34-35)
-  Uses `@Namespace` for provider and ticker transitions
-  Passes namespace to child views correctly

### 5. **Structured Animations** (Throughout)
-  Consistent use of `.spring(response:dampingFraction:)`
-  Proper `withAnimation` blocks for state changes

---

## =' Recommended iOS 26 Improvements

### **Priority 1: Add Navigation Transitions for Matched Geometry**

**Current Issue**: Provider detail transitions use namespace but don't declare explicit navigation transition.

**File Location**: Lines 113-119, 233-247

**Recommended Change**:
```swift
// In HeroSection tap handler (Line 113-119)
HeroSection(
    services: stableServices,
    safeAreaTop: safeAreaTop,
    scanlineStyle: "horizontal-rgb-fill",
    scanlineFillMode: true
) { tappedService in
    if let subscription = viewModel.subscriptions.first(where: { $0.service?.id == tappedService.id }) {
        withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
            selectedProviderSubscription = subscription
            showProviderDetail = true
        }
    }
}
.matchedTransitionSource(id: "hero-provider", in: providerNamespace)

// In ProviderDetailSheet (Lines 234-247)
GlassEffectContainer(spacing: 20.0) {
    ProviderDetailSheet(
        subscription: subscription,
        namespace: providerNamespace,
        isShown: $showProviderDetail
    )
    .navigationTransition(.zoom(sourceID: "hero-provider", in: providerNamespace))
    .padding(.horizontal, Spacing.screenPadding)
    .transition(.scale(scale: 0.95).combined(with: .opacity))
}
```

**Benefits**:
- Smoother hero-to-detail transitions
- System-optimized zoom animations
- Better integration with navigation stack

**Task**: Add `matchedTransitionSource` and `navigationTransition(.zoom)` for provider detail transitions

---

### **Priority 2: Explicit TabView Style**

**Current Issue**: Relies on default tab styling (implicit `.automatic`)

**File Location**: Line 92 (after TabView closing brace)

**Recommended Change**:
```swift
TabView(selection: $selectedTab) {
    // ... tabs
}
.tabViewStyle(.automatic) // Explicit for clarity
.searchable(text: $searchText, prompt: "Search for shows...")
.frame(maxHeight: .infinity)

// OR for iPad/Mac support:
.tabViewStyle(.sidebarAdaptable)
```

**Benefits**:
- Explicit intent for code reviewers
- Easier to adapt for iPad with sidebar
- Self-documenting code

**Task**: Add explicit `.tabViewStyle(.automatic)` after TabView (or `.sidebarAdaptable` if iPad support is planned)

---

### **Priority 3: Enhanced Search with Tokens (Optional)**

**Current Issue**: Basic text search without token support

**File Location**: Line 93

**Recommended Enhancement** (if filtering by service/genre is needed):
```swift
@State private var searchText = ""
@State private var searchTokens: [SearchToken] = []
@State private var suggestedTokens: [SearchToken] = []

// In body
.searchable(
    text: $searchText,
    tokens: $searchTokens,
    suggestedTokens: $suggestedTokens,
    prompt: "Search for shows..."
) { token in
    Label(token.name, systemImage: token.icon)
}

// Define SearchToken
enum SearchToken: Identifiable, Hashable {
    case service(String)
    case genre(String)

    var id: String {
        switch self {
        case .service(let name): return "service-\(name)"
        case .genre(let name): return "genre-\(name)"
        }
    }

    var name: String {
        switch self {
        case .service(let name), .genre(let name): return name
        }
    }

    var icon: String {
        switch self {
        case .service: return "app.fill"
        case .genre: return "tag.fill"
        }
    }
}
```

**Benefits**:
- Richer search filtering (by service, genre, etc.)
- Native iOS 26 token chips UI
- Better UX for power users

**Task** (Optional): Implement search tokens if multi-criteria filtering is needed

---

### **Priority 4: Consider CustomAnimation for Complex Ticker Animations**

**Current Issue**: Using standard `.spring()` for all animations

**File Location**: Lines 115-118, 156-170, 191-195

**Potential Enhancement** (for advanced cases):
```swift
// Define custom animation with AnimationContext
struct TickerExpandAnimation: CustomAnimation {
    var base: Animation = .spring(response: 0.5, dampingFraction: 0.8)

    func animate<V: VectorArithmetic>(
        value: V,
        time: TimeInterval,
        context: inout AnimationContext<V>
    ) -> V? {
        // Custom animation logic with state management
        return base.animate(value: value, time: time, context: &context)
    }
}

// Usage
withAnimation(TickerExpandAnimation()) {
    showTickerExpanded = true
}
```

**Benefits**:
- Fine-grained control over animation state
- Better performance for complex multi-stage animations
- Can store custom state in AnimationContext

**Task** (Low Priority): Evaluate if current spring animations meet performance needs. Consider `CustomAnimation` protocol only if you need stateful animations or custom easing curves beyond standard springs.

---

## =Ë Action Items for Claude Code

### Immediate Tasks (Can be done now)

1. **Add explicit TabView style**
   - File: `DashboardView.swift:92`
   - Add: `.tabViewStyle(.automatic)` after TabView
   - Estimated: 2 minutes

2. **Add navigation transitions for provider detail**
   - Files: `DashboardView.swift:113-119, 233-247`
   - Add: `.matchedTransitionSource()` to hero, `.navigationTransition(.zoom())` to detail
   - Estimated: 15 minutes
   - Requires: Testing to ensure smooth transitions

### Future Enhancements (Evaluate need first)

3. **Implement search tokens** (if multi-criteria search is needed)
   - File: `DashboardView.swift:27, 93`
   - Add: SearchToken model, update `.searchable()` with tokens
   - Estimated: 1 hour
   - Depends on: Product requirements for search filtering

4. **Evaluate CustomAnimation** (only if performance issues arise)
   - File: `DashboardView.swift` (various animation sites)
   - Create: Custom animation types with AnimationContext
   - Estimated: 2 hours
   - Trigger: Performance profiling shows animation frame drops

---

## >ê Testing Checklist

After implementing recommended changes:

- [ ] Provider tap from hero ’ smooth zoom transition to detail sheet
- [ ] Detail sheet dismiss ’ smooth reverse zoom back to hero
- [ ] Tab switching maintains state correctly
- [ ] Search field appears/dismisses smoothly
- [ ] Ticker expand/collapse animations remain smooth
- [ ] No performance regressions (60fps maintained)
- [ ] Test on physical device (not just simulator)
- [ ] Test with accessibility features enabled (VoiceOver, Reduce Motion)

---

## =Ú Reference Documentation

- [SwiftUI Navigation Transitions](https://developer.apple.com/documentation/swiftui/navigationtransition)
- [Matched Transition Source](https://developer.apple.com/documentation/swiftui/view/matchedtransitionsource(id:in:))
- [TabView Styles](https://developer.apple.com/documentation/swiftui/tabviewstyle)
- [Searchable with Tokens](https://developer.apple.com/documentation/swiftui/view/searchable(text:tokens:suggestedtokens:ispresented:placement:prompt:token:))
- [Custom Animations](https://developer.apple.com/documentation/swiftui/customanimation)
- [Alignment Guides](https://developer.apple.com/documentation/swiftui/aligning-views-across-stacks)

---

## =Ý Notes

- **Breaking Changes**: None of the recommended changes break existing functionality
- **Backward Compatibility**: All iOS 26 APIs used have iOS 26+ availability
- **Performance**: Navigation transitions may improve perceived performance
- **Accessibility**: All recommendations maintain or improve accessibility support

---

## Version History

- **2025-11-05**: Initial audit against iOS 26 SwiftUI documentation
- Status: 4 improvement recommendations identified, 0 critical issues
