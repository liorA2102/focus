# Focus Design System

## Page Header — `PageHeader` component

**Source:** `src/components/ui/PageHeader.tsx`

Every page **must** use `<PageHeader>` for its top-level title. Never write an inline `h2` or custom header block on a page.

```tsx
import PageHeader from "@/components/ui/PageHeader";

// Title only
<PageHeader title={t.title} />

// Title + action buttons on the right
<PageHeader
  title={t.title}
  actions={<button className="btn btn-primary">...</button>}
/>
```

### Spec

| Property | Value |
|----------|-------|
| Font | `var(--font-body)` — Rubik (NOT font-display / DM Serif) |
| Size | 32px |
| Weight | 800 |
| Color | `var(--navy)` |
| Letter-spacing | −0.5px |
| Line-height | 1.1 |
| Accent rule | `<div className="accent-rule">` 10px below it |
| Bottom margin | 28px below the whole header row |

The `actions` slot renders right-aligned. Pass a single node or a fragment for multiple buttons.

---

## Empty State — `EmptyState` component

**Source:** `src/components/ui/EmptyState.tsx`

Use whenever a list or section has no items. Never write inline empty-state markup.

```tsx
import EmptyState from "@/components/ui/EmptyState";

<EmptyState
  icon="📋"
  iconBg="var(--coral-light)"   // optional, defaults to coral-light
  title={t.emptyTitle}
  subtitle={t.emptySubtitle}    // optional
  action={                       // optional CTA
    <button className="btn btn-primary" onClick={...}>
      {t.emptyCta}
    </button>
  }
/>
```

### Spec

| Property | Value |
|----------|-------|
| Container | `var(--surface)` bg, 1.5px dashed `var(--border)` border, `borderRadius: 16px`, `padding: 80px 24px` |
| Icon box | 56×56px, `borderRadius: 14px`, colored bg (`iconBg` prop) |
| Icon size | 26px emoji |
| Title | `var(--font-body)`, 20px, weight 700, `var(--navy)`, `letterSpacing: -0.3px` |
| Subtitle | 14px, `var(--text-muted)`, max-width 280px, centered, `lineHeight: 1.65` |
| Action | Wrapped in a `marginTop: 8px` div |

---

## Typography

```css
--font-display: 'DM Serif Display', Georgia, serif;   /* reserved for marketing/decorative h1 */
--font-body:    'Rubik', sans-serif;                   /* ALL app UI text */
```

- App UI headings always use `var(--font-body)` at 800 weight — **not** `var(--font-display)`.
- `var(--font-display)` is only for the global `h1` tag (currently unused in app pages).

---

## Buttons

| Class | Use |
|-------|-----|
| `btn btn-primary` | Primary CTA (coral background) |
| `btn btn-ghost` | Secondary/destructive-light action |

---

## Design Tokens (CSS variables)

See `src/app/globals.css` for the full list. Key tokens:

| Token | Purpose |
|-------|---------|
| `--navy` | Headings, primary text |
| `--coral` | Primary accent, CTA, alerts |
| `--coral-light` | Coral tint background |
| `--surface` | Card background |
| `--border` | Default border color |
| `--text-muted` | Secondary/disabled text |
| `--strong` | Success green |
| `--possible` | Amber (possible match) |
| `--ease-out` | Transition easing |

---

## Layout Rules

- No horizontal scrolling — cards use `min-width` with auto-fill grids.
- Large text, card-based layout — Jacob is 72 and must read comfortably.
- RTL-safe: use CSS logical properties (`paddingInlineStart`, etc.) where needed.
- Match strength labels: **Strong / Possible / Weak** — never show numeric scores.
