# Architecture Decision Records

> Technical decisions made during development, with rationale.

---

## ADR-001 — Framework: Next.js App Router

**Date**: 2026-02-26
**Status**: Accepted

**Context**: Need a React framework that deploys trivially to Vercel and supports client-side-only rendering.

**Decision**: Use Next.js 15 with the App Router. Mark the main page as `'use client'` to push all computation to the browser.

**Rationale**:
- Zero-config Vercel deployment
- App Router supports co-location of server and client components
- Static export possible if needed in the future (`output: 'export'`)

**Trade-offs**:
- Next.js is heavier than a bare Vite/React setup, but the operational simplicity outweighs the cost for this use case.

---

## ADR-002 — PDF generation: jsPDF (lazy-loaded)

**Date**: 2026-02-26
**Status**: Accepted

**Context**: Need PDF export that works offline, in the browser, without a server.

**Decision**: Use `jsPDF` imported dynamically (`await import('jspdf')`) only when the user clicks "Export PDF".

**Rationale**:
- jsPDF is a pure browser library — no server round-trip
- Dynamic import keeps the initial bundle lean (~106 kB) and defers the ~500 kB jsPDF payload until it is actually needed
- Works fully offline after first page load

**Alternatives rejected**:
- `react-pdf` / `@react-pdf/renderer`: requires Node.js server for some features
- Native browser `window.print()`: limited control over layout, no programmable multi-page layout
- PDF generation on a serverless function: defeats the "no internet required" requirement

---

## ADR-003 — Sudoku algorithm: backtracking with random shuffling

**Date**: 2026-02-26
**Status**: Accepted

**Context**: Need a fast, dependency-free Sudoku generator.

**Decision**: Classic backtracking solver (`solve()`) reused in two modes:
1. `shuffleNums=true` → randomises candidate order at each cell → generates a random valid completed board
2. Remove N cells from the completed board based on difficulty

**Rationale**:
- Zero dependencies — pure JavaScript
- Backtracking is fast enough in practice (< 50 ms per grid on modern hardware)
- Simple to understand, test, and audit

**Known limitation**:
- Removed cells are chosen randomly without verifying solution uniqueness. A proper implementation would run the solver again after each removal to confirm exactly one solution remains. This is tracked in TODO.md as a critical item.

---

## ADR-004 — Test runner: Node.js built-in `node:test`

**Date**: 2026-02-26
**Status**: Accepted

**Context**: Need unit tests for the sudoku logic without adding test framework dependencies.

**Decision**: Use the `node:test` module (stable since Node.js 20) with `node:assert/strict`.

**Rationale**:
- Zero extra dependencies
- Available in all Node.js 20+ environments (matches the CI target)
- Sufficient for testing pure functions in `lib/sudoku.js`
- TAP-compatible output, readable in CI logs

**Trade-offs**:
- No React component tests (would require a DOM environment like jsdom + a test framework)
- No code coverage report (would require `--experimental-test-coverage` flag, available in Node 22+)
- Component testing is deferred to a future iteration (tracked in TODO.md)

---

## ADR-005 — Styling: Tailwind CSS (no component library)

**Date**: 2026-02-26
**Status**: Accepted

**Context**: Need a styling solution that is fast to write and produces a small CSS bundle.

**Decision**: Tailwind CSS v3 with PostCSS, no component library (no shadcn/ui, no MUI, no Radix).

**Rationale**:
- Minimal additional dependencies (just tailwindcss + postcss + autoprefixer)
- Purges unused classes at build time → tiny CSS bundle
- Avoids over-engineering a simple single-page application

---

## ADR-006 — CI/CD: GitHub Actions with release-please

**Date**: 2026-02-26
**Status**: Accepted

**Context**: Need automated versioning, changelogs, and dependency updates.

**Decision**:
- `ci.yml`: Lint → Test → Build on every push and PR
- `release.yml`: `release-please-action` creates release PRs and GitHub Releases automatically based on Conventional Commits
- `security.yml`: Weekly `npm audit` + CodeQL scan
- `pr-check.yml`: Shell-based Conventional Commits title validation (no external action)
- `dependabot.yml`: Weekly npm dependency PRs, auto-merged for patch/minor updates

**Rationale**:
- `release-please` handles CHANGELOG generation, version bumping, and tag creation automatically
- Shell-based PR title check avoids a third-party action dependency
- Auto-merge for Dependabot patch/minor keeps the repo up to date with minimal manual intervention
