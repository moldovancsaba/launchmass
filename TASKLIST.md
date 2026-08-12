# Task List - launchmass

**Version: 1.23.14**

## Completed Tasks

### ✅ v1.23.14 — API: Optional limit/offset pagination on GET /api/cards (Completed 2026-08-12T16:54:31.000Z, closes #22)
- ✅ `pages/api/cards/index.js` GET branch: added optional `limit`/`offset` query
      params, parsed after the existing org-context 400 guard. `limit` must be a
      finite number `> 0` (capped at `MAX_LIMIT = 500`) or it — along with any
      non-numeric/negative `limit` — is treated as "not supplied," falling back to
      the default unbounded behavior rather than a 400 (optional-enhancement
      semantics, not a validated/required param, per the issue). `offset` defaults
      to `0` when absent or invalid (non-numeric or negative). Sort order
      (`{order: 1, _id: 1}`) unchanged in both branches.
- ✅ Response shape strictly gated on presence of a valid `limit`: absent -> the
      exact pre-existing bare `CardDoc[]` array (`countDocuments` never runs on this
      path, so zero added query cost for every existing caller); present ->
      `{ cards: CardDoc[], total: number, hasMore: boolean }`, `total` via
      `countDocuments(filter)`, `hasMore = total > offset + cards.length`.
- ✅ `ARCHITECTURE.md`'s API Routes section documents both shapes and the exact
      condition (presence of `limit`) selecting between them, explicit that the
      dual shape is deliberate, not an inconsistency.
- ✅ Out of scope per the issue's Non-Goals, confirmed untouched: no "load
      more"/infinite-scroll UI in the admin card list or public grid (neither
      `pages/admin/index.js`'s `fetchItems` nor `pages/index.js`'s
      `getServerSideProps` passes `limit`/`offset` — both continue receiving the
      full bare array, unchanged call sites); no pagination added to
      `/api/organizations` or `/api/admin/users`; offset/limit only, no cursor-based
      pagination.
- ✅ **Manual verification actually performed** (local `mongod` on port 27199, a
      seeded test organization + up to 520 seeded cards, `npm run dev` against that
      local DB): `GET /api/cards` with no params returned a bare JSON array
      (`isinstance(d, list)` true) at the seeded count, matching pre-change shape;
      `GET /api/cards?limit=5` returned `{cards: [...5], total, hasMore}` with the
      correct 5 items and `total`/`hasMore` matching the seeded count;
      `GET /api/cards?limit=5&offset=5` returned the next 5 items with zero `_id`
      overlap against the first page (checked via set intersection); seeded 520
      total cards and confirmed `GET /api/cards?limit=9999` returned exactly 500
      cards (not 520) with `total: 520, hasMore: true` — the 500 cap verified
      against a real over-cap dataset, not just reasoned through — while the
      unpaginated `GET /api/cards` on the same 520-card dataset still returned all
      520 as a bare array, confirming the default path is unaffected; `offset=100`
      (beyond the 15-card baseline total) returned `cards: []`, `hasMore: false`,
      and the correct `total`; `limit=-5`, `limit=abc`, `limit=0`, and
      `offset=-1` each returned `HTTP 200` with the default bare-array/whole-dataset
      behavior (`offset=-1` combined with `limit=5` fell back to `offset=0`), not a
      400, per the issue's "ignore invalid values" requirement. Test data (org +
      cards) removed from the local DB after verification.

### ✅ v1.23.13 — UX: Structured background/gradient editor replacing raw-CSS textarea (Completed 2026-08-12T18:00:00.000Z, closes #20)
- ✅ `components/admin/BackgroundEditor.jsx` (new): three-mode editor — Solid (validated
      hex text field), Gradient (angle + N color stops, add/remove, not capped at 3),
      Advanced (the original raw-CSS textarea, unchanged) — wired into `pages/admin
      /index.js`'s `Card` component in place of the old always-raw-CSS textarea.
      Storage contract unchanged: `item.background` stays a plain CSS string,
      unchanged-`normalizeBg`-parseable.
- ✅ `detectMode(cssValue)` classifies an existing card's stored value into the mode it
      opens into, falling back to Advanced for anything not cleanly a solid hex or a
      clean single-line `linear-gradient(...)` (multi-layer shorthand, rgba stops
      without an explicit `%`, etc.) so an unusual-but-valid value is never corrupted.
- ✅ Mode-switch data-loss guard: an Advanced-mode value `detectMode` can't classify
      disables the Solid/Gradient radio options (GDS `GdsSegmentedControl`) and shows a
      GDS `InlineAlert` with an explicit "Reset to default gradient" action — never a
      silent switch-and-discard.
- ✅ Inline validation (GDS `FormField` error text) for the Solid hex field and each
      Gradient stop's color field; the card form's Save button is disabled while
      invalid, so no malformed value can be saved via a silent fallback.
- ✅ Live preview swatch (decorative, `aria-hidden`) updates synchronously with every
      field edit in all three modes.
- ✅ GDS component-fit investigation (Mandatory per the issue): confirmed, against the
      real vendored `@sovereignsquad/gds-core@6.0.0` compiled output (not just its
      `.d.ts` files), that GDS has no color-picker/color-input primitive and does not
      re-export Mantine's `ColorInput`/`ColorPicker` — a genuine, narrow gap, addressed
      by using GDS's own `FormField` as a validated text field rather than reaching for
      a non-GDS picker library. Full writeup in `ARCHITECTURE.md` and `LEARNINGS.md`.
- ✅ Real-browser verification via headless Chromium against a temporary scratch route
      (`pages/dev-bg-editor-test.js`, deleted before this commit — not part of the
      shipped change): solid-hex card opens in Solid mode with the correct color;
      gradient card opens in Gradient mode with the real angle/stops; a new card's
      default gradient is pre-populated, not blank; an invalid hex shows inline
      validation and reports invalid (Save-gating); the live preview swatch updates on
      edit; an unparseable Advanced value disables Solid/Gradient and shows the
      blocked-mode alert with a working Reset action; add/remove-stop works beyond 3
      stops. All 15 assertions passed; see the PR body for the full list.
- ✅ `npm run verify-docs`, `npm run lint`, `npm run typecheck`, `npm run scan-secrets`,
      and `npm run build` all clean.

### ✅ v1.23.12 — CLEANUP: Normalize ssoPermissions module extension and logging conventions (Completed 2026-08-12T00:00:00.000Z, closes #17)
- ✅ `lib/ssoPermissions.mjs` renamed to `lib/ssoPermissions.js` via `git mv` (history
      preserved through the rename — verified with `git log --follow lib/ssoPermissions.js`).
- ✅ All import sites updated (`pages/api/oauth/callback.js`,
      `pages/api/admin/batch-sync-sso.js`,
      `pages/api/admin/users/[ssoUserId]/change-role.js`,
      `pages/api/admin/users/[ssoUserId]/grant-access.js`,
      `pages/api/admin/users/[ssoUserId]/revoke-access.js`); `git grep -n "ssoPermissions"`
      confirms zero remaining `.mjs` references outside of historical changelog/
      debugging-narrative text in `RELEASE_NOTES.md`/`TASKLIST.md`/`LEARNINGS.md`, which
      is left as an accurate record of past events, unchanged.
- ✅ Local `logger` object replaced with the codebase's `dlog`/`OAUTH_DEBUG` gated-debug
      pattern (`logger.debug`/`logger.info` → `dlog(...)`; `logger.warn`/`logger.error` →
      direct, unconditional `console.warn`/`console.error`), matching the convention in
      `pages/api/oauth/callback.js` and `lib/org.js`.
- ✅ `ARCHITECTURE.md`, `WARP.md`, and `lib/types.js` updated to reference
      `lib/ssoPermissions.js` in their current-state module descriptions.
- ✅ `npm run verify-docs`, `npm run lint`, `npm run typecheck`, `npm run scan-secrets`,
      and `npm run build` all clean.

### ✅ v1.23.11 — UX: Loading, error, and retry states for the public card grid (Completed 2026-08-12T16:01:48.000Z, closes #19)
- ✅ `pages/index.js`'s `getServerSideProps` no longer swallows fetch failures with a
      bare `catch {}`. The catch block now captures the real error, logs it via
      `console.error('[index] getServerSideProps failed:', err.message)` (server-side
      only), and returns an explicit `fetchError: true` prop distinct from a
      legitimately-empty organization's `fetchError: false`.
- ✅ `Home` renders three mutually-exclusive states: `fetchError === true` -> GDS
      `GdsErrorPageTemplate` with a fixed, generic message and a `onRetry`-wired retry
      button (`window.location.reload()` — a full navigation, matching this page's
      SSR-per-request model with no client-side data-fetching layer to re-run in
      place); `fetchError === false && cards.length === 0` -> GDS
      `GdsEmptyStateTemplate` (the pre-existing "Welcome to SEYU / No content found
      yet" copy, restyled onto GDS, same Organizations/Admin quick-access actions);
      `cards.length > 0` -> the existing `<main className="grid">` grid, unchanged.
- ✅ **GDS component choice — `GdsEmptyStateTemplate` + `GdsErrorPageTemplate`,
      matching the issue's suggestion, verified rather than assumed:** checked the
      actually-installed `@sovereignsquad/gds-core@6.0.0` dist
      (`node_modules/@sovereignsquad/gds-core/dist/AISearchCard-DlLxEGV9.d.ts`) —
      both exist exactly as named, as governed page templates (`empty-state-page` /
      `error-page`) with documented accessibility contracts ("single h1, specific
      empty reason, keyboard reachable recovery, no color-only meaning" /
      "main landmark, semantic heading, recovery action label, status text").
      `GdsErrorPageTemplate`'s `onRetry`+`retryLabel` props render GDS's own retry
      `<button>` with no hand-rolled markup, satisfying the issue's "GDS button
      primitives, not a hand-rolled `<button>`" constraint. Both templates render
      their own `<main>` landmark internally, so the populated-grid `<main>` is only
      rendered when `cards.length > 0`, avoiding duplicate `<main>` landmarks.
- ✅ Edge cases verified: a tag filter with zero matching cards renders the GDS empty
      state (not error) with the filter bar still shown, matching the issue's Edge
      Cases section; a missing/unconfigured `defaultOrg` continues to render as
      "empty" (pre-existing behavior, out of scope to change).
- ✅ **Manual verification actually performed** (local MongoDB, Playwright +
      `/opt/pw-browsers/chromium`): seeded an org with zero cards — GDS empty state
      rendered with expected copy and functional Organizations/Admin buttons; seeded
      an org with two cards — grid rendered unchanged (exactly one `<main
      class="grid">`, identical `OversizedLink`/`ChoiceChip` markup); pointed
      `MONGODB_URI` at an unreachable port to force a real connection failure — the
      server terminal logged `[index] getServerSideProps failed: connect ECONNREFUSED
      127.0.0.1:27199`, the GDS error state rendered (not the empty state), and the
      client-facing HTML was grepped for `27199`/`ECONNREFUSED`/`mongodb://`/
      `MongoServerError`/the DB name/the IP — zero occurrences of all five; clicked
      the "Try again" retry button and confirmed via network-request counting that it
      triggered a second, real full-page request (not a no-op).

### ✅ v1.23.10 — UX: Consent-gated Google Analytics loading (Completed 2026-08-12T15:37:36.000Z, closes #18)
- ✅ `pages/_document.js` no longer unconditionally injects `gtag.js` (the tracking ID
      `G-HQ5QPLMJC1` script tag + inline `dataLayer`/`gtag('config', ...)` call). Loading
      moved to `lib/consent.js`'s `loadGoogleAnalytics()`, called only client-side and
      only once consent is granted.
- ✅ Added `lib/consent.js` — `localStorage` key `seyu-analytics-consent`
      (`'accepted'`/`'declined'`/absent = undecided), `readConsent()`/`writeConsent()`
      wrapped in try/catch (private-mode/quota-exceeded storage failures are treated as
      "undecided every visit," matching the issue's Edge Cases, not surfaced as errors),
      and the `gtag.js` loader itself (module-level guard prevents double-injection on
      re-render).
- ✅ Added `components/ConsentBanner.jsx`, mounted from `pages/_app.js` alongside the
      existing `MantineProvider`/`OverlayManagerProvider`. Renders nothing until after a
      client-side mount effect confirms the stored decision (SSR-safe — no
      consent-related content is ever server-rendered, avoiding a hydration mismatch).
      Shows a GDS `BannerNotice` with Accept/Decline actions while undecided; once
      decided, shows a small persistent "Cookie preferences" `Button` that reopens the
      same banner (GDPR requires withdrawing consent to be as easy as giving it).
- ✅ **GDS component choice — `BannerNotice`, not the issue's suggested
      `GdsSheet`/`GdsDrawer`:** verified against the actually-installed
      `@sovereignsquad/gds-core@6.0.0` dist (`node_modules/@sovereignsquad/gds-core/dist/client.d.ts`),
      not the issue's guess. `GdsSheet` is `GdsDrawer` with `mobileFullscreen` defaulted —
      an overlay-manager-governed surface that traps focus and carries a backdrop, i.e.
      modal behavior, which the issue explicitly rules out ("must not block interaction
      with the page underneath ... non-modal"). `BannerNotice` is GDS's in-flow,
      non-overlay alert primitive (`role="status"`/`"alert"` with a matching ARIA live
      region, built on Mantine's `Alert`) — never registers with the overlay stack, never
      traps focus, no backdrop. Wrapped in a fixed-position container (plain inline style
      for positioning only — no GDS primitive governs "pin to viewport edge"; the
      banner's typography/color/spacing/radius/interaction states remain fully
      GDS-token-driven).
- ✅ No new GDS installation path added — reused the repo's already-vendored
      `@sovereignsquad/gds-core`/`gds-theme` v6.0.0 (`file:vendor/gds/...tgz`) and the
      already-mounted `MantineProvider` in `pages/_app.js`. Ignored the issue's stale
      `npm install @sovereignsquad/gds ...` / `.npmrc` GitHub Packages instructions —
      superseded by the repo's actual vendoring since the issue was filed.
- ✅ Real-browser verification performed via Playwright + Chromium (`/opt/pw-browsers/chromium`):
      clean localStorage load shows the banner with zero `googletagmanager.com` network
      requests before interaction; Accept fires the `gtag.js` request and persists
      `'accepted'`; reload with `'accepted'` stored loads `gtag.js` automatically with no
      banner; Decline persists `'declined'` and `gtag.js` never loads, across reloads;
      zero hydration-mismatch console warnings on first load. See the PR body for the
      full verification transcript.
- ✅ README.md updated with a short note on the consent-gated analytics behavior — the
      broader README rewrite tracked separately in issue #21 is out of scope here.

### ✅ v1.23.9 — TOOLING: Introduce static type checking via JSDoc annotations + tsc --checkJs (Completed 2026-08-12T15:22:52.000Z, closes #16)
- ✅ Added `jsconfig.json` (`checkJs: true`, `allowJs: true`, `noEmit: true`, `target:
      ES2022`, `module: ESNext`, `moduleResolution: Bundler`) scoped to `lib/**/*.js` +
      `pages/**/*.js`. Deviated from the issue's literal sketch in three ways, each
      necessary for a clean `npm run typecheck` and documented in the PR: `"strict":
      false` (the installed `typescript` devDependency defaults `strict` to `true`,
      which is not what the issue's Non-Goals section wants — default strictness, not
      full strict mode); `"jsx": "preserve"` (several `pages/**`/`components/**` `.jsx`
      files use JSX and fail to parse without it); and an added `types/global.d.ts`
      include entry (ambient `declare module '*.css'` for side-effect CSS imports, plus
      a `/// <reference types="styled-jsx/global" />` for `<style jsx>` — this repo has
      no generated `next-env.d.ts` to supply either).
- ✅ Added `lib/types.js` — JSDoc `@typedef`s for `UserDoc`, `OrgDoc`, `CardDoc`,
      `SessionPayload`, read from the actual current implementation (not the issue's
      original sketch): `UserDoc.appRole` is `'none'|'user'|'admin'|'superadmin'` (the
      sketch's 3-value set omitted `'superadmin'`, which `scripts/migrate-default-org.cjs`
      genuinely sets) and `UserDoc.appStatus` includes `'error'` (set by
      `pages/api/oauth/callback.js`'s fail-closed DB-error path) alongside the sketch's
      `pending`/`active`/`suspended`. Documents the boundary-cast convention (cast the
      MongoDB driver's untyped result once, at the read-path function, into the typed
      shape — cast through `unknown` first if tsc rejects the single-step assertion).
- ✅ Added `@param`/`@returns` JSDoc to every exported function in `lib/users.js`,
      `lib/permissions.js`, `lib/ssoPermissions.mjs`, `lib/session.js`, `lib/org.js`,
      `lib/db.js`, applying the boundary-cast convention at every driver read
      (`getUsersCollection()`'s return, `getOrgBySlugCached`/`getOrgByUuid`'s
      `findOne()`, `batchSyncToSSO`'s `.find().toArray()`).
- ✅ Fixed genuine type errors the annotations surfaced, beyond just adding types:
      `lib/permissions.js`'s `getPermissionMetrics()` had a real `string | number`
      mismatch feeding `parseFloat()` (fallback `0` where `.toFixed()` returns a
      string — changed to `'0.00'`/`'0.0'`, `parseFloat('0.00') === 0` so no behavior
      change); `lib/analytics.js`'s `logEvent()` JSDoc claimed a fixed `{orgUuid,
      userId, metadata}` shape but every real call site passes free-form extra fields
      directly on the object (not nested under `metadata`) — loosened to
      `Record<string, any>` to match actual usage rather than the stale doc.
      `pages/api/oauth/callback.js`'s `userRole`/`permissionStatus` locals get narrow
      `@type` annotations (not full route annotation, per the issue's `pages/**`
      Non-Goal) so `signSession()`/`upsertUserFromSso()`'s new parameter types hold.
- ✅ `tsc` (providing the `tsc` binary) and `@types/node` added as devDependencies only
      (`package.json` `dependencies` unchanged); `"typecheck": "tsc -p jsconfig.json
      --noEmit"` added to `package.json` scripts — the explicit `-p jsconfig.json` is
      required because the `tsc` CLI does not auto-discover a config file named
      `jsconfig.json` (only `tsconfig.json`), confirmed empirically. Wired into
      `.githooks/pre-commit` and `.github/workflows/ci.yml` in the same position as
      `lint` (after it, before `scan-secrets`), matching issue #15's precedent.
- ✅ **Core acceptance criterion, actually executed, not just reasoned through:** ran
      the issue's exact reproduction — `sed -i "s/appStatus/status/" lib/ssoPermissions.mjs`
      (simulating the historical #12 bug) — and observed `npm run typecheck` fail
      (exit 2) with `lib/ssoPermissions.mjs(377,16): error TS2339: Property 'status'
      does not exist on type 'UserDoc'.` (and again at line 378), then reverted the
      file and re-confirmed a clean `npm run typecheck` (exit 0). This is the
      mechanism issue #16 exists to add — confirmed working, not assumed.
- ✅ All five quality-gate commands (`verify-docs`, `lint`, `typecheck`, `scan-secrets`,
      `build`) run clean against the final tree; `CLAUDE.md`/`AGENTS.md` §3 updated
      (byte-identical, `diff` empty) to add `typecheck` to the documented chain and
      Definition of Done; `WARP.md` documents the command and the JSDoc/boundary-cast
      convention for future `lib/` code.

### ✅ v1.23.8 — TOOLING: Introduce ESLint baseline configuration and CI integration (Completed 2026-08-12T14:53:41.000Z, closes #15)
- ✅ Added flat-config `eslint.config.mjs` (project's `package.json` has `"type": "module"`),
      built on `eslint-config-next`'s `next/core-web-vitals` (via `FlatCompat`, since
      `eslint-config-next` still ships legacy-style shareable configs) plus the
      project-specific rules: `no-unused-vars: error`, `no-console: [warn, {allow:
      ['error','warn']}]`, `no-undef: error`, `eqeqeq: [error, smart]`.
- ✅ `pages/`, `lib/`, `components/` get both browser and Node globals (client components
      run in the browser; `pages/api/*` and the `lib/*` that backs them run under Node on
      the server). `scripts/**` gets only Node globals — no browser globals apply to pure
      CLI scripts — and `scripts/**/*.cjs` additionally gets `sourceType: 'script'` so
      `require`/`module`/`exports`/`__dirname` resolve as CommonJS globals instead of
      false-positive `no-undef` errors (ESLint 9's flat-config parser rejects a bare
      `sourceType: 'commonjs'` — the accepted values are `module`/`script`/`unambiguous`).
- ✅ `next lint`'s default directory scan (`src`, `app`, `pages`, `components`, `lib`) does
      **not** include `scripts/` — confirmed empirically (a first run silently skipped it).
      `"lint"` in `package.json` therefore passes `--dir pages --dir lib --dir components
      --dir scripts` explicitly so the issue's required scope is actually covered.
- ✅ Triaged all 32 error-level violations surfaced by the first real run against the
      post-#14 tree (432 warnings, all `no-console`, left as warnings per the issue's own
      design — see Known Limitations below) and fixed every one at the source, no
      `eslint-disable` suppressions:
      - 19 genuine unused imports/vars/functions (dead code — e.g. `pages/admin/index.js`'s
        `createOrganization`/`orgForm` state, an org-creation feature with no UI wired to
        it at all, and a duplicate `handleLogout` that `components/Header.jsx`'s global
        header already superseded; `pages/api/organizations/index.js`'s unused
        `ensureOrgContext`/`getOrgContext` imports; several swallowed `catch (err)` blocks
        converted to bindingless `catch {}` where the error was never inspected).
      - 10 `@next/next/no-html-link-for-pages` (plain `<a href="/...">` for in-app routes
        in `pages/index.js`, `pages/organization/[slug]/admin.js`, and
        `components/Header.jsx`) — converted to `next/link`'s `<Link>`.
      - 2 destructure-to-omit-a-field patterns (`pages/api/organization/[slug].js`,
        `pages/index.js`, `pages/organization/[slug].js`) where the omitted field
        (`isActive`, `_id`) was bound but never read — reworked to `delete rest.<field>`
        instead of binding an unused name.
      - 1 `react/no-unescaped-entities` (a literal apostrophe in `pages/access-pending.js`).
- ✅ Wired into `.githooks/pre-commit` (after `verify-docs`, before `scan-secrets`, matching
      the issue's Architecture diagram) and `.github/workflows/ci.yml` (after `verify-docs`,
      before `scan-secrets`/`build`).
- ✅ Actually ran the synthetic pre-commit-block test end-to-end (not just wrote the hook):
      appended an obviously-unused `const unusedLintTestVar = 12345;` to `lib/db.js`,
      staged it, attempted a commit — the pre-commit hook printed the exact
      `'unusedLintTestVar' is assigned a value but never used  no-unused-vars` ESLint
      error and exited non-zero, blocking the commit (`git log` confirmed no commit landed);
      reverted the test change with `git restore --staged --worktree lib/db.js` before the
      real commit.
- ✅ `CLAUDE.md`/`AGENTS.md` §3's quality-gate chain and Definition of Done updated to add
      `npm run lint` (removing the "not present yet" language), kept byte-identical per
      their own §8 sync rule. `WARP.md`'s development-commands section documents
      `npm run lint`. `ARCHITECTURE.md` gained a short "lint as the test substitute"
      rationale note.
- Known Limitation carried over from the issue: `no-console` stays `warn`, not `error` —
      432 warnings remain across the tree (overwhelmingly legitimate server-side
      `console.error`/diagnostic logging in `scripts/*` migration/maintenance tooling and
      `lib/analytics.js`/`lib/org.js`/`lib/ssoPermissions.mjs`), consistent with the issue's
      own Non-Goal ("zero warnings on day one"); a full audit to promote it to `error` is
      explicitly deferred to a future issue.

### ✅ v1.23.7 — REFACTOR: Extract shared card/organization normalization helpers into a single module (Completed 2026-08-12T14:30:56.000Z, closes #14)
- ✅ New `lib/shared.js` exports `DEFAULT_BG`, `normalizeBg`, `normalizeTags`, `toClient` —
      pure functions with zero dependency on Next.js request/response objects or any
      server-only API, so the module is safely importable by both server-side API routes
      and client-bundled page components.
- ✅ Consolidated six pre-refactor copies, not the three the issue text described (the repo
      had drifted since the issue was filed): `pages/api/cards/index.js`,
      `pages/api/cards/[id].js`, `pages/api/organizations/index.js`,
      `pages/api/organizations/[uuid].js`, `pages/admin/index.js`, and `pages/settings.js`
      all had their own `normalizeBg`/`DEFAULT_BG`; `cards/index.js` and `cards/[id].js`
      additionally each had their own `normalizeTags`/`toClient`. All now import from
      `lib/shared.js`.
- ✅ Deliberately left untouched (issue #14 Non-Goal): `pages/admin/index.js`'s local
      client-side `normalizeTags` copy — browser-bundle code, intentionally not merged.
- ✅ Behavioral divergence found and resolved during the diff: `normalizeBg` had two
      outlier copies (`cards/index.js` had neither the leading `!input` guard nor the
      trailing `|| DEFAULT_BG` fallback; `cards/[id].js` had only the trailing fallback)
      against four copies that already had both guards (`organizations/index.js`,
      `organizations/[uuid].js`, `pages/settings.js`, and functionally
      `pages/admin/index.js` via its `input || ''` idiom). Standardized on the
      fully-defensive variant per the issue's own guidance; verified this is
      behavior-preserving for both outlier call sites (see `lib/shared.js`'s inline
      comment and the PR description for the full reasoning).
- ✅ `git grep -n "function normalizeBg" pages` returns zero matches; `pages/admin/index.js`
      still defines `normalizeTags` locally as intended.
- ✅ `ARCHITECTURE.md` updated with a new `lib/shared.js` module-structure entry.

### ✅ v1.23.6 — FIX: Wire orphaned analytics event-logging module into mutation flows (Completed 2026-08-12T14:14:17.000Z, closes #13)
- ✅ `lib/analytics.js`'s `logEvent`/`logAdminAction` (previously fully built but never
      called from any route) are now wired in as fire-and-forget calls immediately after
      each successful Mongo write:
      `pages/api/cards/index.js` (POST → `CARD_CREATE`), `pages/api/cards/[id].js`
      (PATCH → `CARD_UPDATE`, DELETE → `CARD_DELETE`), `pages/api/cards/reorder.js`
      (→ `CARD_REORDER`), the three admin user-management routes
      (`change-role`/`grant-access`/`revoke-access.js` → `logAdminAction`), and
      `pages/api/oauth/callback.js` on successful login (→ `USER_LOGIN`, additive
      alongside the existing `recordAuthEvent` audit-trail call, not a replacement).
- ✅ Event payloads carry identifiers only (`orgUuid`/`userId`/`cardId`/`cardIds`) —
      never full card content (`href`/`title`/`description`) or other PII.
- ✅ Explicitly deferred, not wired in: a client-side card-click beacon endpoint for
      `logCardClick` (needs a new public `POST /api/analytics/click` endpoint — its own
      future issue), and `ORG_CREATE/UPDATE/DELETE` events in
      `pages/api/organizations/**`.
- ✅ `lib/analytics.js`'s docstring rewritten: removed "orphaned" framing, listed the
      real call sites now wired in, documented the serverless-cold-shutdown
      best-effort-delivery caveat as an accepted trade-off of the batching design.

### ✅ v1.23.5 — FIX: Correct field-name mismatch in SSO batch permission sync (Completed 2026-08-12T14:06:03.000Z, closes #12)
- ✅ `lib/ssoPermissions.mjs`'s `batchSyncToSSO()` now queries `appStatus` (not the
      non-existent `status`) and projects/reads `appRole`/`appStatus` (not `role`/
      `status`), matching the real `users` collection schema established by
      `lib/users.js`'s `upsertUserFromSso`. The function previously matched zero
      users on every invocation and silently reported false-success
      (`{synced:0, errors:0}`).
- ✅ Added an `appStatus: 'suspended'` → SSO `status: 'revoked'` mapping branch, since
      `appStatus`'s real value space includes `'suspended'`. Documented in code that
      this branch is currently unreachable in practice — the query itself still only
      matches `'active'`/`'pending'`, unchanged in scope — so a future reader doesn't
      assume suspended users are actively synced.
- ✅ Preserved the existing `appRole`-default-to-`'user'` intent
      (`user.appRole && user.appRole !== 'none' ? user.appRole : 'user'`).
- ✅ Added a code comment at the top of `batchSyncToSSO` documenting the field-name
      correction and an explicit **operator caution**: this function has never
      actually called the live SSO API in production (it always no-op'd), so its
      first real post-fix invocation will trigger a live burst of
      `syncPermissionToSSO` calls against the real SSO service for every current
      active/pending user — flagged prominently in the PR description as well.
- ✅ Verified `git grep -n "user\.status\|user\.role" lib/ssoPermissions.mjs` returns
      zero matches.
- ✅ Verified query/mapping logic against a disposable local MongoDB instance with
      `syncPermissionToSSO`'s underlying `fetch` calls stubbed (no real network
      call reached SSO) — confirmed `'suspended'` users are excluded by the query,
      legacy documents using the old `status`/`role` fields are not matched, active
      users map to `'approved'`, pending users map to `'pending'`, `appRole: 'none'`
      defaults to `'user'` in the payload sent, and a user missing `ssoUserId` is
      recorded as a per-user error without aborting the batch.

### ✅ v1.23.4 — SEC: Eliminate session-cookie exposure in card API request logging (Completed 2026-08-12T13:55:36.000Z, closes #11)
- ✅ `pages/api/cards/index.js` no longer logs `req.headers` (or any other cookie-bearing
      structure) anywhere, unconditionally or gated — the line that serialized and logged
      the full request headers (including the HMAC-signed `sso_session` cookie value on
      every request) is deleted entirely, not merely flag-gated.
- ✅ Added a module-level `dlog(...)` gated by `process.env.CARDS_DEBUG === 'true'`,
      matching the existing `OAUTH_DEBUG` (`pages/api/oauth/callback.js`) /
      `ORG_CACHE_DEBUG` (`lib/org.js`) convention.
- ✅ Consolidated the ~6 remaining unconditional diagnostic `console.log` calls in the
      GET request path into a single `dlog('[cards API]', req.method, 'org=', ctx.orgUuid,
      'count=', docs.length)` call — non-sensitive fields only (method, resolved org
      UUID, result count), no raw header/filter object dumps.
- ✅ Documented `CARDS_DEBUG` in `.env.example` alongside `OAUTH_DEBUG`/`ORG_CACHE_DEBUG`.
- ✅ Verified `git grep -n "req.headers" pages/api/cards/index.js` returns zero matches.

### ✅ v1.23.3 — SEC: Require organization context on card listing endpoint (Completed 2026-08-12T13:47:10.000Z, closes #10)
- ✅ `pages/api/cards/index.js` GET branch now returns `400 { error: 'Organization
      context required (X-Organization-UUID or ?orgUuid=)' }` when `getOrgContext(req)`
      resolves no `orgUuid`, instead of querying with an empty filter and returning
      every organization's cards
- ✅ Removed the obsolete `X-Deprecation: org-context-required` header and its dead
      branch; GET with a valid org context is unchanged (still scoped, still 200)
- ✅ Left the `console.log` debug lines in this handler untouched — that cleanup is
      issue #11's scope, coordinated to land after this issue per its own notes
- ✅ Caller audit: `pages/admin/index.js`'s `fetchItems` is the only production caller
      and already sends the org header when known; a transient initial-mount race
      (`fetchItems('')` before org selection) now gets a 400 instead of the old
      all-orgs fallback, but the existing `Array.isArray(data) ? setItems(data) :
      setItems([])` handling already degrades that to an empty grid, not a visible
      crash. `scripts/seed-cards.cjs` also omits the org header but was already
      broken by #8's org-scoped POST enforcement (v1.23.1) — stale tooling, not a
      live caller
- ✅ `ARCHITECTURE.md` documents `GET /api/cards` as requiring org context (400
      without it), replacing the "optional, deprecated fallback" description
- ✅ `npm run verify-docs`, `npm run scan-secrets`, and `npm run build` all clean

### ✅ v1.23.2 — Consolidated admin-role authorization into a shared guard (Completed 2026-08-12T12:54:05.000Z, closes #9)
- ✅ Extracted `isAppAdmin(user)` (predicate) and `requireAdminRole(handler, message)`
      (API-route HOF) into `lib/auth-oauth.js`, reproducing the exact `appRole`/
      `isSuperAdmin`-flag check and per-route 403 message text that was previously
      duplicated inline across `pages/api/admin/users/index.js`,
      `.../[ssoUserId]/change-role.js`, `.../[ssoUserId]/grant-access.js`,
      `.../[ssoUserId]/revoke-access.js`, `pages/api/admin/batch-sync-sso.js`, and
      `pages/admin/users.js`'s `getServerSideProps` — zero behavior change, pure
      refactor of an already-correct check (the actual privilege-escalation
      vulnerability was fixed earlier in PR #38 / v1.21.0)
- ✅ All six call sites now import the shared guard/predicate; no duplicate inline
      `appRole`/`isSuperAdmin` checks remain
- ✅ `ARCHITECTURE.md` documents `isAppAdmin`/`requireAdminRole` and notes that all
      `admin/users/**` and `admin/batch-sync-sso` routes require `appRole`
      admin/superadmin (or the `isSuperAdmin` flag)
- ✅ `npm run verify-docs` and `npm run build` both clean

### ✅ v1.23.1 — Security: Org-scoped authorization on card mutation endpoints (Completed 2026-08-12T12:51:18.000Z, closes #8)
- ✅ `pages/api/cards/index.js` (POST), `cards/[id].js` (PATCH, DELETE), `cards/reorder.js`
      (POST) checked only that *a* valid session existed (`withSsoAuth`), never that the
      caller held the relevant `cards.*` permission in the org named by
      `X-Organization-UUID` — any authenticated user of any org could write to another
      org's cards
- ✅ Replaced `withSsoAuth` + manual `getOrgContext` in all four routes with
      `withOrgPermission('cards.create'|'cards.update'|'cards.delete'|'cards.reorder',
      handler)` — the same wrapper already used correctly in
      `pages/api/organizations/[uuid]/**`; no new authorization primitive, permission
      matrix unchanged
- ✅ Removed each route's now-redundant manual `getOrgContext` call (`withOrgPermission`
      resolves org context internally and attaches `req.orgContext`)
- ✅ Updated `ARCHITECTURE.md`'s API-routes section to document the new per-route
      permission requirement
- ✅ `npm run verify-docs` and `npm run build` both clean
- ⚠️ Live curl-based manual verification from the issue's Manual Verification section was
      not executed (no live SSO/DB credentials in this environment) — only static/
      code-path verification was performed; see RELEASE_NOTES.md v1.23.1 entry and the PR
      description for exact scope
- ⚠️ Post-merge review fix (same PR, before merge): routes as first written called
      `withOrgPermission` without `withSsoAuth`, leaving `req.user` undefined and
      rejecting every request with 403 — fixed by composing
      `withSsoAuth(withOrgPermission(...))` before merge; rebuilt clean

### ✅ v1.23.0 — Session cookie domain made env-driven (Completed 2026-08-12T12:28:37.000Z, prep for #46)
- ✅ `sso_session` cookie `Domain=` and post-logout redirect target were hardcoded to
      `.doneisbetter.com` / `https://launchmass.doneisbetter.com` in `lib/auth-oauth.js`
      and `pages/api/oauth/callback.js` — now read `SESSION_COOKIE_DOMAIN`/`APP_BASE_URL`
      env vars, defaulting to the exact prior hardcoded values (no production behavior
      change until deliberately configured)
- ✅ Documented both new env vars in `AUTH_CURRENT.md` and `.env.example`
- ✅ Opened #46 tracking the actual migration this unblocks (new host, DNS, SSO OAuth
      client redirect-URI update, Vercel domain config — all outside this repo)
- ✅ `npm run verify-docs` and `npm run build` both clean

### ✅ v1.22.0 — Bump vendored GDS 4.1.3 → 6.0.0 (Completed 2026-08-12T11:35:34.000Z, closes #44)
- ✅ Checked upstream `CHANGELOG.md`/`DEPRECATIONS_AND_MIGRATIONS.md` between `4.1.3`
      and `6.0.0` -- exactly two breaking changes across both major bumps
      (`ReferenceThemeExplorer` relocated, `class-usa` brand-theme token rename), neither
      referenced anywhere in this repo (grepped, not assumed)
- ✅ Rebuilt `vendor/gds/*.tgz` from git tag `gds-v6.0.0`, repointed `package.json`
- ✅ `npm run verify-docs` and `npm run build` both clean
- ✅ Live-verified `ChoiceChip` tag-pill rendering via a temporary scratch route
      (deleted before commit) -- identical to the `4.1.3` render

### ✅ v1.21.0 — Security: Admin User-Management Authorization Gap (Completed 2026-08-08T11:28:22.000Z)
- ✅ Found via a full documentation/code-comment audit: 4 of 5 `pages/api/admin/users/*`
      endpoints, plus `pages/admin/users.js`'s `getServerSideProps`, checked authentication
      only — any authenticated `user`-role account could grant itself admin, change or
      revoke anyone's access, and read the full user list
- ✅ Added the admin/superadmin role check (matching the sibling `batch-sync-sso.js`
      endpoint's existing correct pattern) to `grant-access.js`, `revoke-access.js`,
      `change-role.js`, `users/index.js`, and `pages/admin/users.js`
- ✅ Extended the check to recognize the canonical `isSuperAdmin` flag
      (`lib/permissions.js`), not just `appRole` -- `scripts/migrate-user-rights.cjs`
      seeds it independently on an org's first user, and an `appRole`-only check would
      have locked a real superadmin out
- ✅ Verified: `npm run build` clean; the exact condition checked against every
      `appRole`/`isSuperAdmin` combination; full live-server verification not possible
      in this sandbox (no outbound MongoDB access) — noted rather than claimed

### ✅ v1.20.0 — GDS 4.1.3 vendoring pilot: ChoiceChip tag pills (Completed 2026-08-08T11:04:19.000Z, closes #39)
- ✅ Verified `@sovereignsquad/gds-core`/`gds-theme` have never been published beyond
      `3.9.0` on npmjs or GitHub Packages (both checked directly); confirmed real newer
      work exists at git tag `gds-v4.1.3` via `git ls-remote`
- ✅ Cloned the tag, built `gds-core`/`gds-theme` from source (`tsup`, clean, real
      `dist/` output), packaged via `npm pack`, committed under `vendor/gds/*.tgz`
- ✅ Repointed `package.json` at `file:vendor/gds/...` (peer deps -- Mantine 8.x, React
      19 -- compatible with what this repo already runs, no forced major bump)
- ✅ Adopted `ChoiceChip` for `components/OversizedLink.jsx`'s card tag pills
      (`onClick` mode) and `pages/index.js`'s active-filter bar (`href` + `active` mode)
- ✅ Added `@sovereignsquad/gds-theme/styles.css` import to `pages/_app.js`
- ✅ `npm run build` and `npm run verify-docs` both clean
- ✅ Visual verification via headless Chromium on a temporary scratch route (deleted
      before commit) -- this sandbox has no MongoDB access, so the real DB-backed pages
      couldn't be exercised end-to-end; confirmed correct `<button>`/`<a>` element
      choice and `active` state rendering
- ✅ Docs: this entry, `ARCHITECTURE.md` section, `README.md` feature entry,
      `LEARNINGS.md` entry, `RELEASE_NOTES.md` entry
- Known tradeoff, explicit: unofficial `file:` dependency, not a real registry install
      -- see `LEARNINGS.md`. A request to publish 4.1.3 properly has already gone to
      whoever maintains the GDS repo; rolling this out to camera/messmass/fanmass is a
      separate, later decision.

### ✅ v1.19.0 — Guided Tour (Completed 2026-08-05T13:01:09.000Z)
- ✅ Installed `@sovereignsquad/gds-core@3.9.0` / `gds-theme@3.9.0` + Mantine 8.3.18 +
      `@tabler/icons-react` (npmjs, matched to camera/messmass/fanmass's versions)
- ✅ Ported `lib/tour/useTourController.js`, `lib/tour/storage.js`,
      `lib/tour/config/tourSteps.js`, `components/tour/TourOverlay.jsx` from
      messmass/fanmass's identical engine (TypeScript → plain JS + JSDoc)
- ✅ Wired `MantineProvider` + `OverlayManagerProvider` app-wide in `pages/_app.js`
- ✅ Wired the tour into `components/Header.jsx`'s hamburger menu: `data-tour-id`
      attributes on each menu item, a "❓ Guided tour" trigger, steps that adapt to
      auth state (Home always; Admin/Organizations/Manage Users once signed in; Login
      when not)
- ✅ Live-verified with a headless-Chromium run against the dev server: menu opens,
      tour starts, spotlight correctly targets Home then Login (unauthenticated path --
      this sandbox has no MongoDB network access, so the authenticated-menu-item path
      wasn't independently exercised live, though it shares the same, already-verified
      rendering code path), Next/Back/Skip/Done all functional, no tour-related console
      errors
- ✅ Docs: this entry, `ARCHITECTURE.md` Guided Tour section, `README.md` feature entry,
      `LEARNINGS.md` GitHub Packages entry, `RELEASE_NOTES.md` entry

### ✅ v1.18.0 — Multi-Track Foundation: Custom Roles, Analytics, Database Optimization (Completed 2025-12-21T21:30:00.000Z)
- ✅ Track A: Custom role foundation with organizationRoles collection
- ✅ Track A: Updated lib/permissions.js with custom role support and caching
- ✅ Track B: Created lib/analytics.js with async event batching
- ✅ Track C: Created database analysis and index optimization scripts
- ✅ Track D: Added permission check performance monitoring
- ✅ Created migration script: scripts/migrate-organization-roles.mjs
- ✅ Created database scripts: scripts/analyze-database.mjs, scripts/create-indexes.mjs
- ✅ Expanded permissions from 8 to 18 granular permissions
- ✅ System roles (admin/user) with backward compatibility
- ✅ Analytics batching reduces DB load by 98%
- ✅ Permission monitoring tracks cache hit rate and slow checks

**Phase 1 Foundation Complete - Ready for Phase 2 API Implementation**

### ✅ v1.17.0 — Legacy Auth Cleanup & Permission System Design (Completed 2025-12-21T19:28:19.000Z)
- ✅ Removed lib/auth.js (legacy cookie-forwarding authentication)
- ✅ Created comprehensive permission system enhancement design (PERMISSIONS_DESIGN.md)
- ✅ Designed custom role system with 5 role templates
- ✅ Specified 18 granular permissions for future implementation
- ✅ Planned Q2 2026 implementation strategy
- ✅ Completed P0 documentation review (all checks passed)

**Note:** Permission system design complete; implementation scheduled for Q2 2026

### ✅ v1.16.0 — Critical Security Fix (Completed 2025-12-21T18:45:01.000Z)
- ✅ Updated Next.js from 15.5.4 to 15.5.9
- ✅ Resolved 3 critical CVEs (RCE, source exposure, DoS)
- ✅ Corrected Vercel's automated PR (used 15.4.10 instead of 15.5.9)

### ✅ v1.14.0 — Version Automation & Documentation Governance (Completed 2025-12-21T14:30:00.000Z)
- ✅ Create scripts/bump-version.sh for automated version updates
- ✅ Create scripts/verify-docs-consistency.js for validation
- ✅ Add pre-commit hook for version consistency enforcement
- ✅ Create .github/workflows/docs-check.yml for CI/CD validation
- ✅ Mark lib/auth.js as DEPRECATED with migration warnings
- ✅ Create DEPRECATED_AUTH.md migration guide
- ✅ Add monthly documentation review process to ROADMAP.md
- ✅ Add npm scripts: bump-version, verify-docs

**Note:** Implemented Q1 2026 automation tasks ahead of schedule (originally planned for Jan-Mar 2026)

### ✅ v1.13.0 — SSO Permission Sync Integration (Completed 2025-12-20T20:15:22.000Z)
- ✅ Create lib/ssoPermissions.mjs for SSO permission synchronization
- ✅ Implement batch sync to SSO with visual feedback in admin UI
- ✅ Add SSO OAuth configuration utility scripts
- ✅ Integrate SSO permission sync into admin endpoints
- ✅ Remove superadmin role - simplify to user/admin only
- ✅ Update user model with appRole, appStatus, hasAccess fields

### ✅ v1.12.x — Organization Backgrounds & Bug Fixes (Completed 2025-11-07)
- ✅ Add background field support to organizations (v1.12.0)
- ✅ Apply organization backgrounds to all public pages (v1.12.2)
- ✅ Fix organization admin redirect using query parameters (v1.12.1)
- ✅ Fix organization selection override bug in admin (v1.12.3)

### ✅ v1.11.x — Navigation Consolidation (Completed 2025-11-07)
- ✅ Create unified Header component with hamburger menu (v1.10.0)
- ✅ Consolidate navigation into auth-aware menu (v1.11.0)
- ✅ Add "Add Card" button to admin header (v1.11.0)
- ✅ Add OAuth guard to settings page (v1.11.2)
- ✅ Fix logout flow - clear local session before SSO (v1.11.0)
- ✅ Fix organization update/delete permissions (v1.11.3)

### ✅ v1.9.x — Critical Stability Fixes (Completed 2025-11-06)
- ✅ Fix database connection for serverless functions (v1.9.2)
- ✅ Fix timestamp handling across all pages (v1.9.2-v1.9.4)
- ✅ Add comprehensive error logging to cards API (v1.9.2)
- ✅ Fix organization membership handling (v1.9.2)

### ✅ v1.7.x — OAuth 2.0 Migration (Completed 2025-10-07)
- ✅ Create lib/auth-oauth.js with OAuth 2.0 support
- ✅ Create /api/oauth/callback for authorization code exchange
- ✅ Update all API routes to use OAuth authentication
- ✅ Create /admin/users page for user management
- ✅ Create lib/permissions.js with permission matrix
- ✅ Add organizationMembers collection
- ✅ Remove redundant NEXT_PUBLIC OAuth variables (v1.7.3)
- ✅ Fix OAuth endpoint URLs (v1.7.1)

### ✅ v1.5.0 — SSO Integration (Completed 2025-10-02)
- ✅ Create lib/users.js and lib/auth.js (cookie-forwarding approach)
- ✅ Create migration script and API proxy
- ✅ Protect API routes with withSsoAuth middleware
- ✅ Admin UI overhaul with SSR guard
- ✅ Remove ADMIN_TOKEN authentication
- ✅ Create comprehensive documentation

### ✅ Earlier Tasks
- ✅ Hashtag system with filtering (v1.3.0)
- ✅ Organization multi-tenancy (v1.3.1)
- ✅ Google Analytics integration (v1.0.1)

## Active Tasks

> **Audit note (updated 2026-07-05):** A repository issue audit re-baselined and remediated the items below.
> - **Schedule:** Phase 2–4 (custom-roles API/UI, analytics API/UI) are **un-started / unscheduled** — verified against code (no `pages/api/analytics/`, no roles API under `pages/api/organizations/[uuid]/roles`, no `pages/settings/roles.js`, no `pages/admin/analytics.js`). The former "Week 2/3/4" framing was relative to the Dec 2025 plan; ignore those dates.
> - **Automation restored:** the docs-check + build CI workflow (`.github/workflows/ci.yml`) and the version-consistency pre-commit hook (`.githooks/pre-commit`, installed via `npm run install-hooks`) are active again.
> - **Testing policy resolved:** automated tests remain prohibited (WARP.md "MVP factory" rule). The `TEST-ALL` ticket is reframed as **manual QA / security review**, not an automated test suite.

### 🏗️ Phase 1: Foundation & Analysis (v1.18.0) - ✅ COMPLETED

**All Phase 1 tasks completed and committed. Ready for Phase 2 implementation.**

#### P0 — Critical: Track C - Database Optimization (✅ COMPLETE)
- **Command**: `node scripts/create-indexes.mjs`
- **Command**: `node scripts/migrate-organization-roles.mjs`
- **Status**: Scripts ready to run in production
- **Note**: Run migrations before deploying Phase 2 features

### 🚀 Phase 2: Core Implementation (v1.19.0) - PLANNED

#### P1 — High: Track A - Custom Roles API
- **Ticket**: TRACK-A-03
- **Title**: Implement role CRUD endpoints
- **Owner**: moldovan
- **Expected Delivery**: Week 2
- **Endpoints**:
  - [ ] GET /api/organizations/{uuid}/roles
  - [ ] POST /api/organizations/{uuid}/roles
  - [ ] PUT /api/organizations/{uuid}/roles/{roleId}
  - [ ] DELETE /api/organizations/{uuid}/roles/{roleId}
  - [ ] GET /api/roles/templates
- **Files to create**: 5 new API route files
- **Status**: 📅 Unscheduled (not started)

#### P1 — High: Track B - Analytics API
- **Ticket**: TRACK-B-02  
- **Title**: Create analytics summary endpoint
- **Owner**: moldovan
- **Expected Delivery**: Week 2
- **Endpoints**:
  - [ ] GET /api/analytics/summary
  - [ ] GET /api/analytics/cards
  - [ ] GET /api/analytics/users
  - [ ] GET /api/analytics/organizations
- **Files to create**: `pages/api/analytics/` directory
- **Status**: 📅 Unscheduled (not started)

### 🎨 Phase 3: UI & Polish (v1.20.0) - PLANNED

#### P1 — High: Track A - Roles Management UI
- **Ticket**: TRACK-A-04
- **Title**: Build /settings/roles page
- **Owner**: moldovan
- **Expected Delivery**: Week 3
- **Components**:
  - [ ] Role list table
  - [ ] Role creation modal
  - [ ] Role edit modal
  - [ ] Permission checklist
  - [ ] Role deletion with validation
- **Files to create**: `pages/settings/roles.js`
- **Status**: 📅 Unscheduled (not started)

#### P1 — High: Track B - Analytics Dashboard UI
- **Ticket**: TRACK-B-03
- **Title**: Build /admin/analytics page
- **Owner**: moldovan  
- **Expected Delivery**: Week 3
- **Components**:
  - [ ] Summary cards (total clicks, users, orgs)
  - [ ] Card interaction chart
  - [ ] Date range selector
  - [ ] Export functionality
- **Files to create**: `pages/admin/analytics.js`
- **Status**: 📅 Unscheduled (not started)

### 📚 Phase 4: Testing & Documentation (v1.21.0) - PLANNED

#### P0 — Critical: Comprehensive Testing
- **Ticket**: TEST-ALL
- **Note**: Per the WARP.md "tests forbidden" rule, this is **manual QA / security review** — not an automated test suite. Verification is done via `npm run build` + preview deploys.
- **Title**: Test all 4 tracks end-to-end
- **Owner**: moldovan
- **Expected Delivery**: Week 4
- **Tasks**:
  - [ ] Test custom roles creation/assignment
  - [ ] Verify backward compatibility (admin/user still work)
  - [ ] Test analytics event capture
  - [ ] Load test permission checks
  - [ ] Security audit for permission escalation
- **Status**: 📅 Week 4

### 📋 Ongoing Maintenance

#### P0 — Critical: Documentation Consistency
- **Title**: Documentation consistency maintenance
- **Owner**: AI Agent
- **Expected Delivery**: Ongoing
- **Details**: Enforced automatically via the pre-commit hook (`.githooks/pre-commit`) and the CI workflow (`.github/workflows/ci.yml`), both running `npm run verify-docs`.
- **Status**: ✅ Automated (restored 2026-07-05)
