<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Academic Platform Engineering Directives

## Architecture Overview
- **Framework**: Next.js 16 (App Router with Turbopack)
- **Styling**: Tailwind CSS with custom academic palette and theme tokens (dark/light)
- **Database & Storage**: Supabase (PostgreSQL, Row Level Security, public/restricted S3-compatible buckets)
- **State & Data**: Offline-first via PWA Service Worker + localStorage cache, synchronized with Supabase
- **Telegram Integration**: Telegram Bot API webhook (`/api/telegram/webhook`), channel broadcasts, and morning briefing cron (`/api/cron/morning-briefing`)

## Core Performance & Quality Guidelines
1. **Zero Artificial Latency**: Never introduce synthetic delays, click interceptors, or artificial throttling. All UI buttons and page transitions must be instantaneous and responsive on the first user interaction.
2. **Parallel Data Fetching**: Always use parallel `Promise.all` queries for independent resources rather than serialized waterfalls.
3. **Security & Secrets**: Never commit API keys or bot tokens in plaintext. Always read secrets from environment variables (`process.env.TELEGRAM_BOT_TOKEN`, `process.env.SUPABASE_SERVICE_ROLE_KEY`).
4. **Honest Diagnostics**: Accurately analyze root causes based on actual code execution, network logs, and database metrics.
