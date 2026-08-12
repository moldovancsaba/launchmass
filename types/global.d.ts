// This repo's .jsx components (e.g. components/Header.jsx) use styled-jsx's
// `<style jsx>` / `<style jsx global>` tags, which augment React's StyleHTMLAttributes
// with `jsx`/`global` props. styled-jsx ships this augmentation itself
// (node_modules/styled-jsx/global.d.ts) but it's only picked up automatically by a
// project using Next.js's own generated next-env.d.ts (which this repo, having no
// prior TS setup, doesn't have) — reference it explicitly instead. Triple-slash
// reference directives are only honored as the very first statement in a file (only
// comments may precede them), so this must stay above everything else here.
/// <reference types="styled-jsx/global" />

// Functional: Minimal ambient module declarations needed for `tsc --checkJs` to parse
// this repo's `pages/**` entry points (side-effect CSS imports), which are otherwise
// unresolvable under `moduleResolution: "Bundler"` with no bundler-specific type
// package installed.
// Strategic: This repo has never had a TypeScript/tsconfig setup before issue #16 —
// there is no generated `next-env.d.ts` (that's produced by `next dev`/`next build`
// and gitignored in a typical Next.js repo, but was never committed or generated
// here). Declaring only what's actually needed (CSS side-effect imports) keeps this
// additive and scoped to unblocking the checker, rather than pulling in Next's full
// ambient type surface, which is unrelated to this issue's actual goal (typing the
// six lib/ modules).
declare module '*.css';

// Functional: `window.dataLayer` is Google Analytics' gtag.js queue array,
// pushed to by lib/consent.js's loadGoogleAnalytics() (issue #18). It isn't
// a standard DOM property, so the default DOM lib types don't know about it;
// this augmentation is scoped to exactly that one property, matching the
// declare-only-what's-needed approach used above for CSS side-effect imports.
interface Window {
  dataLayer?: unknown[];
}
