# UIGen Tech Stack

UIGen is an AI-powered React component generator with live preview. Users describe components in a chat interface, Claude generates React code via tool calls, and the result renders in a sandboxed iframe preview.

## Table of Contents

- [Core Framework](#core-framework)
- [AI Integration](#ai-integration)
- [Database](#database)
- [Authentication](#authentication)
- [UI Components](#ui-components)
- [Preview System](#preview-system)
- [Virtual File System](#virtual-file-system)
- [Testing](#testing)
- [Configuration](#configuration)

---

## Core Framework

| Tech           | Version | Purpose                | Links                                       |
| -------------- | ------- | ---------------------- | ------------------------------------------- |
| **Next.js**    | 15.3.3  | App Router + Turbopack | [docs](https://nextjs.org/docs)             |
| **React**      | 19.0.0  | UI library             | [docs](https://react.dev)                   |
| **TypeScript** | 5.x     | Type safety            | [docs](https://www.typescriptlang.org/docs) |

---

## AI Integration

### Overview

UIGen uses Claude Haiku 4.5 via the Vercel AI SDK to generate React components. The AI receives user messages, understands the request, and uses custom tools to create/edit files in a virtual file system.

### Packages

| Package             | Version | Purpose                               | Links                                                              |
| ------------------- | ------- | ------------------------------------- | ------------------------------------------------------------------ |
| `@ai-sdk/anthropic` | 1.2.12  | Anthropic API wrapper                 | [docs](https://sdk.vercel.ai/providers/ai-sdk-providers/anthropic) |
| `ai`                | 4.3.16  | Vercel AI SDK - streaming, tool calls | [docs](https://sdk.vercel.ai/docs)                                 |

### Key Files

| File                             | Purpose                             |
| -------------------------------- | ----------------------------------- |
| `src/lib/provider.ts`            | Model configuration + mock fallback |
| `src/lib/prompts/generation.tsx` | System prompt with design rules     |
| `src/app/api/chat/route.ts`      | Chat API endpoint                   |
| `src/lib/tools/str-replace.ts`   | File editing tool                   |
| `src/lib/tools/file-manager.ts`  | File management tool                |

### How It Works

1. User sends message via `ChatInterface` component
2. `POST /api/chat` receives messages + serialized virtual file system
3. System prompt instructs Claude on React/Tailwind conventions
4. Claude calls tools to create/edit files:
   - **str_replace_editor**: `view`, `create`, `str_replace`, `insert` commands
   - **file_manager**: `rename`, `delete` commands
5. Response streamed back via Vercel AI SDK's `streamText()`
6. Frontend updates file system state and re-renders preview
7. Project saved to database on completion (if authenticated)

### Configuration

| Parameter  | Value                                        |
| ---------- | -------------------------------------------- |
| Model      | Claude Haiku 4.5 (`claude-haiku-4-5-latest`) |
| Max Tokens | 10,000                                       |
| Max Steps  | 40 (real provider) / 4 (mock)                |
| Caching    | Ephemeral cache on system prompt             |

### System Prompt Features

The system prompt (`src/lib/prompts/generation.tsx`) enforces:

- **Dark mode color palette** (developer tool aesthetic)
- **Strict Tailwind CSS** (no inline styles)
- **Color system**:
  - Slate: backgrounds/text
  - Indigo: interactive elements
  - Emerald/Red/Amber/Sky: semantic colors
- **Accessibility**: WCAG standards, aria-labels, semantic HTML
- **Icons**: lucide-react (w-5 h-5 medium size)
- **Entry point**: Always `/App.jsx`

### Fallback Mode

When `ANTHROPIC_API_KEY` is not set, a `MockLanguageModel` generates demo components (Counter, ContactForm, Card) with simulated tool calls. This allows development without API costs.

### External Links

- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Anthropic API Documentation](https://docs.anthropic.com)
- [Claude Models](https://docs.anthropic.com/en/docs/about-claude/models)

---

## Database

### Overview

UIGen uses SQLite with Prisma ORM for data persistence. Chat history and file system state are stored as JSON strings.

### Stack

| Component | Version | Purpose  | Links                                    |
| --------- | ------- | -------- | ---------------------------------------- |
| SQLite    | -       | Database | [docs](https://www.sqlite.org/docs.html) |
| Prisma    | 6.10.1  | ORM      | [docs](https://www.prisma.io/docs)       |

### Key Files

| File                    | Purpose                 |
| ----------------------- | ----------------------- |
| `prisma/schema.prisma`  | Database schema         |
| `src/lib/prisma.ts`     | Singleton Prisma client |
| `src/generated/prisma/` | Generated Prisma client |

### Schema

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  password  String    // bcrypt hashed
  projects  Project[] // cascade delete
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Project {
  id        String   @id @default(cuid())
  name      String
  userId    String?  // nullable for anonymous projects
  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  String   // JSON: chat history array
  data      String   // JSON: serialized VirtualFileSystem
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Key Patterns

- **JSON storage**: `messages` and `data` fields store serialized JSON (SQLite lacks native JSON type)
- **Cascading delete**: Deleting a User removes all their Projects
- **Anonymous support**: `userId` is nullable, allowing unauthenticated usage
- **Singleton client**: `src/lib/prisma.ts` prevents multiple Prisma instances in development

### Commands

```bash
npm run setup      # Install deps, generate Prisma client, run migrations
npm run db:reset   # Reset SQLite database
```

---

## Authentication

### Overview

JWT-based authentication with httpOnly cookies. Supports anonymous usage with migration to authenticated accounts.

### Packages

| Package  | Version | Purpose                   | Links                                       |
| -------- | ------- | ------------------------- | ------------------------------------------- |
| `jose`   | 6.0.11  | JWT creation/verification | [docs](https://github.com/panva/jose)       |
| `bcrypt` | 6.0.0   | Password hashing          | [npm](https://www.npmjs.com/package/bcrypt) |

### Key Files

| File                | Purpose                 |
| ------------------- | ----------------------- |
| `src/lib/auth.ts`   | JWT utilities           |
| `src/middleware.ts` | Route protection        |
| `src/actions/`      | Server actions for auth |

### Implementation Details

| Feature      | Details                                      |
| ------------ | -------------------------------------------- |
| Algorithm    | HS256                                        |
| Expiration   | 7 days                                       |
| Cookie flags | httpOnly, secure (production), sameSite: lax |
| Secret       | `JWT_SECRET` env var or fallback             |

### Functions (`src/lib/auth.ts`)

- `createSession()` - Create JWT and set cookie
- `getSession()` - Verify and extract from cookie
- `deleteSession()` - Remove auth token
- `verifySession()` - Verify from request object

### Anonymous → Authenticated Migration

Anonymous users can use the app freely. Their work is tracked in localStorage and migrated to their account on sign-in.

---

## UI Components

### Packages

| Package                    | Version | Purpose                | Links                                                       |
| -------------------------- | ------- | ---------------------- | ----------------------------------------------------------- |
| **shadcn/ui**              | -       | Component system       | [docs](https://ui.shadcn.com)                               |
| **Radix UI**               | various | Accessible primitives  | [docs](https://www.radix-ui.com)                            |
| **Tailwind CSS**           | 4.x     | Utility-first styling  | [docs](https://tailwindcss.com)                             |
| **lucide-react**           | 0.517.0 | Icon library           | [docs](https://lucide.dev)                                  |
| **Monaco Editor**          | 4.7.0   | Code editor            | [docs](https://microsoft.github.io/monaco-editor)           |
| **react-resizable-panels** | 3.0.3   | Split panel layout     | [npm](https://www.npmjs.com/package/react-resizable-panels) |
| **react-markdown**         | 10.1.0  | Chat message rendering | [npm](https://www.npmjs.com/package/react-markdown)         |
| **cmdk**                   | 1.1.1   | Command palette        | [docs](https://cmdk.paco.me)                                |

### Radix UI Components Used

- `@radix-ui/react-dialog`
- `@radix-ui/react-label`
- `@radix-ui/react-popover`
- `@radix-ui/react-scroll-area`
- `@radix-ui/react-separator`
- `@radix-ui/react-slot`
- `@radix-ui/react-tabs`

### Styling Utilities

| Package                    | Purpose                                  |
| -------------------------- | ---------------------------------------- |
| `class-variance-authority` | Variant-based component styling          |
| `clsx`                     | Conditional class joining                |
| `tailwind-merge`           | Merge Tailwind classes without conflicts |
| `@tailwindcss/typography`  | Prose styling for markdown               |

---

## Preview System

### Overview

Generated JSX is transformed and rendered in a sandboxed iframe with live updates.

### How It Works

1. **JSX Transformation**: `@babel/standalone` compiles JSX → JavaScript in the browser
2. **Import Resolution**: Import map built pointing to `esm.sh` CDN for external packages
3. **Sandboxed Rendering**: Iframe with blob URLs for isolation
4. **Entry Point Detection**: Auto-detects `/App.jsx`, `/index.jsx`, etc.

### Key Files

| File                                      | Purpose                  |
| ----------------------------------------- | ------------------------ |
| `src/components/preview/PreviewFrame.tsx` | Preview iframe component |

### Packages

| Package             | Version | Purpose                 | Links                                            |
| ------------------- | ------- | ----------------------- | ------------------------------------------------ |
| `@babel/standalone` | 7.27.6  | Browser JSX compilation | [docs](https://babeljs.io/docs/babel-standalone) |

### External Dependencies

Generated components can import from npm packages via [esm.sh](https://esm.sh) CDN:

- React and React DOM
- Any npm package available on esm.sh

---

## Virtual File System

### Overview

Central abstraction for all file operations. An in-memory tree of `FileNode` objects that serializes to JSON for API transport and database storage.

### Key File

`src/lib/file-system.ts`

### Core Methods

| Method              | Purpose                           |
| ------------------- | --------------------------------- |
| `createFile()`      | Create file with content          |
| `createDirectory()` | Create directory                  |
| `readFile()`        | Get file contents                 |
| `updateFile()`      | Update file contents              |
| `deleteFile()`      | Delete file/directory (recursive) |
| `rename()`          | Move/rename files and directories |
| `listDirectory()`   | List directory contents           |
| `serialize()`       | Convert to JSON                   |
| `deserialize()`     | Reconstruct from JSON             |

### Text Editor Commands

Used by `str_replace_editor` tool:

| Method                    | Purpose                            |
| ------------------------- | ---------------------------------- |
| `viewFile()`              | Display with line numbers          |
| `createFileWithParents()` | Create file and parent directories |
| `replaceInFile()`         | String replacement                 |
| `insertInFile()`          | Insert at line number              |

### Key Patterns

- **No disk writes**: Everything stays in memory
- **Serializable**: JSON format for transport and storage
- **Path convention**: Virtual root at `/`, entry point at `/App.jsx`
- **Import alias**: `@/` maps to virtual root

---

## Testing

### Stack

| Package                | Version | Purpose                      | Links                                                                |
| ---------------------- | ------- | ---------------------------- | -------------------------------------------------------------------- |
| Vitest                 | 3.2.4   | Test runner                  | [docs](https://vitest.dev)                                           |
| @testing-library/react | 16.3.0  | Component testing            | [docs](https://testing-library.com/docs/react-testing-library/intro) |
| @testing-library/dom   | 10.4.0  | DOM utilities                | [docs](https://testing-library.com/docs/dom-testing-library/intro)   |
| jsdom                  | 26.1.0  | DOM simulation               | [npm](https://www.npmjs.com/package/jsdom)                           |
| @vitejs/plugin-react   | 4.5.2   | React plugin for Vite/Vitest | [docs](https://vitejs.dev)                                           |

### Configuration

`vitest.config.mts`:

```typescript
environment: "jsdom";
plugins: [tsconfigPaths(), react()];
```

### Commands

```bash
npm run test              # Watch mode
npx vitest run            # Single run
npx vitest run path/to/test.ts  # Single file
```

### Conventions

- Tests colocated in `__tests__/` directories next to source files
- Use `@testing-library/react` for component tests

---

## Configuration

### Environment Variables

| Variable            | Required | Purpose                                   |
| ------------------- | -------- | ----------------------------------------- |
| `ANTHROPIC_API_KEY` | No       | Claude API key (falls back to mock)       |
| `JWT_SECRET`        | No       | JWT signing secret (has fallback)         |
| `DATABASE_URL`      | No       | SQLite path (defaults to `file:./dev.db`) |

### Key Config Files

| File                   | Purpose                        |
| ---------------------- | ------------------------------ |
| `next.config.ts`       | Next.js configuration          |
| `tsconfig.json`        | TypeScript configuration       |
| `postcss.config.mjs`   | PostCSS/Tailwind configuration |
| `vitest.config.mts`    | Vitest configuration           |
| `components.json`      | shadcn/ui configuration        |
| `prisma/schema.prisma` | Database schema                |

### TypeScript Path Alias

```json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

### Next.js Config

```typescript
const nextConfig: NextConfig = {
  devIndicators: false,
};
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ ChatInterface│    │  CodeEditor  │    │ PreviewFrame │       │
│  │  (messages)  │    │   (Monaco)   │    │   (iframe)   │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             │                                   │
│                    ┌────────▼────────┐                          │
│                    │  chat-context   │                          │
│                    │ (state manager) │                          │
│                    └────────┬────────┘                          │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      POST /api/chat                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ System Prompt│───▶│  Claude AI   │───▶│    Tools     │       │
│  │  (design     │    │ (Haiku 4.5)  │    │ str_replace  │       │
│  │   rules)     │    │              │    │ file_manager │       │
│  └──────────────┘    └──────────────┘    └──────┬───────┘       │
└─────────────────────────────────────────────────┼───────────────┘
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VirtualFileSystem                             │
│         (in-memory tree, serialized to JSON)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SQLite + Prisma                              │
│  ┌──────────────┐    ┌──────────────────────────────────┐       │
│  │    User      │───▶│            Project               │       │
│  │  (email,     │    │  (messages JSON, data JSON)      │       │
│  │   password)  │    │                                  │       │
│  └──────────────┘    └──────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference

### Development Commands

```bash
npm run setup          # First-time setup
npm run dev            # Dev server (http://localhost:3000)
npm run build          # Production build
npm run lint           # ESLint
npm run test           # Vitest watch mode
npm run db:reset       # Reset database
```

### Key Directories

```
src/
├── actions/           # Server actions (auth, projects)
├── app/               # Next.js App Router pages
│   └── api/chat/      # Chat API endpoint
├── components/        # React components
│   ├── chat/          # Chat interface
│   ├── preview/       # Preview iframe
│   └── ui/            # shadcn/ui components
├── lib/               # Utilities
│   ├── tools/         # AI tool definitions
│   └── prompts/       # System prompts
└── generated/prisma/  # Prisma client
```
