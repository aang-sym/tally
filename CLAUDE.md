# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack Decisions

**Web Landing**: React 18 + TypeScript + Vite + Tailwind CSS

- React ONLY for the landing page and waitlist (not the main app)
- Vite for fast development and modern bundling
- Tailwind for consistent, utility-first styling
- TypeScript for type safety across the stack

**Main App UI**: Swift/iOS (not implemented yet)

- The actual Tally app will be native iOS (Swift + SwiftUI)
- React web is just for landing/waitlist validation
- API designed specifically for iOS client consumption

**Backend**: Node.js + Express + TypeScript

- Express for simple, well-documented REST API
- TypeScript for end-to-end type safety with shared types
- Zod for runtime validation of API inputs/outputs

**Monorepo**: npm workspaces + iOS app

- `/apps/api` - Express backend service
- `/apps/web` - React landing page (waitlist only)
- `/apps/ios` - Swift/iOS main app (not implemented yet)
- `/packages/types` - Shared TypeScript types and Zod schemas
- `/packages/core` - Pure business logic (planning, savings calculations)
- `/packages/config` - Shared configs (ESLint, TypeScript, Prettier)

**Data Storage**: In-memory with organized interfaces

- Easy to swap for PostgreSQL/SQLite later
- Stores: users, watchlists, waitlist entries
- All database operations isolated in `/apps/api/src/storage/`

**Testing**: Vitest for unit tests, supertest for API tests, Swift Testing for iOS

## iOS Development Principles

When working on the iOS app (`/apps/ios`), follow these core principles:

### Test-Driven Development (TDD)

- **ALWAYS write tests BEFORE implementation** - no exceptions
- Write a failing test that defines the desired functionality
- Implement minimal code to make the test pass
- Refactor while keeping tests green
- Use Swift Testing framework for all new tests
- Every feature MUST have test coverage before it's considered complete

### iOS Version & Platform Requirements

**IMPORTANT:** This app targets **iOS 26** - the newest version of iOS.

- NEVER reference iOS 18 or earlier versions when researching SwiftUI patterns
- Use iOS 26-specific APIs and features (e.g., liquid glass TabView, native search morphing)
- When searching for documentation, always include "iOS 26" in queries
- Xcode beta with iOS 26 SDK is required for development

### Idiomatic Swift/SwiftUI

- **Prefer idiomatic solutions over workarounds**
- After any initial implementation that works, ask: "Is this the most idiomatic way?"
- Use `@Observable` for state management (modern Swift pattern)
- Avoid state flags when computed properties will work
- No `DispatchQueue.asyncAfter` hacks - use proper SwiftUI lifecycle
- Trust SwiftUI's built-in behaviors (e.g., button tap protection)
- Follow Swift 6 strict concurrency - no detached tasks or polling loops
- Use structured concurrency with proper async/await patterns

### "Show Don't Tell" UI Design Pattern

When designing new UI features:

1. Create a throwaway demo file with 3-4 different visual approaches
2. Use fake/mock data - don't worry about DI or architecture yet
3. Add individual preview blocks for each approach
4. Review alternatives in Xcode canvas side-by-side
5. Iterate on the chosen design in the demo file
6. Only then integrate the final version into production with proper architecture

Example:

```swift
// CalendarCellDemo.swift (throwaway file)
import SwiftUI

// Approach 1: Badge variant
struct BadgeCalendarCell: View { ... }

// Approach 2: Icon indicator
struct IconCalendarCell: View { ... }

// Approach 3: Corner ribbon
struct RibbonCalendarCell: View { ... }

// Approach 4: Bottom footer
struct FooterCalendarCell: View { ... }

#Preview("Badge") { BadgeCalendarCell() }
#Preview("Icon") { IconCalendarCell() }
#Preview("Ribbon") { RibbonCalendarCell() }
#Preview("Footer") { FooterCalendarCell() }
```

### Protocol-Based Dependency Injection

- Maintain testable architecture with protocol-based DI
- All external dependencies (API, persistence, etc.) should be protocols
- Example: `ApiClient` protocol → `LiveApiClient` / `MockApiClient`
- Makes testing trivial and keeps business logic pure

### Code Quality Standards

- Enum-based view state over boolean flags
- Computed properties over stored state when possible
- Pure business logic extracted to separate layers
- Every file should be independently testable

## Development Commands

```bash
# Install dependencies
npm install

# Run everything in development
npm run dev

# Run individual services
npm run dev:api    # API server on :4000
npm run dev:web    # Web frontend on :3000

# Build all packages
npm run build

# Lint and typecheck
npm run lint
npm run typecheck

# Run tests
npm run test

# Format code
npm run format
```

## API Endpoints (All Implemented)

**Health & Waitlist**:

- `GET /api/health` - Health check
- `POST /api/waitlist` - Add email to waitlist

**Authentication (Stubbed)**:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

**Watchlist (Requires auth token)**:

- `GET /api/watchlist` - Get user's watchlist
- `POST /api/watchlist` - Add item to watchlist
- `DELETE /api/watchlist/:id` - Remove item

**Planning**:

- `POST /api/plan/generate` - Get mock activation windows and savings

## Notifications

When tasks complete, you need my attention, or when usage limit wait time is over, notify me using:
powershell.exe -c "[System.Media.SystemSounds]::Question.Play()"

## What's Mocked vs Real

**Real**:

- Full monorepo structure with proper TypeScript configs
- Working React landing page with waitlist form
- Complete Express API with all endpoints
- Runtime validation with Zod schemas
- Basic error handling and CORS setup

**Mocked/Stubbed**:

- Authentication (returns stub tokens, no JWT)
- Password hashing (stores plaintext for now)
- Streaming service data (hardcoded mock services)
- Savings calculations (simple placeholder math)
- Plan generation (returns hardcoded activation windows)

## Architecture Notes

- **Type Safety**: Shared types in `@tally/types` ensure consistency between frontend/backend
- **Validation**: All API endpoints validate inputs/outputs with Zod schemas
- **Error Handling**: Consistent error shapes with proper HTTP status codes
- **Storage Layer**: Organized to easily swap in-memory stores with real database
- **Future iOS**: API designed with mobile clients in mind (RESTful, JSON responses)

## Next Steps After This Scaffold

1. **Replace mocks with real data sources**:
   - Integrate with TMDB API for show/movie data
   - Add real streaming service APIs or web scraping
   - Implement actual savings calculations based on user data

2. **Add auth sessions + storage**:
   - Implement proper JWT authentication
   - Add password hashing with bcrypt
   - Switch to PostgreSQL or SQLite database
   - Add user session management

3. **Enhance savings math in `/packages/core`**:
   - Build sophisticated planning algorithms
   - Add historical usage analysis
   - Account for bundle deals and promotions
   - Include more comprehensive test coverage

4. **Build the iOS app in `/apps/ios`**:
   - Create Xcode project with SwiftUI
   - Generate Swift models from TypeScript types (consider tools like quicktype)
   - Implement API client for all endpoints
   - Add proper API documentation (OpenAPI/Swagger)
   - Implement push notifications for subscription reminders

---

# Using Gemini CLI for Large Codebase Analysis

When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive
context window. Use `gemini -p` to leverage Google Gemini's large context capacity.

Instead of only reading some of a file, use Gemini instead to read the entire file, and even other files in the directory that could be informative.

Use Gemini CLI when reading documentation, like:
https://developer.themoviedb.org/reference/intro/getting-started

## File and Directory Inclusion Syntax

Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the
gemini command:

### Examples:

**Single file analysis:**

```bash
gemini -p "@src/main.py Explain this file's purpose and structure"
```

**Multiple files:**

```bash
gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"
```

**Entire directory:**

```bash
gemini -p "@src/ Summarize the architecture of this codebase"
```

**Multiple directories:**

```bash
gemini -p "@src/ @tests/ Analyze test coverage for the source code"
```

**Current directory and subdirectories:**

```bash
gemini -p "@./ Give me an overview of this entire project"
```

**Or use --all_files flag:**

```bash
gemini --all_files -p "Analyze the project structure and dependencies"
```

### Implementation Verification Examples

- **Check if a feature is implemented:**

  ```bash
  gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"
  ```

- **Verify authentication implementation:**

  ```bash
  gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"
  ```

- **Check for specific patterns:**

  ```bash
  gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"
  ```

- **Verify error handling:**

  ```bash
  gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"
  ```

- **Check for rate limiting:**

  ```bash
  gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"
  ```

- **Verify caching strategy:**

  ```bash
  gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"
  ```

- **Check for specific security measures:**

  ```bash
  gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"
  ```

- **Verify test coverage for features:**
  ```bash
  gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"
  ```

### When to Use Gemini CLI

Use `gemini -p` when:

- Analyzing entire codebases or large directories
- Comparing multiple large files
- Need to understand project-wide patterns or architecture
- Current context window is insufficient for the task
- Working with files totaling more than 100KB
- Verifying if specific features, patterns, or security measures are implemented
- Checking for the presence of certain coding patterns across the entire codebase

### Important Notes

- Paths in `@` syntax are relative to your current working directory when invoking gemini
- The CLI will include file contents directly in the context
- No need for `--yolo` flag for read-only analysis
- Gemini's context window can handle entire codebases that would overflow Claude's context
- When checking implementations, be specific about what you're looking for to get accurate results

---

# Gemini MCP Tool (Claude Code Integration)

The Gemini MCP tool allows Claude Code to call Gemini directly through slash commands and sandbox tools.

## Example Workflow

- Natural language:
  - "use gemini to explain index.html"
  - "understand the massive project using gemini"
  - "ask gemini to search for latest news"

- Claude Code:  
  Type `/gemini-cli` and commands will populate in Claude Code's interface.

## Usage Examples

### With File References (using `@` syntax)

- ask gemini to analyze `@src/main.js` and explain what it does
- use gemini to summarize `@.` (the current directory)
- analyze `@package.json` and tell me about dependencies

### General Questions (without files)

- ask gemini to search for the latest tech news
- use gemini to explain div centering
- ask gemini about best practices for React development related to `@file_im_confused_about`

## Using Gemini CLI's Sandbox Mode

The sandbox mode allows you to safely test code changes, run scripts, or execute potentially risky operations in an isolated environment.

Examples:

- use gemini sandbox to create and run a Python script that processes data
- ask gemini to safely test `@script.py` and explain what it does
- use gemini sandbox to install numpy and create a data visualization
- test this code safely: Create a script that makes HTTP requests to an API

## Tools (for the AI)

- **ask-gemini**: General analysis or Q&A with Gemini.
  - `prompt` (required)
  - `model` (optional, default `gemini-2.5-pro`)
  - `sandbox` (optional, true for sandbox mode)

- **sandbox-test**: Safely execute code in Gemini's sandbox.
  - `prompt` (required)
  - `model` (optional)

- **ping**: Echo test.
- **help**: Shows help text.

## Slash Commands (for the User)

- `/analyze`: Analyze files, directories, or ask questions with Gemini.
- `/sandbox`: Safely test code or scripts in Gemini’s sandbox.
- `/help`: Show Gemini CLI help information.
- `/ping`: Echo test (with optional message).

---

# Usage Notes

- Claude automatically detects when to use Gemini MCP based on your request.
- You **do not need** to tell Claude explicitly to use Gemini — just write natural prompts (e.g. _“explain @src/index.js”_).
- Use slash commands (`/analyze`, `/sandbox`, etc.) only if you want to be explicit or force a particular mode.
- Prefer **CLI usage** (`gemini -p`) when working in your terminal directly on large codebases.
- Prefer **MCP usage** (Claude Code integration) when working interactively inside Claude.
