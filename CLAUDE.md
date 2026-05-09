# Focus — Jacob's Recruiter System

## Project Overview

A local web app (runs on Jacob's machine, accessed via browser) built by Lior for his father Jacob, a 72-year-old recruiter. Unifies his daily recruiting workflow into one simple dashboard. No complex auth, no cloud infrastructure.

## End User: Jacob

- 72 years old, recruiter
- Uses ChatGPT, Outlook, LinkedIn comfortably — moderate tech level
- UI must be: large text, clear labels, card-based layout, no horizontal scrolling
- Match labels only: `Strong` / `Possible` / `Weak` — no numeric scores shown to Jacob

## Tech Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Database:** SQLite via Drizzle ORM (local)
- **AI:** Claude API — CV parsing, candidate matching, post generation
- **Browser automation:** Playwright (JobMaster posting)
- **LinkedIn:** LinkedIn MCP (TBD)
- **Image generation:** DALL-E or Flux (LinkedIn Studio)

## Modules (build order)

1. **Positions Board** — manage open roles and candidate pipeline
2. **Candidate Pool + Matching Engine** — unified CV inbox + AI matching
3. **Job Publishing** — Playwright → JobMaster, MCP → LinkedIn
4. **LinkedIn Studio** — AI post generation (job post / holiday / PR)

## Design Principles

- Card-based layout, large text, clear action buttons
- Jacob never stares at a blank page — AI always generates a first draft
- No numeric scores — labels only
- Simple, predictable, forgiving UI

## Public Website Sync

Open positions are synced to the public website (`focusgroup.co.il`) via Turso (cloud SQLite).

```
Focus app (Jacob's PC) → Turso → focusgroup.co.il (Next.js on Vercel)
```

- **New/updated position** → upserted to Turso immediately (POST/PATCH routes)
- **Closed/deleted position** → removed from Turso immediately
- **Client/company name** → intentionally NOT synced (confidential, always blank in Turso)
- Website pages use `force-dynamic` — every visitor request reads Turso live, no caching

**Manual resync** if Turso gets out of sync:
```
POST http://localhost:3001/api/admin/sync-turso   ← purges stale + re-upserts all open
GET  http://localhost:3001/api/admin/sync-turso   ← read back what's in Turso
```

Website repo: `~/projects/focus-website` — see its `CLAUDE.md` for deployment instructions.

## Full Design Doc

`docs/plans/2026-04-24-focus-system-design.md`

@AGENTS.md
