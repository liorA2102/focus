# Focus — Jacob's Recruiter System

## Project Overview

A local web app (runs on Jacob's machine, accessed via browser) built by Lior for his father Jacob, a 72-year-old recruiter. Unifies his daily recruiting workflow into one simple dashboard. No complex auth, no cloud infrastructure. Runs on `localhost:3001`.

## End User: Jacob

- 72 years old, recruiter
- Uses ChatGPT, Outlook, LinkedIn comfortably — moderate tech level
- UI must be: large text, clear labels, card-based layout, no horizontal scrolling
- Match labels only: `Strong` / `Possible` / `Weak` — no numeric scores shown to Jacob

## Tech Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Database:** SQLite via Drizzle ORM (`src/db/schema.ts`, `src/db/index.ts`)
- **AI:** Claude API (`src/lib/ai.ts`) — CV parsing, candidate matching, post generation
- **Browser automation:** Playwright (`src/lib/jobmaster.ts`) for JobMaster posting
- **Email:** IMAP poller (`src/lib/emailInbox.ts`) — targets `cvfocusg@gmail.com` only
- **LinkedIn:** OAuth (`src/lib/linkedin.ts`) + AI post generation
- **Website sync:** Turso cloud SQLite (`src/lib/turso.ts`)

---

## App Pages & Modules

### `/positions` — Positions Board
**File:** `src/app/positions/page.tsx`  
**Component:** `NewPositionModal` (`src/components/positions/NewPositionModal.tsx`)

The main view Jacob uses daily. Shows a pipeline health dashboard (4 metric cards: To Review / Open / Filled / Cancelled), filterable/searchable position cards, and publishing badges (JM / LinkedIn).

- "סנכרן JobMaster" button → `POST /api/admin/sync-jobmaster` imports positions from JobMaster
- "משרה חדשה" button → opens `NewPositionModal` to create a position
- `/ → redirects to /positions`

---

### `/positions/[id]` — Position Detail
**File:** `src/app/positions/[id]/page.tsx`

Shows the full position (title, client, description, requirements, status) and its candidate matches list. Each match card shows AI strength label (Strong/Possible/Weak) and Jacob's pipeline status (open → relevant/not_relevant → client_review → interview → hired/rejected).

Key actions:
- Edit position fields inline
- Change position status (open / filled / cancelled) — triggers Turso sync
- Polish description with AI → `POST /api/positions/[id]/polish`
- Run AI matching → `POST /api/positions/[id]/matches`
- Draft email to candidate → `POST /api/positions/[id]/draft-email`
- Publish to JobMaster → `POST /api/positions/[id]/publish-jobmaster`
- Publish to LinkedIn → `POST /api/positions/[id]/publish-linkedin`

---

### `/candidates` — Candidate Pool
**File:** `src/app/candidates/page.tsx`

Searchable table of all candidates. Supports drag-and-drop or click-to-upload CV files (PDF/DOC/DOCX/TXT). On upload: CV is parsed by AI, saved, then auto-matched against open positions.

- Upload → `POST /api/candidates/upload` (AI parse + auto-match)
- Search → `GET /api/candidates?q=...`
- Source badges: `manual` / `jobmaster` / `linkedin` / `website`
- WhatsApp link per candidate (phone-based)

---

### `/candidates/[id]` — Candidate Detail
**File:** `src/app/candidates/[id]/page.tsx`

Shows full candidate profile: summary (EN/HE), skills, employment history, matched positions with strength and pipeline status. Jacob can change a candidate's status per position here.

---

### `/customers` — Client Management
**File:** `src/app/customers/page.tsx`  
**Component:** `AddClientModal` (`src/components/customers/AddClientModal.tsx`)

Cards for each hiring company (client). Shows open position count and contact count. Filter: all / active.

---

### `/customers/[id]` — Client Detail
**File:** `src/app/customers/[id]/page.tsx`

Client profile: tagline, industry, website, LinkedIn URL, logo. Contact list with name/title/email/phone. Linked open positions.

---

### `/email` — Email Inbox
**File:** `src/app/email/page.tsx`

IMAP configuration panel for `cvfocusg@gmail.com`. Shows connection status, last-polled time, and lets Jacob trigger a manual poll. Auto-poll runs every 15 minutes via `src/instrumentation.ts`.

- Settings saved to `app_settings` table (`email_*` keys)
- Poll → `POST /api/email/poll`

---

### `/linkedin` — LinkedIn Studio
**File:** `src/app/linkedin/page.tsx`

AI post composer. Jacob picks post type (job / holiday / PR), adds a hint, chooses a language (HE/EN), selects an image from the gallery, and AI generates the post text. He can shorten/expand, then post directly to LinkedIn.

- Generate → `POST /api/linkedin/generate-post`
- Post → `POST /api/linkedin/post`
- OAuth flow: `/api/linkedin/auth` → `/api/linkedin/callback`

---

### `/linkedin/gallery` — Image Gallery
**File:** `src/app/linkedin/gallery/page.tsx`  
**Component:** `ImageGallery` (`src/components/linkedin/ImageGallery.tsx`)

Upload and label images to use in LinkedIn posts. Images stored in `public/linkedin-images/`, metadata in `linkedin_images` table.

---

## Database Schema (`src/db/schema.ts`)

| Table | Purpose |
|-------|---------|
| `clients` | Hiring companies Jacob recruits for |
| `client_contacts` | Contacts at each client (name/title/email/phone) |
| `positions` | Job openings (linked to client, status, publish flags) |
| `candidates` | CV pool — AI-parsed (skills, summary EN+HE, employment history) |
| `candidate_matches` | AI match per candidate×position (strength + Jacob's pipeline status) |
| `linkedin_posts` | Generated/posted LinkedIn content |
| `linkedin_images` | Filenames + labels for the image gallery |
| `app_settings` | Key-value store for IMAP config, LinkedIn tokens, etc. |

**Pipeline statuses** (`candidate_matches.candidateStatus`):
`open` → `relevant` / `not_relevant` → `client_review` → `interview` → `hired` / `rejected`

**Match strength** (`candidate_matches.strength`): `strong` / `possible` / `weak`

---

## Key Library Files

| File | Purpose |
|------|---------|
| `src/lib/t.ts` | **All UI strings (EN + HE)** — every new UI string must be added here in both languages |
| `src/lib/ai.ts` | Claude API calls: CV parse, match, post generate, email draft |
| `src/lib/emailInbox.ts` | IMAP poller for `cvfocusg@gmail.com` (Gmail only) |
| `src/lib/jobmaster.ts` | Playwright automation for posting to JobMaster |
| `src/lib/jobmasterSync.ts` | Import positions from JobMaster into local DB |
| `src/lib/linkedin.ts` | LinkedIn OAuth token management + posting API |
| `src/lib/turso.ts` | Turso client — syncs open positions to public website |
| `src/lib/graphEmail.ts` | Microsoft Graph (jacob@focusgroup.co.il Outlook) — outbound only |
| `src/lib/skills/candidateEmail.ts` | Email draft skill for reaching out to candidates |
| `src/context/LanguageContext.tsx` | `useLang()` hook — EN/HE toggle, persisted to localStorage |
| `src/instrumentation.ts` | Next.js server startup hook — registers the 15-min email poll |

---

## API Routes

### Positions
- `GET/POST /api/positions` — list all / create
- `GET/PATCH/DELETE /api/positions/[id]` — read / update / delete (triggers Turso sync)
- `POST /api/positions/[id]/matches` — run AI matching for this position
- `POST /api/positions/[id]/polish` — AI polish the job description
- `POST /api/positions/[id]/draft-email` — AI draft outreach email for a candidate
- `POST /api/positions/[id]/publish-jobmaster` — Playwright post to JobMaster
- `POST /api/positions/[id]/publish-linkedin` — Post to LinkedIn

### Candidates
- `GET/POST /api/candidates` — list (with `?q=` search) / create
- `GET/PATCH/DELETE /api/candidates/[id]` — read / update / delete
- `POST /api/candidates/upload` — upload CV: parse → save → auto-match
- `GET /api/candidates/[id]/cv` — serve CV file

### Clients
- `GET/POST /api/clients` — list / create
- `GET/PATCH/DELETE /api/clients/[id]` — read / update / delete
- `GET/POST /api/clients/[id]/contacts` — list / add contact
- `PATCH/DELETE /api/clients/[id]/contacts/[contactId]` — update / delete contact
- `POST /api/clients/scrape` — AI scrape LinkedIn for client info

### Email
- `GET /api/email/status` — IMAP connection status
- `GET/POST /api/email/settings` — read / save IMAP settings
- `POST /api/email/poll` — trigger manual poll
- `GET /api/email/last-polled` — timestamp of last poll

### LinkedIn
- `GET /api/linkedin/status` — connection status (name, picture)
- `GET /api/linkedin/auth` — start OAuth flow
- `GET /api/linkedin/callback` — OAuth callback
- `POST /api/linkedin/generate-post` — AI generate post text
- `POST /api/linkedin/post` — publish post
- `GET /api/linkedin/images` — list gallery images
- `POST /api/linkedin/images/upload` — upload image
- `DELETE /api/linkedin/images/[id]` — delete image

### Admin
- `POST /api/admin/sync-turso` — full resync to Turso (purge stale + re-upsert open)
- `GET /api/admin/sync-turso` — read back Turso state
- `POST /api/admin/sync-jobmaster` — import positions from JobMaster

### Public (used by focusgroup.co.il)
- `GET /api/public/positions` — open positions (no client name)
- `POST /api/public/apply` — CV application submitted from website

---

## i18n Pattern

Every page uses `useLang()` from `src/context/LanguageContext.tsx` and reads from `translations[lang]` exported by `src/lib/t.ts`. **Every new UI string must have both EN and HE entries in `t.ts`.** The UI supports RTL (Hebrew) automatically via CSS logical properties (`paddingInlineStart`, etc.).

---

## Public Website Sync

`Focus app → Turso → focusgroup.co.il` (client names always blanked). Resync: `POST /api/admin/sync-turso` (purge+upsert) · `GET /api/admin/sync-turso` (read back).

---

## focus-website (Public Website)

**Location:** `focus-website/` inside this repo (also at `~/projects/focus-website` — same files)  
**Deployed:** Vercel → `focusgroup.co.il`  
**Stack:** Next.js App Router + TypeScript, bi-lingual HE/EN (`[lang]` route segment)  
**Architecture doc:** `focus-website/CLAUDE.md`

Pages:
- `[lang]/` — homepage (Hero, Services, How It Works, Stats, Testimonials, CTA, Positions preview)
- `[lang]/positions` — public positions list (reads Turso live)
- `[lang]/positions/[id]` — position detail + apply form (CV upload → `POST /api/apply`)
- `[lang]/about` — about page
- `[lang]/contact` — contact form

**Deploy after any website code change:**
```bash
cd focus-website
VERCEL_ORG_ID=team_BKl6c9mQxxviCdL6nG3yrerb \
VERCEL_PROJECT_ID=prj_uobR1mzXX0f5iHy7FgX8xK9Akh4r \
npx vercel deploy --prod
```

---

## Design Principles

- Card-based layout, large text, clear action buttons
- Jacob never stares at a blank page — AI always generates a first draft
- No numeric scores — match strength shown as labels only (Strong / Possible / Weak)
- Simple, predictable, forgiving UI
- RTL-friendly (Hebrew is default language)

## Full Design Doc

`docs/plans/2026-04-24-focus-system-design.md`

