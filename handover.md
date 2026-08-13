# Handover — launchmass

**Written:** 2026-08-13T00:00:00.000Z (updated, second pass — see §0)
**Repo state at this update:** `main` @ `2e94bd2`, `package.json` version `1.23.14`
**Author of this doc:** an AI coding assistant session (see `CLAUDE.md` §1 — no further
attribution than that is permitted anywhere in this repo)

This is a session-continuity document, not a replacement for the repo's real
documentation. It exists to tell whoever (human or agent) picks this up next: what just
happened, what's actually still open, and what to watch out for that isn't obvious from
the code or the other docs alone. For what the product *is* and how it's built, see
`README.md`, `ARCHITECTURE.md`, `WARP.md`. For agent operating rules, see `CLAUDE.md` /
`AGENTS.md` (byte-identical, read either). This file is **not** part of that governance
set and is not version-synced by `verify-docs-consistency.js` — update it by hand when
it goes stale, or delete it once its contents are fully absorbed elsewhere.

## 0. This file was already stale once — read this first

The first version of this file (written earlier the same day, `main` @ `7890949`,
v1.21.0) said issue #9 was open with a gap, and that #36/#37 were open with ready fixes.
**All three were closed within hours** by a different, far more active parallel agent
session that this session had no visibility into. That session merged roughly 25 PRs
(#42 through #65+) and closed essentially the entire EPIC #6 backlog — #7 through #22 —
taking the version from 1.21.0 to 1.23.14. This is the single biggest lesson in this
file: **do not trust this document's claims about open work without re-running
`list_issues` yourself first.** Treat everything below as "true as of this timestamp,"
not "true."

## 1. What THIS session actually did (as opposed to the parallel session above)

Starting point: the user asked for a "deep full bit by bit" audit of every `.md` file,
every source-code comment, and version consistency across the repo. That audit surfaced
findings ranked by severity; the user asked for all of them to be implemented.

- **PR #38** — the critical finding: four of five `pages/api/admin/users/**` endpoints
  (plus `pages/admin/users.js`'s `getServerSideProps`) checked authentication only, not
  authorization — any signed-in ordinary `user` could grant themselves admin, change or
  revoke anyone's access, and read every user's PII. Fixed with inline
  `appRole === 'admin' || appRole === 'superadmin' || isSuperAdmin(req.user)` guards at
  all five call sites. **Merged.**
- **PR #41** — six documentation findings (stale cookie-format description in
  `AUTH_CURRENT.md`, self-contradicting version footer, two undocumented docs in
  `verify-docs-consistency.js`'s checked list, stale README doc-index links, a missing
  env var, malformed `RELEASE_NOTES.md` entries). **Merged.**

This session also filed issues #36 and #37 (from a closed duplicate PR, #33) for two
gaps in the AI-attribution tooling that PR #33's original author had already found but
this session's kept PR didn't cover. **Both since closed** — see §2.

Both PRs went through Codex automated review. Some feedback was real (fixed); some was
fabricated (a claimed commit author/footer that didn't match `git log`, a cited commit
hash that doesn't exist in the repo). **Verify every specific, checkable review claim
against the actual commit/file before acting on it** — roughly a third of the comments
received this session didn't survive that check.

Full detail on every original audit finding, with exact file:line citations, is in the
audit-report Claude artifact from that turn (not committed to this repo).

## 2. Everything this file previously flagged as open is now closed

- **Issue #9** (privilege-escalation on admin user-management endpoints, the same bug
  PR #38 fixed) — this session's PR #38 satisfied the security fix but *not* issue #9's
  own acceptance criteria (a shared `requireAdminRole` guard + an `ARCHITECTURE.md`
  update). A **different parallel session's PR #50** ("Consolidate admin-role
  authorization into a shared guard") did that missing work properly: `requireAdminRole`
  now lives in `lib/auth-oauth.js`, all six call sites use it (see
  `pages/api/admin/users/[ssoUserId]/grant-access.js` and siblings — confirmed by
  reading them directly this session), and `ARCHITECTURE.md` documents it at lines
  443-444. **Issue #9 closed, `state_reason: completed`, verified via `issue_read`.**
- **Issue #36** (banned `Co-Authored-By: Warp` line in the archived remediation
  summary) — closed via parallel-session **PR #64**.
- **Issue #37** (AI-attribution grep too narrow) — closed via parallel-session **PR
  #65**. `CLAUDE.md`/`AGENTS.md` §1's grep is now the broadened version:
  `co-authored-by:|generated[- ](by|with)|[a-z]+-session:|assisted by|written by (an
  )?(ai|llm)|reviewed by (an )?(ai|llm)`.
- **The rest of EPIC #6's backlog** (#7, #8, #10–#22 — hardcoded MongoDB credentials,
  cross-tenant card authorization gaps, session-cookie exposure in logging, an SSO
  field-name mismatch, orphaned analytics wiring, an ESLint baseline + CI integration
  (PR #56, which also added a lint step to the pre-commit hook — new behavior, see §3),
  a README rewrite (PR #62) covering Organizations/Roles/Cards/`isAppAdmin()`, and
  several `phase:3/4/5` items) — **all closed.** Not independently re-verified line by
  line this session beyond the items above; `list_issues` confirms the closed state.

**Only 3 issues remain open, confirmed via `list_issues` at this update:**
- **#5** — "Test" (no further detail read; check the issue body before assuming scope).
- **#6** — the EPIC tracker itself (stays open as a container; its children are done).
- **#46** — "Migrate launchmass off doneisbetter.com onto a messmass.com subdomain
  (Phase 4: shared session)" — labeled `ideabank`, i.e. deliberately not scoped for
  near-term work, not an oversight.

## 3. Operational gotchas discovered this session (still valid, re-add to any future doc)

### `main` moves out from under you — a lot, and it can be *massive*
`main` advanced at least 5-6 times from independent parallel agent sessions during this
session's lifetime — not just small collisions (a duplicate tour feature, a duplicate
AI-attribution PR, a GDS component swap needing a rebase) but, by the end, a **48-commit,
2-minor-version wave** (1.21.0 → 1.23.14) that resolved nearly the entire EPIC #6
backlog without this session's involvement or awareness until a `git pull` revealed it.
**Always `git fetch origin main` and read the actual diff/log before assuming you know
`main`'s state — even if you checked it minutes ago in the same conversation.** It is
worth someone checking whether multiple agent sessions are pointed at this repo without
visibility into each other; this is not a one-off, it recurs every time this repo is
checked.

### `package-lock.json` version drift is a recurring bug class — 4th+ occurrence
Found and fixed **again** at this update: `package.json` was `1.23.14`,
`package-lock.json`'s top-level `"version"` field was still `1.23.13`. Same root cause
as every prior occurrence this session (a version bump — bot or human — that touches
`package.json` without a subsequent `npm install` to regenerate the lockfile). Fixed via
`npm install` + commit (`2e94bd2`) + push. **If `verify-docs` or a build ever looks
inconsistent on version, check this file specifically before anything else.**

### New: pre-commit hook now runs ESLint (`next lint`), not just `verify-docs`
Parallel-session **PR #56** ("Introduce ESLint baseline configuration and CI
integration") added a lint step to whatever runs pre-commit, on top of the previously
sole `verify-docs` check. This session hadn't seen this before and the commit that hit
it (`2e94bd2`) passed cleanly, but budget more time for commits now — two checks run,
not one. If a commit fails and it isn't obviously a `verify-docs` issue, run
`npm run lint` directly to see the real output before assuming the check itself is
broken.

### `create_pull_request` silently appends an AI-attribution footer
Confirmed independently multiple times (by this session and by a parallel session whose
note landed as PR #43): `create_pull_request` appends
`\n\n---\n_Generated by [Claude Code](...)_` to the PR body server-side regardless of
the `body` passed in. `update_pull_request` immediately after, with the same clean body,
works and does not re-trigger the append. Documented in `CLAUDE.md`/`AGENTS.md` §7.

### Codex PR review mixes real findings with fabrications
Treat every specific, checkable claim (a commit SHA, an author, a quoted line of file
content) as exactly that — checkable — and check it (`git log`, `git cat-file -t`, a
direct file read) before acting. This session caught two fabricated claims this way; a
real finding from the same tool (recognize the canonical `isSuperAdmin` flag, not just
`appRole`) was correctly acted on in PR #38.

### Version-bump tooling must stay in lockstep with the checker it serves
`scripts/bump-version.sh`'s `DOC_FILES` list and `scripts/verify-docs-consistency.js`'s
`VERSION_REQUIRED_DOCS`/`REQUIRED_DOCS` lists must be edited together — this session
added two docs to the checker without updating the bumper, caught only by review. Grep
both files if you add a new version-tracked doc.

## 4. What NOT to redo

Before starting an onboarding tour, an AI-attribution policy change, a design-system
component swap, an admin-authorization refactor, an ESLint/CI setup, or a README
rewrite: **run `git log --oneline -60` on `main` first.** All of the above were already
done by one session or another during this repo's recent history, several as direct
collisions with independent attempts at the same thing. What's on `main` now is what won
the race, not necessarily the first or only attempt — redoing it from scratch is very
likely wasted effort. Read `CHANGELOG`-equivalent evidence (`RELEASE_NOTES.md`, recent
merged PRs) before assuming a gap actually exists.

## 5. Quick orientation for a fresh session

- **Stack:** Next.js (Pages Router, React 19), MongoDB native driver, OAuth 2.0 SSO
  against `sso.doneisbetter.com`, Vercel deployment. Full detail: `ARCHITECTURE.md`.
- **Admin authorization:** use the shared `requireAdminRole(handler, message?)` guard
  from `lib/auth-oauth.js` — don't write a new inline `appRole` check; that's the
  duplication issue #9 explicitly closed out.
- **No automated tests, ever** — `WARP.md`: "this is an MVP factory, no testing
  allowed." Manual verification (curl commands, click-paths) is the substitute, recorded
  in each issue/PR. ESLint (PR #56) is static analysis, not a test suite — it doesn't
  change this rule.
- **No real GitHub Projects board** — GraphQL access was disabled for this session's
  environment as of last check. Re-verify before assuming (`CLAUDE.md` §2/§7 — this has
  flip-flopped once already).
- **AI-attribution ban is absolute and repo-wide** — `CLAUDE.md`/`AGENTS.md` §1. This
  file complies: no session links, no model name beyond the neutral "an AI coding
  assistant" framing required to explain what wrote it.
- **Landing changes:** feature/fix/chore branches freely; PRs for anything beyond a
  small change; direct-to-`main` only on explicit instruction. Merge only on explicit
  instruction.
- **Current version:** `1.23.14` as of this update. Check `package.json` and
  `package-lock.json` directly (and that they *agree*) before trusting this number —
  see §3's recurring drift note.
