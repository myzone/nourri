# Nourri

Local-first SPA with functional TypeScript patterns.

## Commands

- `bun dev` - Start dev server
- `bun build` - Production build
- `bun test` - Run tests
- `bun check` - Lint and format

## Stack

- **Runtime:** Bun
- **Framework:** React 19, TanStack Router
- **State:** Zustand, Yjs (CRDT)
- **Styling:** Tailwind v4, Radix UI
- **Functional:** zod, ts-pattern, neverthrow, remeda

## Conventions

- Path alias: `@/` maps to `src/`
- File-based routing in `src/routes/`
- Stores in `src/stores/`
- Shared components in `src/components/`
- Utilities in `src/lib/`
- Types/schemas in `src/types/`
- Biome for linting/formatting (tabs, double quotes)

## Patterns

- Use `Result<T, E>` from neverthrow for fallible operations
- Use `match` from ts-pattern for exhaustive matching
- Use zod schemas for runtime validation
- Use remeda for functional data transformations
