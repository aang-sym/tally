## Claude Prompt for Fixing Compile Errors, Warnings, and Crashes

You are a senior iOS engineer and expert in Swift, UIKit, and SwiftUI. I will give you code for an iOS app and you will help me fix compile errors, warnings, and crashes.

**Instructions:**

- If there are any Swift compile errors, fix them.
- If there are any warnings, fix them.
- If there are any runtime crashes, fix them.
- If you see any force-unwrapping (`!`), replace it with safe optional handling.
- If the code is missing imports, add them.
- If the code references undeclared types or variables, declare them appropriately.
- If a function or variable is missing a type annotation and it is required, add it.
- If the code uses deprecated APIs, update to modern equivalents.
- If you see view code that may crash (e.g. array index out of bounds), add safety checks.
- If you see code that could be written more safely or idiomatically, suggest improvements.
- If you see ambiguous or unclear intent, ask clarifying questions.

**Output format:**

Respond with the fixed code block(s) only. Do not include explanations unless I ask for them. If you are unsure about a fix, comment your reasoning in the code.

---

## Current Errors & Warnings (Inventory + Fix Plan)

> Source: Latest Xcode build/preview logs

### Build-Stoppers (Errors)

1. **Invalid redeclaration of `DayCell`**  
   **Files:**
   - `Features/TVGuide/TVGuideView.swift:294`
   - (Another `DayCell` in the TVGuide2 vertical stack)  
     **Cause:** Two classes named `DayCell` exist in the same module.  
     **Fix:** Rename the vertical day-rail cell to avoid collision, e.g. `TVG2DayCell` (or `TVGuideVertDayCell`). Update:
   - Class name and `static let identifier`
   - Registrations: `dayRailCollectionView.register(TVG2DayCell.self, forCellWithReuseIdentifier: TVG2DayCell.identifier)`
   - Dequeues in data source: `dequeueReusableCell(withReuseIdentifier: TVG2DayCell.identifier, ...)`

2. **Runtime crash: data source returned a cell without a reuseIdentifier**  
   **Stack indicates:** day-rail snapshot apply path (`updateDayRailSnapshot`)  
   **Cause:** Cell provider returned a raw `UICollectionViewCell()` / nil, or tried to return a supplementary as a cell.  
   **Fix:** Ensure the day-rail cell provider **always** dequeues `TVG2DayCell` and returns it; month header must be provided via `supplementaryViewProvider` (not as a cell). Never return a naked `UICollectionViewCell()`.

### Warnings (Should Fix)

3. **Unused value `tmdbId`**  
   **File:** `Features/Search/SearchView.swift:356`  
   **Cause:** Bound value isn’t used.  
   **Fix options:**
   - If only a boolean check is needed: `if item.tmdbId != nil { ... }`
   - If the value is required: `guard let tmdbId = item.tmdbId else { return }` and use it.
   - Otherwise remove the binding.

4. **Deprecated API: `supplementariesFollowContentInsets`**  
   **Files:**
   - `Features/TVGuide2/TVGuide2ViewController.swift:251`
   - `Features/TVGuide2/TVGuideVertLayout.swift:279`
   - `Features/TVGuide2/TVGuideVertLayout.swift:463`  
     **Fix:**

   ```swift
   if #available(iOS 16.0, *) {
       section.boundarySupplementaryItemsFollowContentInsets = false
   } else {
       section.supplementariesFollowContentInsets = false
   }
   ```

5. **Deprecated API: `NSCollectionLayoutGroup.horizontal(layoutSize:subitem:count:)`**  
   **Files/Lines:** `TVGuideVertLayout.swift:84, 207, 257, 332, 437`  
   **Fix:**

   ```swift
   if #available(iOS 16.0, *) {
       let group = NSCollectionLayoutGroup.horizontal(
           layoutSize: groupSize,
           repeatingSubitem: item,
           count: columns
       )
       // use group
   } else {
       let group = NSCollectionLayoutGroup.horizontal(
           layoutSize: groupSize,
           subitem: item,
           count: columns
       )
       // use group
   }
   ```

6. **Immutable value `rowIndex` was never used**  
   **File:** `TVGuideVertLayout.swift:245`  
   **Fix:** Replace with `_` in loops or remove entirely.

7. **Nil-coalescing on non-optional `CGFloat`**  
   **Files:**
   - `TVGuideVertLayout.swift:343`
   - `TVGuideVertLayout.swift:447`  
     **Cause:** LHS is non-optional; RHS of `??` is unreachable.  
     **Fix:** Remove `?? fallback` or make the LHS optional if intended.

8. **Layout alignment note (not a compiler warning but tracked)**
   - Month header height must equal posters row height.
   - Day-rail section `contentInsets.top = postersRowHeight`; header pinned at `.top` with high zIndex.
   - Day-rail view’s `topAnchor = providerHeader.bottomAnchor`.
   - Use absolute item/group heights; no `.estimated` or hidden paddings.

---

## One-Click Fix Sequence (Claude will apply in order)

1. Rename vertical `DayCell` → `TVG2DayCell` and update all registrations/dequeues.
2. Day-rail data source: always dequeue `TVG2DayCell`; move month header provisioning to `supplementaryViewProvider`.
3. Replace all uses of `supplementariesFollowContentInsets` with the iOS 16+ guarded variant.
4. Swap deprecated `horizontal(subitem:)` with `horizontal(repeatingSubitem:)` (iOS 16+ guarded).
5. Remove unused `rowIndex` and nil-coalescing on non-optional `CGFloat`.
6. Fix `tmdbId` unused binding as per chosen option.
7. Rebuild and verify no errors/warnings; run vertical guide to confirm no crash and correct alignment.
