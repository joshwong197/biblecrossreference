# Book art assets

Optional per-book artwork. Nothing here yet — every surface that references
these files degrades gracefully (falls back to today's plain look) when a
file is absent, so books can be filled in one at a time with no code changes.

## Convention

Two files per book, both optional, named from the book's `abbrev` in
`src/constants/books.js` (case-sensitive, e.g. `Gen`, `Exod`, `1Sam`, `Ps`,
`Song`, `Rev` — read that file for the exact list, don't guess):

| File | Used for | Recommended size | Notes |
|---|---|---|---|
| `{Abbrev}.webp` | Reader chapter banner | ~1600×500 (3.2:1) | Wide crop; the top/center is what stays visible once the reader's gradient + scrim are applied. |
| `{Abbrev}-full.webp` | Book About page (`/book/:slug`) hero | ~1600×1200 (4:3) | Fuller artwork; shown large at the top of the page. |

Format: `.webp`, sRGB. Both files are independent — a book can have one,
both, or neither. The Book About page prefers `-full`, falling back to the
banner crop, falling back to no art block at all if neither exists.

## Examples

```
public/art/Gen.webp
public/art/Gen-full.webp
public/art/Ps.webp
public/art/Rev-full.webp
```

## Adding a book's art

Just drop the file(s) in at the path above — no registration, manifest, or
build step required. The Reader and Book pages probe for the file at runtime
and render it the moment it exists.
