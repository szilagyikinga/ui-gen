# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in a chat interface, Claude generates React code via tool calls, and the result renders in a sandboxed iframe preview. All generated files live in an in-memory virtual file system (no disk writes).

## Commands

```bash
npm run setup          # First-time: install deps, generate Prisma client, run migrations
npm run dev            # Dev server with Turbopack at http://localhost:3000
npm run build          # Production build
npm run lint           # ESLint
npm run test           # Vitest (watch mode)
npx vitest run         # Vitest single run
npx vitest run src/lib/__tests__/file-system.test.ts  # Run a single test file
npm run db:reset       # Reset SQLite database
```

## Architecture

### Request Flow

1. User sends a message via `ChatInterface` -> `chat-context.tsx` manages state
2. POST to `/api/chat/route.ts` with messages + serialized virtual file system
3. System prompt (`lib/prompts/generation.tsx`) instructs Claude to generate React components using Tailwind CSS with `/App.jsx` as root entry point
4. Claude calls two tools: `str_replace_editor` (create/edit files) and `file_manager` (rename/delete/list)
5. Tools operate directly on a `VirtualFileSystem` instance reconstructed from the request
6. Streamed response via Vercel AI SDK (`toDataStreamResponse`)
7. Frontend updates file system state and re-renders preview

### Virtual File System (`lib/file-system.ts`)

Central abstraction — an in-memory tree of `FileNode` objects (file or directory). Serializable to JSON for database persistence and API transport. Used by both the AI tools on the server and the editor/preview on the client.

### Preview (`components/preview/PreviewFrame.tsx`)

Transforms JSX files using `@babel/standalone`, builds an import map pointing to `esm.sh` CDN for external packages, and renders everything in a sandboxed iframe via blob URLs. Auto-detects the entry point (App.jsx, index.jsx, etc.).

### Two-Panel Layout (`app/main-content.tsx`)

Left panel: chat interface. Right panel: tabbed preview/code view. Code view has a file tree + Monaco editor. Panels are resizable via `react-resizable-panels`.

### AI Provider (`lib/provider.ts`)

Uses Claude Haiku 4.5 via `@ai-sdk/anthropic`. Falls back to a mock provider returning static responses when `ANTHROPIC_API_KEY` is not set. System prompt uses Anthropic's ephemeral cache control for cost optimization.

### Auth & Persistence

JWT-based auth (`jose` + `bcrypt`) with httpOnly cookies. Middleware in `src/middleware.ts` protects API routes. Database is SQLite via Prisma. `Project.messages` and `Project.data` are JSON strings storing chat history and serialized file system respectively. Anonymous users can use the app; their work is tracked in localStorage and migrated on sign-in.

### Server Actions (`src/actions/`)

Next.js server actions for auth (signUp, signIn, signOut) and project CRUD.

## Key Conventions

- Path alias: `@/*` maps to `src/*`
- UI components use shadcn/ui (configured in `components.json`) with Radix primitives
- Database schema is defined in `prisma/schema.prisma` — reference it for understanding stored data structure
- Prisma client is generated to `src/generated/prisma/`
- Tests are colocated in `__tests__/` directories next to source files
- Test environment: jsdom with `@testing-library/react`
- Use comments sparingly — only comment complicated code
