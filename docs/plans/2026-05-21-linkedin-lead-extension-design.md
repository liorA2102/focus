# LinkedIn Lead Extension — Design Doc
**Date:** 2026-05-21

## Overview

A Chrome extension that sits on top of LinkedIn and lets Jacob paste saved comment templates onto posts. The moment he uses a template, the post author is silently captured as a lead in the Focus app for future follow-up.

---

## Architecture

```
[LinkedIn in Chrome]
      ↕  content script (MutationObserver)
[Chrome Extension]
      ↕  localhost:3001
[Focus App (Next.js)]
      ↕
[SQLite DB]
```

Two pieces:
1. **Chrome Extension** — content script on `linkedin.com`, floating button, template picker, DOM injection, lead POST
2. **Focus App additions** — `/leads` page, template management, two new DB tables, new API routes

---

## Chrome Extension UX

### Floating button
- Appears at the bottom-right of LinkedIn comment text areas when they become active
- Triggered via `MutationObserver` (LinkedIn is a SPA)
- Icon: Focus Group logo (`FocusGroup_LogoFIXED.png`) at ~24px in a circle

### Template picker
- Clicking the button opens a compact dropdown
- Each item shows template title + image thumbnail (if any)
- Jacob taps one → text auto-injects into the comment field

### Image handling
- If the template has an image, the extension creates a `File` object from the image URL (fetched from `localhost:3001/public/linkedin-images/...`) and dispatches it via LinkedIn's hidden file input
- Fallback: if injection fails, a "Copy image" button appears for manual paste

### Lead capture (silent)
Triggered the moment Jacob selects a template — before text is inserted. Content script reads from the post DOM:
- Author name, headline, company
- Author LinkedIn profile URL
- Post URL
- Template title used

POSTed to `localhost:3001/api/leads`. A "✓ Lead saved to Focus" toast appears for 2 seconds.

### Extension file structure
```
focus-linkedin-extension/
  manifest.json      — MV3, permissions: activeTab, storage
  content.js         — floating button, DOM injection, lead capture
  background.js      — fetches + caches templates from localhost:3001
  icons/             — Focus logo at 16/48/128px
```

Loaded via Chrome "Load unpacked" — no Web Store needed.

---

## Focus App — Data Model

### `commentTemplates` table
| Column | Type | Notes |
|--------|------|-------|
| id | integer PK | |
| title | text | e.g. "פתיחה כללית" |
| body | text | the comment text to paste |
| imageFilename | text nullable | reuses `public/linkedin-images/` |
| createdAt | integer | unix timestamp |
| updatedAt | integer | unix timestamp |

### `leads` table
| Column | Type | Notes |
|--------|------|-------|
| id | integer PK | |
| name | text | scraped from post DOM |
| headline | text | scraped from post DOM |
| company | text | scraped from post DOM |
| linkedinUrl | text | post author profile URL |
| profilePictureUrl | text nullable | |
| postUrl | text | the LinkedIn post URL |
| templateUsed | text | title of template used |
| notes | text nullable | Jacob adds freehand notes |
| createdAt | integer | |
| updatedAt | integer | |

---

## Focus App — API Routes

All routes need `Access-Control-Allow-Origin: *` (or `chrome-extension://`) CORS headers.

### Leads
```
GET    /api/leads                 paginated list
POST   /api/leads                 called by extension on comment
GET    /api/leads/[id]            lead detail
PATCH  /api/leads/[id]            update notes
DELETE /api/leads/[id]            remove lead
```

### Comment Templates
```
GET    /api/comment-templates     extension fetches this on load
POST   /api/comment-templates     create
PATCH  /api/comment-templates/[id]
DELETE /api/comment-templates/[id]
```

No auth required — consistent with the rest of the app (localhost only).

---

## Focus App — `/leads` Page

**Tab 1: Leads**
- Searchable card list
- Each card: profile picture + name + headline + company + LinkedIn link + template used + date + inline notes + delete

**Tab 2: Templates**
- CRUD list
- Each template: title, body textarea, optional image (picked from existing LinkedIn image gallery), save/delete

No pipeline stages in v1 — marketing flow automation is a future iteration.

---

## Future Iterations
- Lead pipeline stages (Commented → Connected → Meeting → Became Client)
- Automated follow-up reminders
- Convert lead → client in `/customers`
- Track which template performs best (comment → connection rate)
