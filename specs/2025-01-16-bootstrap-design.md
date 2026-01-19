# Nourri - Bootstrap Design

## Overview

Local-first SPA built with modern functional TypeScript patterns.

## Tech Stack

### Runtime & Tooling
- **Bun** - runtime, package manager
- **Vite** - dev server, HMR, build
- **TypeScript** - strict mode
- **Biome** - linting + formatting
- **Lefthook** - git hooks (pre-commit)

### Routing & State
- **TanStack Router** - type-safe file-based routing
- **Zustand** - minimal functional state management
- **Yjs** - CRDT for local-first sync
- **y-indexeddb** - CRDT persistence

### Functional / Rust-like Libraries
- **zod** - runtime schema validation, type inference
- **ts-pattern** - exhaustive pattern matching
- **neverthrow** - Result/Option types
- **remeda** - functional utilities (pipe-first)

### UI
- **Radix UI** - headless primitives
- **Tailwind CSS v4** - utility-first styling
- **clsx + tailwind-merge** - conditional class composition

### Testing
- **Vitest** - test runner
- **@testing-library/react** - component testing

## Project Structure

```
nourri/
├── src/
│   ├── routes/           # TanStack Router file-based routes
│   │   ├── __root.tsx    # Root layout
│   │   └── index.tsx     # Home route
│   ├── components/       # Shared UI components
│   ├── stores/           # Zustand stores
│   ├── lib/              # Utilities, CRDT setup, helpers
│   ├── types/            # Shared types/schemas (zod)
│   └── main.tsx          # Entry point
├── specs/                # Design docs, specs
├── public/
├── CLAUDE.md             # AI instructions for this project
├── README.md
├── biome.json
├── lefthook.yml
├── tsconfig.json         # Path aliases (@/ → src/)
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

## Dependencies

### Production
```
react
react-dom
@tanstack/react-router
zustand
yjs
y-indexeddb
zod
ts-pattern
neverthrow
remeda
@radix-ui/react-* (as needed)
tailwindcss
clsx
tailwind-merge
```

### Development
```
typescript
vite
@vitejs/plugin-react
@tanstack/router-plugin
vitest
@testing-library/react
@biomejs/biome
lefthook
```
