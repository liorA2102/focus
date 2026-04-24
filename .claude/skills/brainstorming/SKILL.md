---
name: aura-brainstorming
description: Use proactively before implementing new features, components, or significant changes. Explores requirements through structured questions and design validation. Recommended when facing unclear requirements, architecture decisions, or feature requests that need design exploration.
---

# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

Start by understanding the current project context, then ask questions one at a time to refine the idea. Once you understand what you're building, present the design in small sections (200-300 words), checking after each section whether it looks right so far.

## The Process

**Understanding the idea:**
- Check out the current project state first (files, docs, recent commits)
- Ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible, but open-ended is fine too
- Only one question per message - if a topic needs more exploration, break it into multiple questions
- Focus on understanding: purpose, constraints, success criteria

**Exploring approaches:**
- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why

**Presenting the design:**
- Once you believe you understand what you're building, present the design
- Break it into sections of 200-300 words
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing
- For any feature that generates state changes users need to act on, include a **Notifications** section:
  - Does this event warrant notifying the user? (not every state change does)
  - Which channels: in-app inbox, email, or both?
  - Reuse an existing notification type (`campaign_activity_update`, `campaign_activity_approval`, `campaign_limit_reached`, `advertiser_limit_reached`, `scale_limited_by_budget`) or define a new one
  - What is the payload schema? Start at `schemaVersion: 1`
  - Which permission key gates notification visibility? (users without that permission should not receive it)
  - Can users opt out? If yes, define the `ALERTS_TYPE` constant
  - What does the CTA link to?
- For any user-facing or access-controlled feature, include a **Permissions & Roles** section:
  - What capability code(s) does this feature introduce? (camelCase, e.g. `reportExport`)
  - Which CRUD operations apply: canCreate, canRead, canUpdate, canDelete?
  - Which default roles should receive each level of access? Start with least-privilege.
  - Any permission-boundary considerations (can users delegate this permission to others)?
- Be ready to go back and clarify if something doesn't make sense

## After the Design

**Documentation:**
- Write the validated design to `docs/plans/YYYY-MM-DD-<topic>-design.md`
- Use elements-of-style:writing-clearly-and-concisely skill if available
- Commit the design document to git

**Implementation (if continuing):**
- Ask: "Ready to set up for implementation?"
- Use /aura-using-git-worktrees to create isolated workspace
- Use /aura-writing-plans to create detailed implementation plan

## Key Principles

- **One question at a time** - Don't overwhelm with multiple questions
- **Multiple choice preferred** - Easier to answer than open-ended when possible
- **YAGNI ruthlessly** - Remove unnecessary features from all designs
- **Explore alternatives** - Always propose 2-3 approaches before settling
- **Incremental validation** - Present design in sections, validate each
- **Be flexible** - Go back and clarify when something doesn't make sense
