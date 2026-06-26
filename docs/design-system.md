# Design system

## shadcn/ui

[components.json](../components.json) configures shadcn:

| Setting | Value |
|---|---|
| `style` | `new-york` |
| `rsc` | `true` |
| `tsx` | `true` |
| `tailwind.css` | `app/globals.css` |
| `tailwind.baseColor` | `neutral` |
| `tailwind.cssVariables` | `true` |
| `iconLibrary` | `lucide` |
| Aliases | `components`, `utils`, `ui`, `lib`, `hooks` all use `@/...` |

Adding a primitive:

```bash
pnpm dlx shadcn@latest add <component>
# e.g. pnpm dlx shadcn@latest add dialog
```

The generator writes to `components/ui/<component>.tsx`. Don't add business logic to these files — extend via composition in `components/<your-section>.tsx`.

## Tailwind 4

Tailwind **4.2.0** with the PostCSS plugin. There is **no `tailwind.config.js`** — Tailwind 4 is CSS-first.

- Plugin wiring: [postcss.config.mjs](../postcss.config.mjs) lists `@tailwindcss/postcss`.
- Design tokens, theme variables, and any `@theme` directives live in [app/globals.css](../app/globals.css).
- `tw-animate-css` is installed for prebuilt animations.

If you have Tailwind 3 muscle memory: forget `tailwind.config.{js,ts}`. Configuration is in CSS via `@theme`, `@layer`, and `@utility` directives.

## Fonts

Geist Sans and Geist Mono are loaded in [app/layout.tsx](../app/layout.tsx) via `next/font/google`. Each is instantiated with a CSS-variable output (`--font-geist-sans` / `--font-geist-mono`, `display: 'swap'`), and both variables are applied to `<html>` via `geistSans.variable` / `geistMono.variable` in the className. [app/globals.css](../app/globals.css) then maps the `@theme` tokens to those variables — `--font-sans: var(--font-geist-sans), …` and `--font-mono: var(--font-geist-mono), …` (with `Geist Fallback` / `system-ui` / `monospace` fallbacks) — so `font-sans` / `font-mono` render the real webfont. Use them through the standard Tailwind font utilities.

### Type scale

The portal text floor is `text-xs` — **no arbitrary sizes** (`text-[10px]`, `text-[11px]`, `text-[0.8rem]`). Intended role → size:

| Role | Tailwind size |
|---|---|
| Page title | `text-2xl` |
| Big stat number | `text-3xl` |
| Section / card title | `text-sm`–`text-base`, semibold |
| Body | `text-sm` / `text-base` |
| Nav | `text-base` |
| Captions / badges | `text-xs` (floor) |

## Theming

[components/theme-provider.tsx](../components/theme-provider.tsx) wraps `next-themes`. The provider is set up but the site is **light-only** today (no toggle exposed to users). Dark mode tokens are available in `globals.css` but no UI surfaces them yet.

## Icons

Lucide. Import per-icon:

```tsx
import { Mail, Phone } from "lucide-react"
```

Avoid mixing icon libraries — stick to Lucide for consistency.

## Colors and tokens

All colors are CSS variables (because `cssVariables: true` in `components.json`). Override or add tokens in [app/globals.css](../app/globals.css) under `:root` (light) and `.dark` (dark, currently unused) blocks. shadcn primitives consume these via Tailwind class utilities like `bg-background`, `text-foreground`, `border`, `ring`, etc.
