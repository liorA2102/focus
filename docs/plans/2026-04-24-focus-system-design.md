# Focus — Jacob's Recruiter System Design

**Date:** 2026-04-24  
**Author:** Lior Avidar  
**End User:** Jacob (72yo recruiter)

---

## Overview

A local web app (runs on Jacob's machine, accessed via browser) that unifies his daily recruiting workflow into one simple dashboard. No complex auth, no cloud infrastructure — a reliable tool that works on his computer.

**Design principles:**
- Card-based layout, large text, clear action buttons
- Jacob never stares at a blank page — AI always provides a first draft
- No numeric scores or complex tables — labels and clear actions only

---

## Architecture

**Frontend:** Next.js  
**Backend:** Node.js or Python  
**Database:** SQLite (local)  
**AI:** Claude API — CV parsing, candidate matching, post generation  
**Browser automation:** Playwright (for JobMaster posting)  
**LinkedIn:** LinkedIn MCP (to be evaluated during implementation)  
**Image generation:** DALL-E or Flux (for LinkedIn post images)

---

## Module 1: Positions Board

Jacob's main workspace.

**Position card view shows:**
- Job title, client name, location, salary range
- Status: `Open` → `In Review` → `Offer Sent` → `Filled` / `Closed`
- Number of matched candidates

**Position detail view:**
- Full job description
- Matched candidates list, each with:
  - Match label: `Strong` / `Possible` / `Weak`
  - AI summary (2-3 lines explaining why)
  - Per-candidate actions: `Client Requested` · `Hired` · `Reject`
- Marking a candidate as `Hired` closes the position

**Adding a position:**
Simple form — job title, client, description, requirements. Matching engine runs automatically on save.

---

## Module 2: Candidate Pool

Unified inbox for all CVs regardless of source.

**Ingestion sources:**
1. **JobMaster via email** — monitors Jacob's Outlook inbox, extracts CV attachments from JobMaster notification emails, auto-parses and ingests
2. **Local folder watch** — Jacob downloads LinkedIn CVs to `~/Downloads/Candidates`, system detects and auto-ingests new files
3. **Manual upload** — drag and drop for existing local CVs

**Data extracted per candidate (via Claude):**
- Full name, contact info
- Current title, years of experience
- Skills, industries, location
- 3-line AI summary

**Candidate card shows:**
- Name, current role, location, top skills
- Source badge: `JobMaster` / `LinkedIn` / `Manual`
- Date added
- Matched positions with strength labels

**Duplicate detection:** Candidates matched by name + email across sources are merged automatically.

---

## Module 3: Job Publishing

Triggered from a position via a **Publish** button. Jacob selects one or both channels.

**JobMaster — Playwright browser automation:**
- Logs into JobMaster and fills the posting form using the saved position details
- Jacob sees a progress indicator while it runs
- On success: position tagged `Posted on JobMaster` with timestamp
- On failure: screenshot shown for diagnosis
- Credentials stored in local `.env` file (never committed)

**LinkedIn — MCP:**
- Before posting, Jacob sees an AI-generated preview of the LinkedIn post text
- He can edit or regenerate, then confirm
- On success: position tagged `Posted on LinkedIn` with link to post

---

## Module 4: LinkedIn Studio

Content creation for LinkedIn posts — separate from job publishing.

**Three post types (Jacob picks one to start):**
1. **Job post** — generated from a saved position
2. **Holiday greeting** — Jacob picks a holiday, system generates warm professional message + festive image
3. **General PR** — Jacob describes a topic, system generates thought-leadership or company update content

**Generation flow:**
1. Jacob selects post type and provides input (position / holiday / topic)
2. Claude generates a full draft — professional tone, recruiter voice, relevant hashtags
3. Jacob can: accept, type a suggestion and regenerate, or edit inline
4. System generates a suggested image (DALL-E / Flux, or a clean text-based graphic)
5. Jacob clicks **Post to LinkedIn** via MCP
6. Post logged with date, content, and link

---

## Module 5: Matching Engine

Runs automatically on every new candidate or new position.

**Triggers:**
- New candidate added → scored against all open positions
- New position created → all candidates scored against it

**Matching criteria (via Claude):**
- Job title / role similarity
- Skills overlap
- Years of experience vs. requirements
- Location match
- Industry background

**Output per match:**
- Label: `Strong` / `Possible` / `Weak`
- 2-3 line explanation
- Weak matches hidden by default, accessible via "Show all"

Jacob can always manually link or reject a match regardless of label.

---

## Suggested Implementation Order

| Phase | Module | Why first |
|-------|--------|-----------|
| 1 | Positions Board | Core of the system — everything else connects to it |
| 2 | Candidate Pool + Matching Engine | Brings the positions to life with real data |
| 3 | Job Publishing (JobMaster + LinkedIn) | Automates the most repetitive daily task |
| 4 | LinkedIn Studio | Highest AI creativity requirement — easier once infra is solid |

---

## Open Decisions (for implementation)

- Which LinkedIn MCP to use
- Image generation: DALL-E vs. Flux vs. static text graphic
- Email monitoring: Outlook API vs. local IMAP polling
