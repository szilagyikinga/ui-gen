# UIGen Deployment Plan

This document outlines two deployment strategies for UIGen: **Vercel + Turso** and **Railway**.

---

## Table of Contents

- [Option 1: Vercel + Turso](#option-1-vercel--turso)
- [Option 2: Railway](#option-2-railway)
- [Comparison](#comparison)
- [Recommendation](#recommendation)

---

## Option 1: Vercel + Turso

**Overview**: Deploy Next.js to Vercel (serverless) with Turso as a hosted SQLite-compatible database.

### Prerequisites

- GitHub account
- Vercel account (free at [vercel.com](https://vercel.com))
- Turso account (free at [turso.tech](https://turso.tech))

### Phase 1: Set Up Turso Database

#### 1.1 Create Turso Account & Database

```bash
# Install Turso CLI
brew install tursodatabase/tap/turso

# Sign up / login
turso auth signup   # or: turso auth login

# Create database
turso db create uigen

# Get connection URL
turso db show uigen --url
# Output: libsql://uigen-<your-username>.turso.io

# Create auth token
turso db tokens create uigen
# Save this token - you'll need it
```

#### 1.2 Install Turso adapter for Prisma

```bash
npm install @prisma/adapter-libsql @libsql/client
```

### Phase 2: Update Prisma Configuration

#### 2.1 Update `prisma/schema.prisma`

```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../src/generated/prisma"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

#### 2.2 Update `src/lib/prisma.ts`

```typescript
import { PrismaClient } from "@/generated/prisma";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Use Turso in production, local SQLite in development
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter });
  }

  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

#### 2.3 Regenerate Prisma client

```bash
npx prisma generate
```

### Phase 3: Push Schema to Turso

```bash
# Set environment variables temporarily
export TURSO_DATABASE_URL="libsql://uigen-<your-username>.turso.io"
export TURSO_AUTH_TOKEN="your-token-here"

# Push schema to Turso
npx prisma db push
```

### Phase 4: Update package.json Build Script

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && next build"
  }
}
```

### Phase 5: Deploy to Vercel

#### 5.1 Push to GitHub

```bash
git add -A
git commit -m "Add Turso support for production deployment"
git push origin main
```

#### 5.2 Create Vercel Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel auto-detects Next.js - keep defaults
4. **Before clicking Deploy**, add Environment Variables:

| Name | Value |
|------|-------|
| `TURSO_DATABASE_URL` | `libsql://uigen-<username>.turso.io` |
| `TURSO_AUTH_TOKEN` | `<your-turso-token>` |
| `ANTHROPIC_API_KEY` | `<your-api-key>` |
| `JWT_SECRET` | `<random-32-char-string>` |

5. Click **Deploy**

### Phase 6: Generate a Secure JWT Secret

```bash
openssl rand -base64 32
```

### Files Changed (Vercel + Turso)

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `previewFeatures = ["driverAdapters"]` |
| `src/lib/prisma.ts` | Add Turso adapter logic |
| `package.json` | Add `postinstall` script |

---

## Option 2: Railway

**Overview**: Deploy as a container on Railway with SQLite persisted on a mounted volume.

### Prerequisites

- GitHub account
- Railway account (free at [railway.app](https://railway.app))

### Phase 1: Prepare the Project

#### 1.1 Update `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

#### 1.2 Update `package.json` scripts

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && prisma migrate deploy && next build",
    "start": "next start"
  }
}
```

#### 1.3 Update `.env` for local development

```
DATABASE_URL="file:./dev.db"
```

#### 1.4 Regenerate Prisma client

```bash
npx prisma generate
```

### Phase 2: Push to GitHub

```bash
git add -A
git commit -m "Prepare for Railway deployment"
git push origin main
```

### Phase 3: Deploy on Railway

#### 3.1 Create Project

1. Go to [railway.app/new](https://railway.app/new)
2. Click **Deploy from GitHub repo**
3. Select your repository
4. Railway auto-detects Next.js

#### 3.2 Add Persistent Volume

1. Click on your service
2. Go to **Settings** → **Volumes**
3. Click **Add Volume**
4. Set mount path: `/app/data`
5. Save

#### 3.3 Set Environment Variables

Go to **Variables** tab and add:

| Name | Value |
|------|-------|
| `DATABASE_URL` | `file:/app/data/prod.db` |
| `ANTHROPIC_API_KEY` | `<your-api-key>` |
| `JWT_SECRET` | `<random-32-char-string>` |
| `NODE_ENV` | `production` |

#### 3.4 Configure Build Settings (optional)

In **Settings**:
- Build command: `npm run build`
- Start command: `npm run start`

#### 3.5 Deploy

Railway will automatically redeploy. Watch the build logs.

### Phase 4: Initialize Database (First Deploy Only)

After first successful deploy, run migrations via Railway CLI:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migrations
railway run npx prisma migrate deploy
```

### Files Changed (Railway)

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Change `url` to `env("DATABASE_URL")` |
| `package.json` | Add `postinstall`, update `build` with migrate |
| `.env` | Add `DATABASE_URL="file:./dev.db"` |

---

## Comparison

### Architecture

| Aspect | Vercel + Turso | Railway |
|--------|---------------|---------|
| **Type** | Serverless (functions) | Container (always-on) |
| **Cold starts** | Yes (functions spin up on demand) | No (container stays running) |
| **Scaling** | Auto-scales to zero | Stays running |

### Database

| Aspect | Vercel + Turso | Railway |
|--------|---------------|---------|
| **Database** | Turso (hosted SQLite-compatible) | SQLite file on volume |
| **DB latency** | Network hop to Turso | Local file (faster) |
| **Backups** | Turso handles automatically | Manual or Railway snapshots |
| **Vendor lock-in** | Turso-specific adapter | Standard SQLite |

### Setup & Maintenance

| Aspect | Vercel + Turso | Railway |
|--------|---------------|---------|
| **Code changes** | More (new adapter, driver) | Minimal (env var only) |
| **Complexity** | More moving parts | Simpler |
| **Setup time** | ~30 minutes | ~15 minutes |

### Cost

| Aspect | Vercel + Turso | Railway |
|--------|---------------|---------|
| **Free tier** | Generous & perpetual | $5/month credit |
| **Vercel limits** | 100GB bandwidth/month | N/A |
| **Turso limits** | 9GB storage, 500M reads/month | N/A |
| **Railway usage** | N/A | ~$3-7/month for light traffic |

### Feature Summary

| Feature | Vercel + Turso | Railway |
|---------|---------------|---------|
| Zero-config Next.js | ✅ | ✅ |
| Persistent database | ✅ | ✅ |
| Auto-scaling | ✅ | ❌ |
| No cold starts | ❌ | ✅ |
| Minimal code changes | ❌ | ✅ |
| Truly free forever | ✅ | ⚠️ (credit-based) |
| SSH access | ❌ | ✅ |
| Background jobs | ❌ | ✅ |

---

## Recommendation

### Choose Vercel + Turso if:

- You want truly free long-term hosting
- You expect variable or bursty traffic
- You want automatic scaling to zero
- You're comfortable with slightly more setup
- You want managed database backups

### Choose Railway if:

- You want the fastest, simplest deployment
- You prefer keeping standard SQLite (no adapter)
- You want a container that's always warm (no cold starts)
- $5/month credit is acceptable
- You might need SSH access or background jobs later

---

## Post-Deployment Checklist

- [ ] Generate and set a secure `JWT_SECRET` (`openssl rand -base64 32`)
- [ ] Set `ANTHROPIC_API_KEY` (get from [console.anthropic.com](https://console.anthropic.com))
- [ ] Verify the app loads at your deployment URL
- [ ] Test sign-up/sign-in flow
- [ ] Test component generation
- [ ] (Optional) Add a custom domain
