You’re on branch feat/api-contracts-openapi of the repo `tally`. Run in workspace root.

Goal
- Make `pnpm -w run lint` pass (errors = 0). Warnings are OK for now.
- Do NOT relax eslint rules globally. Prefer small, mechanical code fixes.
- Keep functional behavior unchanged.

Context (current output of `pnpm -w run lint --fix`)
- Errors are mainly:
  1) @typescript-eslint/no-unused-vars (incl. “Allowed unused args must match /^_/u”)
  2) no-case-declarations (lexical declarations inside switch/case)
  3) @typescript-eslint/no-unsafe-declaration-merging (class/interface name collision)
  4) A few unused imports/locals in tests and utils.
- Many warnings are “no-explicit-any” — ignore those for now (don’t change types unless trivial).

Make the following surgical fixes, file-by-file. Use Gemini/Code Browser to open files at the lines shown and patch exactly. After each batch of edits, run `pnpm -w run lint --fix` and iterate until 0 errors remain.

General edit recipes to apply wherever applicable
1) no-unused-vars:
   - If a parameter/variable is intentionally unused (middleware sigs, tests, placeholder stubs), prefix it with `_`.
     Examples:
       `function handler(req, res, next) { … }` → `function handler(req, res, _next) { … }`
       `const { data } = result` when not used → remove `data` binding or prefix `_data`.
   - Remove unused imports. If an import is only used in JSDoc, convert to `import type`.
   - If a variable is assigned but never read, delete it or fold it into the next line that uses the expression.

2) no-case-declarations:
   - For `switch (x) { case 'Y': const foo = …; … }`, wrap case body in braces:
     `case 'Y': { const foo = …; … break; }`

3) no-unsafe-declaration-merging (@typescript-eslint/no-unsafe-declaration-merging):
   - In `apps/api/src/services/StreamingService.ts`, you likely have a class and an interface with the same name (e.g., `class StreamingService` and `interface StreamingService`).
   - Rename the interface to `StreamingServiceOptions` (or similar) and have the class `implements StreamingServiceOptions` if appropriate. Or merge the interface’s members into the class type and delete the interface, whichever is simplest and preserves types.

4) Namespace rule (ES2015 module syntax is preferred over namespaces):
   - In `apps/api/src/middleware/user-identity.ts`, replace `namespace ... { … }` with module exports:
     - Convert to `export type …` and `export const …` / `export function …`.
     - If it only groups types, replace with a `types.ts` export or inline exports.

Now apply these concrete edits (by path and line hints from the lint log)

A) apps/api/src/db/supabase.ts
- Line ~123: `'data' is assigned a value but never used`
  - If it’s from `const { data, error } = …` and you only check `error`, rename to `_data` or destructure as `{ error }`.

B) apps/api/src/middleware/errorHandler.ts
- Line ~41: `_next` param: rename `next` → `_next` if unused.

C) apps/api/src/middleware/user-identity.ts
- Replace any `namespace` usage with ES module exports (see recipe #4).

D) apps/api/src/routes/auth.ts
- Line ~5: remove unused import `supabase` or prefix as `_supabase` if you intend to use later.

E) apps/api/src/routes/plan.ts
- Lines ~5–6: remove or prefix unused `streamingAvailabilityService` and `tmdbService`.
- Lines with `any` warnings can stay unchanged.

F) apps/api/src/routes/progress.ts
- Lines ~378, 381: variables `seasonId`, `showDetails` assigned but never used — delete or prefix with `_`.

G) apps/api/src/routes/ratings.ts
- Line ~412: “Unexpected lexical declaration in case block” → wrap `case` body in `{ … }` (recipe #2).

H) apps/api/src/routes/recommendations.ts
- Lines ~129, ~278, ~405: variables `serviceRecommendations`, `userId`, `userId` assigned but never used — delete or prefix with `_`.
- Leave `any` warnings.

I) apps/api/src/routes/tmdb.ts
- Line ~4: remove or prefix unused `releasePatternService`.

J) apps/api/src/routes/waitlist.ts
- Line ~4: remove or prefix unused `ValidationError`.

K) apps/api/src/routes/users.ts
- Lines ~17–19: remove or prefix unused `handleDatabaseError` / `handleNotFoundError`.
- Line ~237: `isAuthenticated` assigned but never used — remove or prefix with `_isAuthenticated`.

L) apps/api/src/routes/watchlist.ts
- Line ~12: remove or prefix unused `createUserClient`.

M) apps/api/src/routes/users.test.ts, watchlist-v2.test.ts, user-shows.test.ts
- Remove unused test imports (`beforeAll`, `afterEach`, etc.) if not used.
- Unused locals in tests → prefix with `_`.

N) apps/api/src/services/StreamingService.ts
- Fix the unsafe declaration merging (recipe #3).
- Remove or prefix any unused locals (e.g., `serviceStats`).

O) apps/api/src/services/ShowService.ts
- Line ~552: prefix the unused `tmdbShow` parameter as `_tmdbShow`.

P) apps/api/src/services/streaming-availability.test.ts
- Line ~49: remove or prefix unused `streamingAvailabilityService`.

Q) apps/api/src/services/streaming-availability.ts
- Line ~98: `success` assigned but never used — remove or prefix `_success`.

R) apps/api/src/utils/*.ts (several)
- Remove or prefix unused imports/locals: `supabase`, `policies`, `execResult`, `selectTest`, `data`, `simpleJWT`, etc.
- files: `comprehensive-auth-fix.ts`, `contract-coverage-check.ts`, `debug-watchlist-failure.ts`, `execute-rls-fix-direct.ts`, `test-real-api-flow.ts`, `test-rls-fix.ts`, `test-watchlist-flow.ts`, `verify-database-state.ts`.

S) apps/web/src/services/apiAdapter.ts, apiClient.ts
- Only warnings shown → leave types as-is. Do not “fix” `any` here.
- Ensure no *errors* remain. If any unused imports exist, remove them.

T) Tests with Express-style handlers complaining about unused `next`
- Rename `next` → `_next` in test stubs to satisfy “Allowed unused args must match /^_/u”.

After edits
1) Run:
   pnpm -w run lint --fix
   pnpm -w run typecheck
2) If any new errors appear, apply the same rules (prefix `_`, remove unused imports, wrap case bodies).
3) Commit with: `chore(lint): fix ESLint errors without altering behavior`

Acceptance
- `pnpm -w run lint` exits 0 errors (warnings allowed).
- CI “Lint and Type Check” job passes.
- No global rule relaxations were added.