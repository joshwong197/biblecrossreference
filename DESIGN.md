# v2 Design System — "Quiet Study"

Decided 2026-07-18 with the user from three pitched directions. One system app-wide,
both light and dark themes, three registers of the same voice. This file is the
design contract for all v2 work — build against it, don't improvise.

## The decision

- **Quiet Study** (Apple/Google restraint) is the app-wide system. Scripture is the
  interface; chrome disappears.
- The **Explore tab** (generated-article feed, phase 5) uses the SAME Quiet Study
  aesthetic — card-per-insight, swipeable, but calm serif cards on paper/ink grounds,
  NOT the OLED-social look. Both themes.
- The **Laboratory direction was rejected as an aesthetic** (user: risks feeling
  "AI/Claude-ish") but its content survives: methodology, stats, tier rules, and
  gold-recall numbers are surfaced prominently — set in Quiet Study typography
  (clean tables, tabular-nums, footnote links), never terminal/monospace chrome.
- **Reader refs must be visible at a glance** — not hidden behind dots. Easy on the
  eyes, but a studying user sees immediately which verses connect and can dig without
  hunting. (User's explicit requirement.)

## Tokens (CSS custom properties on :root, switched by [data-theme])

Existing mechanism: `useTheme` sets `data-theme="light|dark"` on `<html>`. Extend it,
don't replace it. All new CSS uses these variables — no hardcoded colors in components.

| Token | Light | Dark |
|---|---|---|
| `--bg` | #FDFDFB | #131312 |
| `--bg-raised` | #F5F5F3 | #1D1D1B |
| `--ink` | #1D1D1F | #E8E6E1 |
| `--ink-2` (secondary) | #6E6E73 | #98968F |
| `--ink-3` (faint) | #B0B0B5 | #5A5954 |
| `--line` | #EBEBE8 | #2A2A27 |
| `--accent` (links, "more") | #8A6A0B | #D4AF37 |
| `--viz-bg` (canvas ground) | #FAFAFA | #0D1117 |

Tier colors: use the existing dual palettes in `src/constants/tiers.js` (light
variants on light, dark variants on dark). Tier color is the ONLY strong color in
the UI; no other accent competes.

## Type

- **Scripture**: serif — `Georgia, 'Times New Roman', serif` (`--font-scripture`).
  16.5px/1.72 on mobile, up to 19px on wide screens. Measure ≤ 65ch.
- **UI**: system sans — `-apple-system, 'Segoe UI', system-ui, sans-serif`.
- **Numbers in stats/tables**: `font-variant-numeric: tabular-nums`. No monospace faces.
- Verse numbers: 10.5px sans, `--ink-3`, superscript.
- Chapter numeral: oversized thin serif (44–64px, weight 200–400).
- Uppercase labels (book names in nav, tier names): 11–13px, letter-spacing .06–.12em,
  weight 600, `--ink-2`.

## Reader ref pattern (the core interaction)

Under each verse that has cross-references, render a **ref line**: a quiet indented
row of small chips, always visible.

- Chip = tier-colored dot + ref abbreviation ("Num 21:9"), 12px sans, `--ink-2` text,
  `--bg-raised` pill. Show the 3 strongest (shard order is already strongest-first);
  then a "+N" chip if more.
- Tap/click a chip → inline **preview card** expands below (like the pitched mockup):
  tier badge (tier name + color, e.g. "PARALLEL · Tier 3"), full target ref, target
  verse text in serif, actions "Open in Reader →" and "View on Arc". One card open at
  a time.
- Tap "+N" → full ref list for that verse (bottom sheet on mobile, side panel ≥ 900px),
  grouped by tier, each row: chip + first words of target verse.
- Ambiguous flag (bit0): show a small "≈" prefix in the chip and an "approximate
  classification" note in the preview card — honesty is a feature.
- Tier filter: pill row (sticky, top of Reader) using existing tier toggle state;
  filtered-out tiers disappear from ref lines and counts.

The verse TEXT stays untouched serif — no underlines/superscript markers inside the
scripture text itself. All connection UI lives in the ref line below each verse.

## Navigation

- Mobile (< 900px): bottom tab bar — **Read · Explore · Arc · Grid · Globe**, 10px
  labels + simple glyph, active = `--ink` weight 600, inactive `--ink-2`. About lives
  behind an "i" in the top bar.
- Desktop: existing top Header pattern, same five destinations + About.
- Routes: `/read/:book/:chapter` (+ `?v=16` scroll/highlight), `/explore`, `/arc`,
  `/grid`, `/globe`, `/about`. Book slug = lowercase abbrev from `src/constants/books.js`.

## Registers (same system, three volumes)

1. **Reader/Explore**: maximum quiet. Paper, ink, serif, tier chips only.
2. **Viz layers**: canvas on `--viz-bg` (near-black in dark — the Harrison homage —
   light gallery-white in light); tier arcs are the drama. Controls in Quiet Study
   pills/chips. Stats lines allowed but sans + tabular-nums.
3. **About/methodology**: document typography, real tables for the tier rules and
   gold-standard numbers pulled from `classification_stats.json` (never hardcode
   stats), honesty notes kept verbatim in tone.

## Non-negotiables

- Both themes on every surface, switched by tokens only.
- Respect `prefers-reduced-motion`; animations are micro (expand/collapse ≤ 200ms ease).
- Touch targets ≥ 44px on mobile. Keyboard focus visible.
- No new fonts, no new dependencies for styling. Real CSS files, not inline style objects.
