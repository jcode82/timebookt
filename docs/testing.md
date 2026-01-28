# Unit testing (Vitest)

## Why Vitest
We use Vitest for fast, TypeScript-friendly unit tests for pure domain logic without the Next.js runtime.

## Install
```bash
pnpm add -D vitest @vitest/coverage-v8 vite-tsconfig-paths
```

## Config
`vitest.config.mts` at the repo root enables TS path aliases and coverage reporting.

## Where tests live
We co-locate tests near the code:

- `src/**/__tests__/*.test.ts`
- or `src/**/*.test.ts`

Example:

- `src/domain/appointments/actions.ts`
- `src/domain/appointments/__tests__/actions.test.ts`
- `src/domain/appointments/utils.ts`
- `src/app/api/reminders/utils.ts`
- `src/app/api/reminders/__tests__/utils.test.ts`

## Running tests
```bash
pnpm test
pnpm test:watch
pnpm test:run
pnpm test:coverage
```

## Tips
- Prefer pure functions for unit tests.
- Keep domain tests Node-only (no DOM) unless needed.
- Document conflict rules (for example, which duplicate wins) and test them.
