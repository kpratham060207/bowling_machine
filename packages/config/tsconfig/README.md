# TypeScript Configuration

Shared `tsconfig` fragments for the monorepo.

| File                 | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `base.json`          | Strict compiler options shared by all packages    |
| `node.json`          | Node.js libraries and apps (`module: NodeNext`)   |
| `nextjs.json`        | Next.js App Router (`noEmit`, bundler resolution) |
| `react-library.json` | React component packages (`packages/ui`)          |

## Design decisions

- **`strict: true`** — required project-wide; no implicit any.
- **`noUncheckedIndexedAccess`** — array/object index access may be `undefined`.
- **`verbatimModuleSyntax`** — enforces `import type` for type-only imports.
- **No duplicated options** — apps/packages extend these files rather than copying settings.
