# Roadmap

Known gaps and deferred work. Not prioritized — order is logical-grouping, not urgency.

## Tooling

1. **Lint is broken.** [package.json](../package.json) has `"lint": "eslint ."` but `eslint` is not a devDependency and no config file exists. To fix: add `eslint`, `eslint-config-next`, and create `eslint.config.mjs` (flat config — Next.js 16 expects it). Then re-enable lint checks at build time if desired (currently no `eslint.ignoreDuringBuilds` flag is set; we just don't have lint running at all).

2. **No test harness.** Choose one of:
   - **Vitest** + Testing Library for unit / component tests.
   - **Playwright** for end-to-end.
   - Or both. Recommended starting point: Vitest for `t()` lookups and component smoke tests, Playwright if the site grows beyond marketing.

3. **No CI.** No `.github/workflows/`. Once lint/tests exist, wire a PR check.

## Features

4. **Contact form has no backend.** [components/contact-section.tsx](../components/contact-section.tsx) collects name/email/phone/message into `useState` and `console.log`s on submit. Options:
   - Next.js server action sending through the in-house email facade (`lib/email/send.ts`, provider-agnostic — SMTP by default) or posting to a Google Sheet.
   - A third-party form provider (Formspree, Tally).
   - Migrate from plain `useState` to react-hook-form + zod for validation (both are already installed).

5. **Persist language choice.** The header switcher resets to PT on every refresh. Persist to `localStorage` (or a cookie if we want SSR awareness) and update `<html lang>` reactively.

## SEO

6. **Add `app/sitemap.ts`** to emit `/sitemap.xml`.

7. **Add `app/robots.ts`** to emit `/robots.txt`.

8. **Add `app/opengraph-image.tsx`** (and `twitter-image.tsx` if needed) for social share previews.

## Performance

9. **Revisit `images.unoptimized: true`** in [next.config.mjs](../next.config.mjs). The flag is a v0 default — re-enabling Next.js image optimization requires deciding on a loader (default Vercel loader, or a custom one for non-Vercel deploys).

## Code quality

10. **Revisit `typescript.ignoreBuildErrors: true`** in [next.config.mjs](../next.config.mjs). Drop the flag once the codebase is clean enough that a stray type error during `pnpm build` is a signal worth catching.

11. **Extract i18n dictionaries.** [lib/language-context.tsx](../lib/language-context.tsx) inlines both `pt` and `en` objects. Once the surface grows past ~150 keys, extract to `lib/i18n/pt.json` + `lib/i18n/en.json` for better tooling.

12. **Audit `"use client"` placement.** Every component currently opts into client rendering. Some (e.g. pure section layouts that don't call `useLanguage`) could be server components — but only if their subtree has no `t()` calls. Low priority while the site is a single page.
