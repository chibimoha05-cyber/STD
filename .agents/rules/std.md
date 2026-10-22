---
trigger: always_on
---

# Academic Platform Engineering Directives

## 1. High Performance & Real-time Platform
- Maintain instant responsiveness across all UI components and page routes without artificial delays or blocking operations.
- Prioritize real-time and offline-first data synchronization between Supabase and client caches.
- Use concurrent fetching (`Promise.all`) for multi-resource loads.

## 2. Bilingual Support & Script Directionality
- Ensure full Modern Standard Arabic (RTL) and English (LTR) language isolation.
- Maintain accurate typography and direction alignment for bilingual course details, timetables, and announcements.

## 3. Strict Publisher Permissions & Storage Safety
- Content mutation actions require authenticated publisher sessions verified against the `publishers` table.
- Attachments are stored securely in Supabase Storage with signed download URLs for restricted resources.
