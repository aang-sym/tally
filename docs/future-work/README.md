# Future Work Issues

This directory contains GitHub issue templates for long-term cleanup and improvement tasks identified during the 2025-11-17 codebase audit.

## How to Use These Templates

Each markdown file can be copied directly into a new GitHub issue:

1. Go to GitHub Issues → New Issue
2. Copy the contents of the template file
3. Paste into the issue description
4. Add the suggested labels
5. Assign as needed

## Available Templates

1. **add-structured-logging.md** - Replace console.\* calls with proper logging (P1, 4 hours)
2. **increase-test-coverage.md** - Add comprehensive test suite (P1, 1-2 weeks)
3. **refactor-service-files.md** - Break down large service files (P2, 2-3 days)
4. **remove-legacy-storage.md** - Remove in-memory storage fallback (P2, 1 day)
5. **todo-extraction.md** - Extract TODO comments to issues (P2, 4 hours)
6. **zero-lint-warnings.md** - Fix all lint warnings (P2, 1 week)

## Priority Levels

- **P0:** High impact, low/medium effort - do immediately
- **P1:** Medium impact or medium effort - do soon
- **P2:** Nice-to-have or long-term - backlog

---

**Created:** 2025-11-17
**Source:** Codebase audit documented in CLEANUP_PROGRESS.md
