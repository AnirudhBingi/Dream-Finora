# Cursor Rules - Dream Finora

## Core Philosophy
- Fix root causes; avoid band-aids, wrappers, or extra deps unless essential.
- Prefer deletion, simplification, and consolidation over adding code.
- Keep the codebase lean, maintainable, modern, and performant.

## Cleanup Priorities
- Remove dead code (unused files/exports/imports, unreachable screens/assets).
- Merge duplicates/near-duplicates (AST similarity >=85%).
- Inline trivial wrappers; remove unnecessary indirection.
- Resolve circular deps; do not store derived state as source of truth.
- Roll back prior workarounds and fix the underlying issue.

## Safety Gates (run after every batch)
1. Typecheck (strict)
2. Lint
3. Unit/integration tests
4. Build targets
5. Quick smoke of key flows

If any fails: stop, diagnose root cause, fix without inflating code.

## Coding Approach
- Write readable, minimal, DRY code; avoid over-abstraction.
- Functions: use `function` for pure utilities; use `const handleX = () => {}` for component handlers.
- Types: TypeScript everywhere; prefer interfaces; avoid `any` or assertions unless fenced and justified.
- Exports: named exports by default.

## UI
- Web/Next: Tailwind utilities for styling.
- React Native: use RN styles or NativeWind only if already used; do not mix web-only APIs.

## Work Plan
- List targets and intended actions (delete, merge, simplify, decompose, wire, retire).
- Refactor safely with editor/codemods that auto-update imports.
- Validate using Safety Gates.
- Commit small scope, clear message, and update `CLEANUP_LOG.md`.

## Docs
- Update existing docs; do not create random new ones.
- Maintain a short `CLEANUP_LOG.md` with before/after metrics and decisions.
