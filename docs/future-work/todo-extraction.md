# Extract TODO/FIXME Comments to GitHub Issues

**Priority:** P2
**Effort:** 4 hours
**Risk:** None
**Labels:** `documentation`, `P2`, `technical-debt`, `task-management`

---

## Problem

The codebase has **20+ files** with TODO/FIXME/HACK comments scattered throughout:

### Examples Found

**High priority TODOs in iOS:**

- `apps/ios/Tally/Features/Dashboard/DashboardViewModel.swift` - Core feature TODOs
- `apps/ios/Tally/Features/SimplifiedCalendar/SimplifiedCalendarView.swift` - UI TODOs

**Web app TODOs:**

- `apps/web/src/services/apiAdapter.ts` - FIXME comments
- `apps/web/src/components/tv-guide/ShowBlock.tsx` - TODO comments

**Issues:**

- ❌ **Easy to forget** - Hidden in code, not tracked
- ❌ **No prioritization** - All TODOs look equally important
- ❌ **No context** - Why was this TODO added? When? By whom?
- ❌ **No progress tracking** - Can't see what's been addressed
- ❌ **Hard to search** - Need to grep instead of using issue tracker

## Proposed Solution

Extract all TODO/FIXME/HACK comments into GitHub issues with proper context and tracking.

### Step 1: Find All TODOs

```bash
# Find all TODO-style comments
grep -r "TODO\|FIXME\|HACK\|XXX\|DEPRECATED" \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.swift" \
  --include="*.js" \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  apps/ packages/
```

### Step 2: Categorize by Priority

**P0 (Critical):**

- TODOs blocking features
- Security-related FIXMEs
- Known bugs marked as TODO

**P1 (Important):**

- Feature improvements
- UX enhancements
- Performance TODOs

**P2 (Nice to have):**

- Code cleanup
- Refactoring notes
- Documentation TODOs

### Step 3: Create Issues

For each TODO:

1. **Extract context** - File path, line number, surrounding code
2. **Determine priority** - Based on impact and urgency
3. **Add labels** - Component, priority, type
4. **Link to code** - GitHub permalink to the exact line
5. **Add acceptance criteria** - What "done" looks like

**Example Issue Template:**

````markdown
## TODO: [Brief description from comment]

**Found in:** `apps/ios/Tally/Features/Dashboard/DashboardView.swift:42`

**Original Comment:**

```swift
// TODO: Add loading state for better UX
```
````

**Context:**
The dashboard doesn't show a loading spinner while fetching data, which can make the app feel unresponsive.

**Proposed Solution:**
Add a loading state to DashboardViewModel and display a spinner in DashboardView while `isLoading == true`.

**Acceptance Criteria:**

- [ ] Add `@Published var isLoading: Bool` to ViewModel
- [ ] Set `isLoading = true` before API calls
- [ ] Set `isLoading = false` after response/error
- [ ] Display loading spinner in view when `isLoading == true`
- [ ] Remove TODO comment after implementation

**Priority:** P1
**Effort:** 2 hours
**Component:** iOS Dashboard

````

### Step 4: Replace TODOs with Issue References

After creating issue #123, update the code:

**Before:**
```swift
// TODO: Add loading state for better UX
````

**After:**

```swift
// See issue #123: Add loading state
```

Or remove entirely if the issue is sufficient.

### Step 5: Prevent New TODOs

Add linting rule to flag new TODOs:

```json
// .eslintrc.js
"rules": {
  "no-warning-comments": ["warn", {
    "terms": ["TODO", "FIXME", "HACK"],
    "location": "anywhere"
  }]
}
```

This warns developers to create issues instead of TODOs.

## Tasks

### Extraction

- [ ] Run grep to find all TODO/FIXME/HACK comments
- [ ] Create spreadsheet/doc with all findings
- [ ] Categorize by file, component, priority
- [ ] Remove duplicate or obsolete TODOs

### Issue Creation

- [ ] Create GitHub issues for P0 items (do immediately)
- [ ] Create GitHub issues for P1 items (backlog)
- [ ] Create GitHub issues for P2 items (nice-to-have)
- [ ] Link issues to projects/milestones where relevant
- [ ] Assign issues to appropriate team members

### Code Cleanup

- [ ] Replace TODOs with issue references
- [ ] Remove obsolete TODOs (already done)
- [ ] Update comments to reference issues

### Prevention

- [ ] Add ESLint rule to warn on new TODOs
- [ ] Add Swift lint rule for TODOs (SwiftLint)
- [ ] Document policy in CONTRIBUTING.md:
  - "Don't add TODO comments - create issues instead"
- [ ] Add to PR template: "Did you create issues for new work?"

## Success Criteria

- **Zero TODO comments** in production code (or all reference issues)
- **All TODOs** tracked as GitHub issues
- **Issues categorized** by priority and component
- **Linting rules** prevent new TODO comments
- **Documentation** explains issue-first policy

## Automation Ideas

### Option A: GitHub Action

Create a bot that automatically creates issues from TODOs:

```yaml
# .github/workflows/todo-to-issue.yml
name: TODO to Issue
on: [push, pull_request]
jobs:
  todos:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: alstr/todo-to-issue-action@v4
        with:
          TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Option B: Pre-commit Hook

Block commits with new TODOs:

```bash
# .husky/pre-commit
if git diff --cached | grep -E "TODO|FIXME|HACK"; then
  echo "❌ Found TODO comment. Please create a GitHub issue instead."
  exit 1
fi
```

## Benefits

After completing this:

- ✅ **Better visibility** - All work tracked in one place
- ✅ **Better prioritization** - Issues can be sorted/filtered
- ✅ **Better planning** - Can estimate and assign work
- ✅ **Better accountability** - Know who owns what
- ✅ **Cleaner code** - No scattered comments

## References

- [todo-to-issue GitHub Action](https://github.com/alstr/todo-to-issue-action)
- ESLint no-warning-comments: [ESLint Docs](https://eslint.org/docs/rules/no-warning-comments)
- Audit findings: CLEANUP_PROGRESS.md → "TODO/FIXME Comments"

---

**Note:** Consider doing this incrementally - one codebase area at a time (iOS, then API, then Web) to make the work manageable.
