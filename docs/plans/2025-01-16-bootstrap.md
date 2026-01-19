# Bootstrap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bootstrap a local-first SPA with TanStack Router, Zustand, Yjs, and functional TypeScript patterns.

**Architecture:** Vite-powered React SPA with file-based routing. State via Zustand, CRDT sync via Yjs. Functional utilities (zod, ts-pattern, neverthrow, remeda) for Rust-like patterns.

**Tech Stack:** Bun, Vite, React 19, TanStack Router, Zustand, Yjs, Tailwind v4, Radix UI, Biome, Vitest

---

## Task 1: Initialize Project

**Files:**
- Create: `package.json`
- Create: `.gitignore`

**Step 1: Create package.json with bun**

```bash
bun init -y
```

**Step 2: Update package.json with project metadata**

Replace contents of `package.json`:

```json
{
  "name": "nourri",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "check": "biome check --apply .",
    "lint": "biome lint .",
    "format": "biome format --write ."
  }
}
```

**Step 3: Create .gitignore**

```gitignore
node_modules/
dist/
.vite/
*.local
.DS_Store
```

**Step 4: Commit**

```bash
git add package.json .gitignore
git commit -m "chore: initialize project with bun"
```

---

## Task 2: Install Dependencies

**Step 1: Install production dependencies**

```bash
bun add react react-dom @tanstack/react-router zustand yjs y-indexeddb zod ts-pattern neverthrow remeda clsx tailwind-merge
```

**Step 2: Install dev dependencies**

```bash
bun add -d typescript @types/react @types/react-dom vite @vitejs/plugin-react @tanstack/router-plugin tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/dom jsdom @biomejs/biome lefthook
```

**Step 3: Commit**

```bash
git add package.json bun.lockb
git commit -m "chore: add dependencies"
```

---

## Task 3: Configure TypeScript

**Files:**
- Create: `tsconfig.json`

**Step 1: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"]
}
```

**Step 2: Commit**

```bash
git add tsconfig.json
git commit -m "chore: configure TypeScript with strict mode"
```

---

## Task 4: Configure Vite

**Files:**
- Create: `vite.config.ts`

**Step 1: Create vite.config.ts**

```typescript
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [TanStackRouterVite(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

**Step 2: Commit**

```bash
git add vite.config.ts
git commit -m "chore: configure Vite with TanStack Router and Tailwind"
```

---

## Task 5: Configure Biome

**Files:**
- Create: `biome.json`

**Step 1: Create biome.json**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedImports": "error",
        "noUnusedVariables": "error"
      },
      "style": {
        "noNonNullAssertion": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always"
    }
  },
  "files": {
    "ignore": ["dist", "node_modules", ".vite", "routeTree.gen.ts"]
  }
}
```

**Step 2: Commit**

```bash
git add biome.json
git commit -m "chore: configure Biome linter and formatter"
```

---

## Task 6: Configure Lefthook

**Files:**
- Create: `lefthook.yml`

**Step 1: Create lefthook.yml**

```yaml
pre-commit:
  commands:
    check:
      glob: "*.{js,ts,tsx,json}"
      run: bunx biome check --apply --no-errors-on-unmatched --files-ignore-unknown=true {staged_files}
      stage_fixed: true
```

**Step 2: Install lefthook**

```bash
bunx lefthook install
```

**Step 3: Commit**

```bash
git add lefthook.yml .lefthook/
git commit -m "chore: configure lefthook for pre-commit checks"
```

---

## Task 7: Create Entry Point and HTML

**Files:**
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/main.css`
- Create: `src/test/setup.ts`

**Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nourri</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 2: Create src/main.css with Tailwind**

```css
@import "tailwindcss";
```

**Step 3: Create src/main.tsx**

```tsx
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import "./main.css";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}
```

**Step 4: Create src/test/setup.ts**

```typescript
import "@testing-library/jest-dom/vitest";
```

**Step 5: Install jest-dom**

```bash
bun add -d @testing-library/jest-dom
```

**Step 6: Commit**

```bash
git add index.html src/main.tsx src/main.css src/test/setup.ts package.json bun.lockb
git commit -m "feat: add entry point with Tailwind and router setup"
```

---

## Task 8: Create Route Structure

**Files:**
- Create: `src/routes/__root.tsx`
- Create: `src/routes/index.tsx`

**Step 1: Create src/routes/__root.tsx**

```tsx
import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <Outlet />
    </div>
  );
}
```

**Step 2: Create src/routes/index.tsx**

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold">Nourri</h1>
    </main>
  );
}
```

**Step 3: Generate route tree**

```bash
bunx vite --force & sleep 3 && kill $!
```

This starts Vite briefly to generate `routeTree.gen.ts`.

**Step 4: Commit**

```bash
git add src/routes/ src/routeTree.gen.ts
git commit -m "feat: add root layout and home route"
```

---

## Task 9: Create Project Scaffolding

**Files:**
- Create: `src/components/.gitkeep`
- Create: `src/stores/.gitkeep`
- Create: `src/lib/.gitkeep`
- Create: `src/types/.gitkeep`
- Create: `public/.gitkeep`

**Step 1: Create directories with .gitkeep**

```bash
mkdir -p src/components src/stores src/lib src/types public
touch src/components/.gitkeep src/stores/.gitkeep src/lib/.gitkeep src/types/.gitkeep public/.gitkeep
```

**Step 2: Commit**

```bash
git add src/components src/stores src/lib src/types public
git commit -m "chore: scaffold project directories"
```

---

## Task 10: Set Up Yjs CRDT

**Files:**
- Create: `src/lib/crdt.ts`

**Step 1: Create src/lib/crdt.ts**

```typescript
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

export const doc = new Y.Doc();

export const persistence = new IndexeddbPersistence("nourri", doc);

persistence.on("synced", () => {
  console.log("CRDT synced with IndexedDB");
});

export function getMap<T>(name: string): Y.Map<T> {
  return doc.getMap<T>(name);
}

export function getArray<T>(name: string): Y.Array<T> {
  return doc.getArray<T>(name);
}
```

**Step 2: Remove .gitkeep from lib**

```bash
rm src/lib/.gitkeep
```

**Step 3: Commit**

```bash
git add src/lib/crdt.ts
git commit -m "feat: add Yjs CRDT with IndexedDB persistence"
```

---

## Task 11: Set Up Base Zustand Store

**Files:**
- Create: `src/stores/app.ts`

**Step 1: Create src/stores/app.ts**

```typescript
import { create } from "zustand";

interface AppState {
  initialized: boolean;
  setInitialized: (value: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  initialized: false,
  setInitialized: (value) => set({ initialized: value }),
}));
```

**Step 2: Remove .gitkeep from stores**

```bash
rm src/stores/.gitkeep
```

**Step 3: Commit**

```bash
git add src/stores/app.ts
git commit -m "feat: add base Zustand store"
```

---

## Task 12: Add Utility Helpers

**Files:**
- Create: `src/lib/utils.ts`

**Step 1: Create src/lib/utils.ts**

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

**Step 2: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: add cn utility for class merging"
```

---

## Task 13: Create CLAUDE.md

**Files:**
- Create: `CLAUDE.md`

**Step 1: Create CLAUDE.md**

```markdown
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
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with project conventions"
```

---

## Task 14: Create README

**Files:**
- Create: `README.md`

**Step 1: Create README.md**

```markdown
# Nourri

Local-first SPA built with React, TanStack Router, and functional TypeScript.

## Quick Start

```bash
bun install
bun dev
```

## Development

```bash
bun dev      # Start dev server
bun build    # Production build
bun test     # Run tests
bun check    # Lint and format
```

## Tech Stack

- Bun, Vite, React 19
- TanStack Router (file-based)
- Zustand (state)
- Yjs (CRDT)
- Tailwind v4, Radix UI
- zod, ts-pattern, neverthrow, remeda
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

## Task 15: Verify Setup

**Step 1: Run type check**

```bash
bunx tsc --noEmit
```

Expected: No errors

**Step 2: Run linter**

```bash
bun check
```

Expected: No errors (may apply fixes)

**Step 3: Start dev server and verify**

```bash
bun dev
```

Expected: Server starts, visit http://localhost:5173 shows "Nourri"

**Step 4: Run tests**

```bash
bun test --run
```

Expected: No test files yet, exits cleanly

**Step 5: Final commit if any fixes**

```bash
git add -A && git commit -m "chore: apply linting fixes" || echo "Nothing to commit"
```

---

## Summary

After completing all tasks:
- 14 commits
- Fully configured project with all tooling
- Dev server running with hot reload
- CRDT persistence ready
- Functional utilities available
