<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Engineering & Architecture Guidelines

## Architecture Overview
- **Framework**: Next.js 16 (App Router with Turbopack)
- **Styling**: Tailwind CSS with custom academic palette and theme tokens (dark/light)
- **Database & Storage**: Supabase (PostgreSQL, Row Level Security, public/restricted S3-compatible buckets)
- **State & Data**: Offline-first via PWA Service Worker + localStorage cache, synchronized with Supabase
- **Telegram Integration**: Telegram Bot API webhook (`/api/telegram/webhook`), channel broadcasts, and morning briefing cron (`/api/cron/morning-briefing`)

## 1. High Performance & Real-time Platform
- Ensure all database queries, API responses, and client rendering execute instantly without artificial delays or blocking operations.
- Use concurrent fetching (`Promise.all`) for multi-resource loads.
- Maintain clean button event handling and rapid interaction feedback.

## 2. Bilingual Support (Modern Standard Arabic & English)
- Maintain absolute linguistic integrity between Arabic (RTL) and English (LTR).
- Do not interleave English and Arabic in the same sentence in a way that breaks punctuation or layout.
- Ensure proper font rendering and direction attributes (`dir="rtl"` / `dir="ltr"`).

## 3. Security & Access Control
- All content authoring and mutation routes require authorized publisher credentials validated against Supabase Auth and RLS.
- Enforce strict input validation using UUID and type guards across all Server Actions and Route Handlers.
- Never hardcode API keys or bot tokens in plaintext. Always read secrets from environment variables (`process.env.TELEGRAM_BOT_TOKEN`, `process.env.SUPABASE_SERVICE_ROLE_KEY`).
