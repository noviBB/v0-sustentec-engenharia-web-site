# SEO & accessibility

## Metadata

[app/layout.tsx](../app/layout.tsx) exports a `metadata` object:

- `title`: `"Sustentec | Engenharia e Meio Ambiente"`
- `description`: a Portuguese summary of the consultancy.
- `icons`: favicon (SVG light + dark variants) + apple-icon.

When adding routes or pages, export a `metadata` from the page file to override per-route values. Use the Next.js App Router metadata API rather than `<Head>` (`<Head>` belongs to the Pages Router and is not used here).

## Language attribute

`<html lang="pt-BR">` is set statically in `app/layout.tsx`. When a visitor switches to EN via the header, **the `lang` attribute does not update** — this is a known gap (see [roadmap.md](roadmap.md)) because the language switch happens in client state after hydration and the `<html>` element is rendered server-side.

Until that's fixed: assistive tech announcing pages in Portuguese is correct for the default state; the EN experience is mid-page rendering only.

## Alt text

Every image — whether in `public/` and referenced from `<img>` / `next/image`, or fetched from an external CDN like the dashboard preview in [components/tracker-section.tsx](../components/tracker-section.tsx) — **must have an `alt` attribute**. Decorative-only images may use `alt=""` (empty string, not omitted). Translate `alt` text via `t("...")` when it conveys meaning.

## Missing routes

The following are **not present** and should be added before serious organic-search effort:

- `app/sitemap.ts` — generates `/sitemap.xml`.
- `app/robots.ts` — generates `/robots.txt`.
- `app/opengraph-image.tsx` (and twitter equivalent) — social share previews.

Tracked in [roadmap.md](roadmap.md).

## Semantic structure

Section components already use semantic landmarks (`<section>`, `<header>`, `<footer>`, etc.). When adding new sections, keep this — don't drop everything into `<div>`s.

## Image optimization

[next.config.mjs](../next.config.mjs) sets `images.unoptimized: true`. This means `next/image` ships images as-is (no resizing, no AVIF/WebP transform, no responsive `srcset`). Acceptable while the site is small; revisit before image-heavy content (see [roadmap.md](roadmap.md)).
