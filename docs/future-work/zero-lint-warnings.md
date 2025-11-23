# Reduce ESLint Warnings to Zero

**Priority:** P2
**Effort:** 1 week
**Risk:** Low
**Labels:** `code-quality`, `P2`, `linting`, `technical-debt`

---

## Problem

Currently the project allows **up to 1000 ESLint warnings**:

```json
// package.json (line 115)
"lint-staged": {
  "**/*.{ts,tsx,js,jsx}": [
    "eslint --fix --max-warnings=1000",  // ← Too permissive!
    "prettier --write"
  ]
}
```

**Issues with this approach:**

- ❌ **Warnings accumulate** over time (broken window theory)
- ❌ **Real issues hidden** among noise
- ❌ **Code quality degrades** as warnings are ignored
- ❌ **New warnings unnoticed** (lost in the existing 1000)
- ❌ **Inconsistent code style** across the codebase

### Current Warning Count

Unknown - need to run `pnpm lint` to get actual count.

Likely warnings:

- Unused variables/imports
- Missing type annotations
- `any` types
- console.log statements (if rule enabled)
- React Hook dependencies

## Proposed Solution

Reduce warnings to **zero** and enforce `--max-warnings=0` in CI.

### Step 1: Baseline - Count Current Warnings

```bash
pnpm lint 2>&1 | tee lint-output.txt
# Count warnings
grep "warning" lint-output.txt | wc -l
```

Document current state:

- Total warnings: X
- By rule type
- By file/directory

### Step 2: Categorize Warnings

Group by severity:

**Critical (Fix First):**

- Security issues (eval, innerHTML)
- Type safety issues (any, unsafe casts)
- Probable bugs (unused vars, unreachable code)

**Important (Fix Soon):**

- React best practices (hooks, keys)
- Performance issues (unnecessary re-renders)
- Accessibility (a11y rules)

**Nice to have (Fix Last):**

- Style preferences (arrow functions vs function)
- Naming conventions
- Comment formatting

### Step 3: Fix or Suppress

For each warning, choose:

**Option A: Fix the code** (preferred)

```typescript
// Before
const data = await fetch(...); // Warning: unused variable
console.log("debug"); // Warning: console statement

// After
const _data = await fetch(...); // Explicitly unused
logger.debug("debug"); // Use proper logger
```

**Option B: Disable rule for line** (if intentional)

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = legacyAPI(); // Justified use of any
```

**Option C: Disable rule globally** (if not applicable)

```json
// .eslintrc.js
"rules": {
  "no-console": "off" // We're okay with console for now
}
```

**Option D: Configure rule properly** (if too strict)

```json
"rules": {
  "@typescript-eslint/no-unused-vars": ["warn", {
    "argsIgnorePattern": "^_",
    "varsIgnorePattern": "^_"
  }]
}
```

### Step 4: Incremental Reduction

Set intermediate targets:

```json
// Week 1: Reduce to 500 warnings
"lint-staged": {
  "**/*.{ts,tsx,js,jsx}": [
    "eslint --fix --max-warnings=500"
  ]
}

// Week 2: Reduce to 100 warnings
// ... max-warnings=100

// Week 3: Reduce to 0 warnings
// ... max-warnings=0
```

Track progress in this issue.

### Step 5: Prevent New Warnings

Once at zero:

```json
// package.json - Enforce zero warnings
"lint-staged": {
  "**/*.{ts,tsx,js,jsx}": [
    "eslint --fix --max-warnings=0",  // ✅ No warnings allowed
    "prettier --write"
  ]
}

// Also in CI
"scripts": {
  "lint": "pnpm -r lint --max-warnings=0"
}
```

## Tasks

### Analysis

- [ ] Run `pnpm lint` and capture full output
- [ ] Count total warnings
- [ ] Group warnings by rule type
- [ ] Identify most common warning types
- [ ] Identify files with most warnings

### Prioritization

- [ ] Categorize warnings (critical, important, nice-to-have)
- [ ] Create plan for incremental reduction
- [ ] Set weekly targets

### Fixing

- [ ] Fix critical warnings (security, type safety)
- [ ] Fix important warnings (bugs, best practices)
- [ ] Fix nice-to-have warnings (style)
- [ ] Review and approve rule suppressions
- [ ] Update ESLint config if rules are too strict

### Prevention

- [ ] Set `--max-warnings=0` in lint-staged
- [ ] Set `--max-warnings=0` in CI pipeline
- [ ] Add lint check to PR requirements
- [ ] Block merges if lint fails
- [ ] Document linting standards in CONTRIBUTING.md

### Cleanup

- [ ] Remove unnecessary `eslint-disable` comments
- [ ] Consolidate ESLint config (see Branch 4)
- [ ] Update dependencies (see Branch 6a)

## Success Criteria

- **Zero ESLint warnings** across entire codebase
- **CI fails** if any warnings introduced
- **PRs blocked** if lint doesn't pass
- **Consistent code quality** enforced automatically
- **Clear linting standards** documented

## Common Warnings & Fixes

### @typescript-eslint/no-unused-vars

```typescript
// Before
import { unused } from './lib';
const data = fetch(...);

// After (remove or use)
// Remove import if truly unused
const _data = fetch(...); // Prefix with _ if intentionally unused
```

### @typescript-eslint/no-explicit-any

```typescript
// Before
const data: any = ...;

// After (type properly)
const data: User | null = ...;
// Or if truly dynamic:
const data: unknown = ...;
```

### react/jsx-key

```typescript
// Before
{items.map(item => <div>{item}</div>)}

// After
{items.map(item => <div key={item.id}>{item}</div>)}
```

### no-console

```typescript
// Before
console.log('Debug info');

// After
logger.debug('Debug info'); // Use proper logger
// Or suppress if debug logging is intentional
```

## Incremental Approach Example

**Week 1: Focus on API**

- Fix all warnings in `apps/api/src/`
- Target: 500 warnings → 200 warnings

**Week 2: Focus on Web**

- Fix all warnings in `apps/web/src/`
- Target: 200 warnings → 50 warnings

**Week 3: Focus on Packages**

- Fix all warnings in `packages/`
- Target: 50 warnings → 0 warnings

**Week 4: Enforcement**

- Set `--max-warnings=0` everywhere
- Update CI/CD
- Document standards

## Benefits

After achieving zero warnings:

- ✅ **Higher code quality** - Consistent standards enforced
- ✅ **Catch bugs early** - Warnings indicate potential issues
- ✅ **Better type safety** - TypeScript used properly
- ✅ **Easier onboarding** - New devs follow established patterns
- ✅ **Faster reviews** - Less style nitpicking

## References

- ESLint Documentation: [eslint.org](https://eslint.org/)
- TypeScript ESLint: [typescript-eslint.io](https://typescript-eslint.io/)
- Broken Windows Theory: [The Pragmatic Programmer](https://www.amazon.com/Pragmatic-Programmer-journey-mastery-Anniversary/dp/0135957052)
- Audit findings: CLEANUP_PROGRESS.md → "Lint Config & Warnings"

---

**Note:** This pairs well with **Branch 4 (Logging & Config Cleanup)** which centralizes ESLint config. Consider doing them together or in sequence.
