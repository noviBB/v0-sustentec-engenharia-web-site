# Roadmap

Known gaps and deferred work. Not prioritized — order is logical-grouping, not urgency.

## Tooling

1. ~~**Lint is broken.**~~ **Done.** ESLint flat config in [eslint.config.mjs](../eslint.config.mjs); `pnpm lint` works and enforces the module/auth import boundaries.

2. ~~**No test harness.**~~ **Done.** Vitest (unit + integration projects) and Playwright e2e are configured. See the "Testing" section in [CLAUDE.md](../CLAUDE.md).

3. ~~**No CI.**~~ **Done.** [.github/workflows/ci.yml](../.github/workflows/ci.yml) runs lint, typecheck, unit, integration, build, and e2e on every PR.

## Features

4. ~~**Contact form has no backend.**~~ **Done.** The contact form is a feature module (`modules/marketing`) with a server-action controller → service → anon-mode repo (`insertContactSubmission`), Zod validation, Upstash rate-limiting, and audit logging.

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
