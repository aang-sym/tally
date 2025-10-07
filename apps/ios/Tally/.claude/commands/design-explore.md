---
description: Create throwaway demo file with multiple UI design approaches
---

Create a throwaway demo Swift file with 3-4 different visual approaches for the UI component I'm about to describe.

Requirements:

1. Create a new file named `[ComponentName]Demo.swift` in the appropriate feature folder
2. Implement 3-4 different design variants (e.g., badge, icon, ribbon, footer styles)
3. Use mock/fake data - no dependency injection or real data needed
4. Add individual `#Preview` blocks for each variant so I can compare them in Xcode
5. Include clear comments explaining each approach
6. Keep it simple - focus only on visual design, not architecture

This is a throwaway file for exploration. Once I choose an approach, we'll properly integrate it into the production codebase with proper architecture.

Example structure:

```swift
// [ComponentName]Demo.swift
import SwiftUI

// Approach 1: Badge variant
struct BadgeVariant: View { ... }

// Approach 2: Icon indicator
struct IconVariant: View { ... }

// Approach 3: Corner ribbon
struct RibbonVariant: View { ... }

// Approach 4: Bottom footer
struct FooterVariant: View { ... }

#Preview("Badge") { BadgeVariant() }
#Preview("Icon") { IconVariant() }
#Preview("Ribbon") { RibbonVariant() }
#Preview("Footer") { FooterVariant() }
```

Now, what UI component would you like to explore?
