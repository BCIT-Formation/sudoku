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
**Updated**: 2026-03-02
**Status**: Accepted (updated for Tailwind v4)

**Context**: Need a styling solution that is fast to write and produces a small CSS bundle.

**Decision**: Tailwind CSS v4 with `@tailwindcss/postcss`, no component library.

**Rationale**:
- Minimal additional dependencies — `autoprefixer` is now bundled inside Tailwind v4 (removed from devDependencies)
- Content scanning is automatic in v4 (no `tailwind.config.mjs` needed for default setup)
- Purges unused classes at build time → tiny CSS bundle
- Avoids over-engineering a simple single-page application

**Migration from v3 (2026-03-02)**:
- `@tailwind base/components/utilities` → `@import "tailwindcss"` in globals.css
- PostCSS plugin: `tailwindcss` → `@tailwindcss/postcss`
- `tailwind.config.mjs`: deleted (v4 auto-detects source files; no custom theme to preserve)
- `autoprefixer`: removed from devDependencies (bundled in Tailwind v4)

---

## ADR-006 — CI/CD: GitHub Actions with release-please

**Date**: 2026-02-26
**Updated**: 2026-03-02
**Status**: Accepted

**Context**: Need automated versioning, changelogs, and dependency updates.

**Decision**:
- `ci.yml`: Lint → Test → Build on every push and PR
- `release.yml`: `release-please-action@v4` creates release PRs and GitHub Releases automatically based on Conventional Commits; explicit `release-please-config.json` and `.release-please-manifest.json` added for deterministic behaviour
- `security.yml`: Weekly `npm audit` + CodeQL scan
- `pr-check.yml`: Shell-based Conventional Commits title validation (no external action)
- `dependabot-auto-merge.yml`: Auto-approve and squash-merge Dependabot patch/minor PRs
- `claude-auto-merge.yml`: Auto-approve and squash-merge PRs from `claude/*` branches
- `dependabot.yml`: Weekly npm + GitHub Actions PRs

**Rationale**:
- `release-please` handles CHANGELOG generation, version bumping, and tag creation automatically
- Shell-based PR title check avoids a third-party action dependency
- Auto-merge for Dependabot and Claude PRs keeps the repo up to date with zero manual intervention
- Explicit release-please config files prevent ambiguity on first run

**Bug fixes applied (2026-03-02)**:
- `release.yml`: `release-please-action@v4` outputs `pr` as a JSON object, not a plain URL. Fixed auto-merge step to use `fromJSON(needs.release-please.outputs.pr).html_url`.
- `security.yml`: Removed orphaned `dependabot-auto-merge` job — it was unreachable because the workflow is triggered only by `schedule`/`workflow_dispatch`, never by `pull_request`.
- `pr-check.yml`: Renamed `ci-required` sentinel job to `pr-checks-passed` with a comment clarifying it does not verify the CI workflow (branch protection rules must list `Lint · Test · Build` separately).

---

## ADR-007 — ESLint pinned to ^9 (not ^10)

**Date**: 2026-03-02
**Status**: Accepted

**Context**: ESLint 10.0.2 was released. `eslint-config-next@16` declares `peerDependencies: { eslint: ">=9.0.0" }` but the bundled plugins (notably the custom `eslint-config-next/parser`) do not yet implement `ScopeManager.addGlobals()`, a new API introduced in ESLint 10. This causes a `TypeError` on every lint run.

**Decision**: Pin `eslint` to `^9` in `package.json` until the Next.js ESLint toolchain ships full ESLint 10 support.

**Trade-offs**:
- We miss ESLint 10 improvements (language plugins API), but all current rules work correctly.
- This will be revisited when `eslint-config-next` releases ESLint 10-compatible plugins.

---

## ADR-008 — Upgrade to React 19 + Next.js 16

**Date**: 2026-03-02
**Status**: Accepted

**Context**: Vercel CI failed with `ERESOLVE` — `react@"^18"` resolved to React 19.x (semver-compatible) but `react-dom@"^18"` required exactly React 18.3.x. Simultaneously, Dependabot had bumped Next.js to 16 and react-dom to 19.

**Decision**: Align `react` and `react-dom` to `^19`, update Next.js to `^16.1.6`.

**Rationale**:
- Next.js 16 fully supports React 19 (official peer dependency).
- Using explicit `^19` for both `react` and `react-dom` prevents the semver mismatch that caused the Vercel build failure.
- Next.js 16 ships with Turbopack as the default build engine (replaces Webpack in development and production).

**Trade-offs**:
- React 19 is a major release; some third-party component libraries may not yet be compatible. This project has no such dependencies, so the risk is zero.
