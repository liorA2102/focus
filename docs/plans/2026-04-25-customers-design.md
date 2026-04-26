# Customers Feature — Design Doc
**Date:** 2026-04-25

## Overview

A new Customers module that gives Jacob a proper client directory. Clients are added via LinkedIn company URL (Playwright scrapes name, tagline, industry, logo). Each client links to their open positions and has a manually-managed contacts list.

---

## Data Model

### New: `clients` table
```
id           integer  PK autoincrement
name         text     NOT NULL
tagline      text
industry     text
website      text
linkedinUrl  text
logoPath     text     -- local path e.g. public/logos/[id].png
createdAt    text     NOT NULL
```

Logo is downloaded and stored locally — LinkedIn's CDN blocks external hotlinking.

### New: `clientContacts` table
```
id        integer  PK autoincrement
clientId  integer  FK → clients.id  NOT NULL
name      text     NOT NULL
title     text
email     text
phone     text
createdAt text     NOT NULL
```

### Modified: `positions` table
- Add `clientId` integer (nullable FK → clients.id)
- Keep existing `client` text column as display fallback for unlinked positions
- Migration: auto-create client records from all unique existing `client` text values, link positions by matching text

The nullable FK ensures no existing data breaks. Positions without a linked client continue to display their plain text name.

---

## Navigation

Add "Customers" to the sidebar between Positions and Candidates.

Route: `/customers` and `/customers/[id]`

---

## Customers Page (`/customers`)

### Layout
Follows the same pattern as the Positions board.

**Header:** "Customers" title + "Add Client" primary CTA button.

**Metric cards (3 columns):**
- Total Clients
- Active (have ≥ 1 open position) — clicking filters the grid
- Total Contacts

**Client cards grid (3 columns):** each card shows:
- Company logo (80px circle, fallback to initials)
- Company name + industry tag
- Tagline (1 line, truncated)
- Stats row: open positions count · contacts count
- Clicking navigates to `/customers/[id]`

**Empty state:** "No clients yet." + Add Client CTA.

### Add Client Flow
Modal triggered by "Add Client" button or `/customers?new=true` (used by the position creation dropdown).

**Step 1:** Paste LinkedIn company URL → "Fetch" button → Playwright scrapes in background (loading state). Extracted: name, tagline, industry, website, logo.

**Step 2:** Scraped data pre-fills editable fields. Jacob reviews/corrects → "Save".

---

## Client Detail Page (`/customers/[id]`)

Back link: `← All Customers` (same behavior as candidate full page).

**Header:** 80px logo circle, company name (Poppins 32px), tagline (muted), meta pills row: industry · website link · LinkedIn link. Edit button (top-right) to update company fields.

**Open Positions section:** Compact list of linked positions — title, status badge, candidate count. Each row links to `/positions/[id]`. No add-position CTA here (position creation lives on the Positions board).

**Contacts section:** 2-column card grid. Each contact card:
- Name + title
- Email (mailto:) + phone (tel:)
- Delete button (muted, requires confirmation)

"+ Add Contact" opens a modal with four fields: Name, Title, Email, Phone → Save.

---

## Position Creation Changes

Replace the free-text `client` input with a searchable dropdown backed by the clients table.

- Fuzzy-searches by client name as Jacob types
- "＋ Create new client" option at the bottom of the dropdown — navigates to `/customers?new=true`, which opens the Add Client modal immediately
- After saving a new client, Jacob is returned to position creation with that client pre-selected (via query param or session state)

---

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/clients/scrape` | Playwright scrapes LinkedIn URL, returns structured data + downloads logo |
| GET | `/api/clients` | List all clients with stats |
| POST | `/api/clients` | Create client record |
| GET | `/api/clients/[id]` | Client detail + contacts + linked positions |
| PATCH | `/api/clients/[id]` | Update client fields |
| POST | `/api/clients/[id]/contacts` | Add contact |
| DELETE | `/api/clients/[id]/contacts/[contactId]` | Remove contact |

---

## Playwright Scraping

The scraper visits the LinkedIn company page and extracts:
- Company name (`h1`)
- Tagline (subtitle beneath name)
- Industry + employee count (about section)
- Website URL
- Logo image URL → downloaded and saved to `public/logos/[clientId].png`

Runs server-side in the `/api/clients/scrape` route. Returns structured JSON for the Step 2 preview form. Logo is only persisted after Jacob confirms and saves.

---

## Migration

A one-time migration script:
1. Reads all unique `client` text values from the positions table
2. Creates a `clients` record for each unique value (name only, no LinkedIn data)
3. Sets `clientId` on each position by matching the text value
4. The `client` text column remains as a fallback display value

Jacob can enrich migrated clients with LinkedIn data any time by opening the client and triggering a re-fetch.
