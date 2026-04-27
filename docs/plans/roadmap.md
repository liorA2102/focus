# Focus — Feature Roadmap

> Build order reflects dependency and value. Each item is a session-sized unit.

---

## 1. Publishing Indicators + Links

**Goal:** Jacob can see at a glance whether a position has been published, and jump straight to the live listing.

### What to build
- Add `publishedJobmaster` (boolean + timestamp + URL) and `publishedLinkedin` (boolean + timestamp + URL) fields to the positions schema
- On the position card and position detail page: show a badge per channel ("פורסם בג'ובמאסטר ✓", "פורסם בלינקדאין ✓") with the timestamp
- Badge is a clickable link when a URL is stored
- When Playwright finishes posting to JobMaster → write the URL back to the DB and mark published
- LinkedIn equivalent wired up once module 2 is done

### Open questions
- Does JobMaster return a stable URL after posting, or do we need to scrape it?
- Should unpublishing / re-publishing be supported?

---

## 2. Publish Position to LinkedIn

**Goal:** One-click flow to generate a job post (text + image) and publish it to LinkedIn.

### Sub-flows

#### 2a. Text generation
- Pre-fill from position data (title, client, location, requirements)
- Claude generates a first draft in Jacob's tone
- Refinement toolbar: Shorten / Expand / More formal / More casual / Translate (HE↔EN)
- Jacob approves → sent to LinkedIn

#### 2b. Image generation
- Optional but usually included
- Jacob describes the vibe in free text ("תמונה עם אנשים בפגישה, מקצועי, חם")
- System prompt / image skill enforces brand guidelines (colors, style, no text in image, etc.)
- Preview before approve
- Generation via DALL-E or Flux (TBD — evaluate free vs. cost)

#### 2c. Publishing
- LinkedIn MCP handles the actual post
- On success → update position record (module 1 badge)

### Open questions
- What are the brand image guidelines? Need a doc / reference images from Lior
- Which image model? (DALL-E 3 is easiest via OpenAI; Flux gives more control)
- Does LinkedIn MCP support image attachments?

---

## 3. General Post Generation Factory

**Goal:** Jacob can generate any LinkedIn post (holiday, company news, PR, thought leadership) — not tied to a specific position.

### What to build
- New "LinkedIn Studio" section in the sidebar (already in nav)
- Post type selector: Job Post / Holiday / Company News / Industry Insight / Custom
- Each type has its own system prompt and optional structured inputs
- Same text refinement toolbar as module 2a
- Same image generation flow as module 2b (optional per type)
- History: list of past posts with status (draft / published)

### Differences from module 2
- No position data to pre-fill from — Jacob fills a short brief
- Post types may have different tone/length targets
- History view is more important here since posts aren't attached to a position

### Open questions
- Should drafts be saved to the DB? (Yes, probably — Jacob may return to refine)
- Any recurring post types Jacob uses regularly that we should template?

---

## 4. Reports & Revenue Tracking

**Goal:** Jacob sees how much he's earned, filterable by client and time period, in a simple chart + table.

### What to build

#### 4a. "Hired" event input
- On a position, Jacob can mark a candidate as "Hired"
- Input: candidate name (pre-filled if matched), offer salary, fee amount
  - Default fee = one month salary (auto-calculated from offer salary)
  - Jacob can override the fee directly
- Fee and hire date saved to DB

#### 4b. Reports page
- Filters: time period (monthly / quarterly / yearly), client
- Chart: revenue over time (bar or line)
- Table: each hired event — position, client, candidate, salary offered, fee, date
- Summary row: total for selected period

#### 4c. Data model additions
- `hires` table: position_id, candidate_id, hire_date, salary_offered, fee_amount, notes
- Migrations + seed data for testing

### Open questions
- Should income be shown in ILS only, or support multi-currency?
- Does Jacob want to export to Excel/PDF?
- Who else (if anyone) sees the reports — or is this Jacob-only?

---

## Build Order Recommendation

| # | Module | Depends on |
|---|--------|-----------|
| 1 | Publishing indicators + links | Already partially done (JobMaster Playwright) |
| 2 | LinkedIn job post (text + image) | Module 1 for the badge write-back |
| 3 | General post factory | Module 2 (reuses all components) |
| 4 | Reports + revenue tracking | Standalone — can be parallelized |
