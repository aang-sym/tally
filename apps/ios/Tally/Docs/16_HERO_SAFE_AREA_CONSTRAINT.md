# Hero Section Safe Area Constraint

**Date:** October 29, 2025
**Status:** ✅ Complete

## Overview

Fixed an issue where bouncing logos in the hero section were entering the notch safe area on iPhone devices. The purple gradient and CRT scanlines correctly extend into the notch, but the interactive logos needed to be constrained to the area below the notch.

## Problem Statement

### Initial Issue

Logos were bouncing into the iPhone notch area, which looked incorrect and could potentially interfere with system UI elements. The hero section's visual effects (gradient and scanlines) correctly extended into the notch, but the physics boundaries for logos were not properly constrained.

### Root Cause

The hero section uses `.ignoresSafeArea(edges: .top)` to extend the gradient and scanlines into the notch. However, when a view ignores safe area, any `GeometryReader` inside that view reports `geometry.safeAreaInsets.top = 0` because the safe area has been ignored at the parent level.

The HeroSection component was trying to read `geometry.safeAreaInsets.top` AFTER the safe area was already ignored, resulting in a value of 0. This meant the logo physics boundaries started at the top of the screen (including the notch) rather than below it.

## Solution

### Approach

Capture the safe area insets **before** applying `.ignoresSafeArea()`, then pass the value as a parameter to child components that need it.

### Implementation

#### 1. HeroSection Component (`HeroSection.swift`)

**Added Parameter:**

```swift
struct HeroSection: View {
    let services: [StreamingService]
    var safeAreaTop: CGFloat = 0 // Safe area inset from parent (must be captured before ignoresSafeArea)
    var onLogoTap: ((StreamingService) -> Void)? = nil
    var heroHeight: CGFloat = 400
```

**Updated Body:**

```swift
var body: some View {
    GeometryReader { geometry in
        // Use safe area passed from parent (geometry.safeAreaInsets.top is 0 after ignoresSafeArea)
        let logoAreaHeight = geometry.size.height - safeAreaTop

        ZStack {
            if !services.isEmpty {
                ScatteredLogosView(
                    services: services,
                    collisionManager: LogoCollisionManager.shared,
                    heroHeight: logoAreaHeight,
                    safeAreaOffset: safeAreaTop,
                    onLogoTap: onLogoTap
                )
                .offset(y: safeAreaTop) // Offset entire container below notch
            }

            // CRT scanlines still cover full height
            CRTOverlayView(height: geometry.size.height)
                .allowsHitTesting(false)
        }
        .background(
            // Gradient still extends into notch
            LinearGradient(...)
                .ignoresSafeArea(edges: .top)
        )
        .onAppear {
            // Clear saved collision states to force reinitialization
            LogoCollisionManager.shared.logoStates.removeAll()
        }
    }
}
```

#### 2. DashboardView Component (`DashboardView.swift`)

**Updated homeTabContent:**

```swift
private var homeTabContent: some View {
    GeometryReader { geometry in
        // Capture safe area BEFORE ignoresSafeArea is applied
        let safeAreaTop = geometry.safeAreaInsets.top

        VStack(spacing: 0) {
            HeroSection(
                services: stableServices,
                safeAreaTop: safeAreaTop // Pass captured safe area
            ) { tappedService in
                // Handle logo tap
            }
            .frame(maxHeight: .infinity)
            .ignoresSafeArea(edges: .top)

            // Metrics row, buttons, etc.
        }
    }
}
```

#### 3. Logo Physics Updates

**ScatteredLogosView:**

- Receives `safeAreaOffset` parameter
- Passes to `BouncingLogoView`
- Container is offset by `safeAreaTop` using `.offset(y:)`

**BouncingLogoView:**

- Receives `safeAreaOffset` parameter
- Initial positions use 0-based coordinates (container is already offset)
- Vertical boundary checks simplified to use 0 to `containerSize.height`

**initializePosition():**

```swift
// No offset needed - container is already offset
position = CGPoint(
    x: containerSize.width * pos.x,
    y: containerSize.height * pos.y
)
```

**updatePosition() Vertical Boundaries:**

```swift
// Container is already offset, so use simple 0-based coordinates
if actualPosition.y - radiusY <= 0 || actualPosition.y + radiusY >= containerSize.height {
    newVelocity.y *= -1
    actualPosition.y = max(radiusY, min(containerSize.height - radiusY, actualPosition.y))
}
```

## Technical Details

### Key Insight

Instead of adjusting individual logo coordinates by adding `safeAreaOffset`, we offset the **entire container** that holds the logos. This makes the coordinate system clean (0-based within the offset container) and ensures logos physically cannot enter the notch area.

### Coordinate System

- **Before:** Logos used absolute coordinates from top of screen (including notch)
- **After:** Logo container is offset by `safeAreaTop`, logos use relative coordinates within container

### Safe Area Values

- Typical iPhone notch: ~47-59 points depending on device
- Dynamic Island devices: Similar or slightly larger
- Captured from geometry before applying `.ignoresSafeArea()`

### Collision Manager

Added `.onAppear { LogoCollisionManager.shared.logoStates.removeAll() }` to clear any cached logo positions from previous sessions that might have been in the notch area.

## Files Modified

1. **`Features/Dashboard/Components/HeroSection.swift`**
   - Added `safeAreaTop` parameter
   - Removed internal `geometry.safeAreaInsets.top` calculation
   - Applied `.offset(y: safeAreaTop)` to ScatteredLogosView
   - Added collision manager state clearing on appear

2. **`Features/Dashboard/DashboardView.swift`**
   - Wrapped `homeTabContent` in GeometryReader
   - Captured safe area before applying `.ignoresSafeArea()`
   - Passed `safeAreaTop` to HeroSection

3. **`Features/Dashboard/Components/HeroSection.swift` (BouncingLogoView)**
   - Updated position calculations to use 0-based coordinates
   - Simplified boundary checks

## Testing

### Expected Behavior

- ✅ Logos bounce within area below notch
- ✅ Purple gradient extends into notch
- ✅ CRT scanlines overlay entire height including notch
- ✅ Logo collision detection works correctly
- ✅ Logo positions persist across tab switches (via collision manager)

### Build Status

- ✅ Build succeeded with no errors
- ⚠️ Unrelated warning in SearchView.swift (pre-existing)

## Benefits

1. **Clean Solution:** Offset the container, not individual coordinates
2. **Maintainable:** Simple 0-based coordinate system for logo physics
3. **Explicit:** Safe area value is passed as parameter, making data flow clear
4. **Robust:** Collision manager cache is cleared to prevent stale positions
5. **Visual Correctness:** Gradient and scanlines still extend into notch as designed

## Related Components

- `HeroSection.swift` - Main hero container with gradient and scanlines
- `ScatteredLogosView` - Container for all bouncing logos
- `BouncingLogoView` - Individual logo with physics and collision detection
- `LogoCollisionManager` - Singleton managing logo states and collisions
- `DashboardView.swift` - Home tab layout including hero section

## Notes

- Safe area value must be captured **before** `.ignoresSafeArea()` is applied
- GeometryReader inside a view with `.ignoresSafeArea()` will report 0 for safe area insets
- Container offsetting is cleaner than adjusting individual element coordinates
- Collision manager state clearing prevents restoration of invalid cached positions
