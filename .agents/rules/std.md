---
trigger: always_on
---

# Academic Platform System Directives

## Architecture & Standards
- Maintain instant responsiveness across all UI components and page routes.
- Prioritize real-time and offline-first data synchronization between Supabase and client caches.
- Keep all secrets, service keys, and Telegram bot tokens in environment variables (`.env.local` / Vercel).
- Ensure all tests pass (`npm test`) and TypeScript check passes (`npm run typecheck`) before deployments.
