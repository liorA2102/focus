---
name: backlog
description: Manage the Focus project backlog in docs/plans/roadmap.md. Use for 'fetch-backlog-item' to read and summarise backlog items, and 'add-to-backlog' to append a new idea.
---

# Backlog Manager

The backlog lives in `docs/plans/roadmap.md` under the `## Backlog` section at the bottom of the file.

## fetch-backlog-item

Read `docs/plans/roadmap.md`, find the `## Backlog` section, and list all items clearly numbered. If the user asked about a specific item, quote it in full and summarise what it entails.

## add-to-backlog

1. Ask the user for the idea if not already provided — one sentence is enough.
2. Append a new bullet to the `## Backlog` section of `docs/plans/roadmap.md` in this format:
   ```
   - **<short title>** — <one-sentence description of the feature and its value>
   ```
3. Commit the change with message: `Add to backlog: <short title>`
4. Push to remote.
5. Confirm to the user with the exact line that was added.

## Rules

- Never reorder or rewrite existing backlog items.
- Keep new entries to one line — details belong in a design doc, not the backlog.
- Always push after writing.
