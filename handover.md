# Handover — launchmass

**Written:** 2026-08-12T11:26:49.000Z (session end)
**Repo state at handover:** `main` @ `7890949`, `package.json` version `1.21.0`
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

---

## 1. What this session actually did

Starting point: the user asked for a "deep full bit by bit" audit of every `.md` file,
every source-code comment, and version consistency across the repo — including the
guided-tour feature and a check for language/locale files (none exist).

That audit surfaced findings ranked by severity, and the user then asked for all of them
to be implemented. Two PRs came out of it, both now merged to `main`:

- **PR #38** — `fix/admin-users-authz-gap` — the critical finding: four of five
  `pages/api/admin/users/**` endpoints (plus `pages/admin/users.js`'s
  `getServerSideProps`) checked authentication only, not authorization. Any signed-in
  user with the ordinary `user` role could grant themselves admin, change or revoke
  anyone's access, and read every user's PII. Fixed by requiring
  `appRole === 'admin' || appRole === 'superadmin'` (or the canonical `isSuperAdmin`
  flag — see §3 below) at all five call sites, matching the pattern already used
  correctly by the sibling `pages/api/admin/batch-sync-sso.js`.
- **PR #41** — `docs/audit-fixes` — six documentation findings: a self-contradicting
  version/date footer in `AUTH_CURRENT.md`, a stale "Base64-encoded JSON" cookie
  description in the same file (the cookie has been HMAC-signed since `lib/session.js`
  was introduced — this exact class of staleness recurring in a *different* file than
  the one `CLAUDE.md` §4 already cites as the original example is worth noting), two
  files (`ROADMAP.md`, `PERMISSIONS_DESIGN.md`) that had drifted to a stale version
  string invisibly because neither was in `verify-docs-consistency.js`'s checked list
  (now fixed structurally, not just patched), two stale inline version links in
  `README.md`'s own doc index, one real env var (`AUTO_GRANT_ACCESS`) missing from the
  canonical reference table, and two malformed/out-of-order `RELEASE_NOTES.md` entries.

Both PRs went through several rounds of Codex automated review. **Some of that feedback
was real and got fixed** (a too-narrow branding-check grep, a live banned-instruction
line in an archived doc, a missing file in the version-bump script's update list, stale
prose in `CLAUDE.md`/`AGENTS.md` describing an older version of a check). **Some of it
was fabricated** — a claimed commit author/footer that didn't match `git log` at all,
and a cited commit hash (`a50ba3b`) that doesn't exist anywhere in this repository.
**Verify every automated review claim against the actual commit/file before acting on
it** — this session did, and roughly a third of the review comments received didn't
survive that check.

Full detail on every finding, with exact file:line citations, is preserved in the audit
report artifact from that turn (not in this repo — it was published as a Claude
artifact, not committed).

## 2. The most important thing in this file

**Issue #9** (`SEC: Enforce superadmin authorization on admin user-management endpoints
(privilege escalation)`) was filed 2026-07-31, *before* this session's audit, under an
earlier EPIC (#6, "Security, correctness & maintainability remediation program"). It
describes the **exact same vulnerability** PR #38 fixed. This session's "discovery" of
it via the documentation audit was a **rediscovery**, not a novel finding — it had been
sitting open, unfixed, for over a week.

PR #38 closes the actual security hole, but it does **not** fully satisfy issue #9's own
acceptance criteria:
- Issue #9 calls for extracting a **shared `requireAdminRole` guard** (in
  `lib/auth-oauth.js` or `lib/permissions.js`) and refactoring all five call sites *plus*
  `batch-sync-sso.js` to use it — one implementation, not six inline copies. **PR #38
  applied six independent inline copies of the same check instead.** This still works
  correctly today, but it's the kind of duplication that drifts the next time someone
  touches one copy and not the others.
- Issue #9 calls for an `ARCHITECTURE.md` update documenting that these routes require
  admin/superadmin. **Not done.**

I left issue #9 **open** with a comment explaining exactly this gap (see
[#9](https://github.com/moldovancsaba/launchmass/issues/9#issuecomment-5266082886)).
**Whoever picks this up next should either do that refactor + doc update and close #9
properly, or make a deliberate call that inline duplication is acceptable here and close
it anyway with that reasoning recorded.** Don't just close it silently.

**Trust-but-verify note:** an earlier summary carried into this session claimed "EPIC #6
with 16 remediation issues (all merged)." Issue #9 — a phase:1-security-critical item
from that exact EPIC — was still open and unfixed. **Do not trust a prior session's
claim about issue/PR state without checking `issue_read`/`list_issues` yourself.** This
file makes the same kind of claim below (about which issues are open); verify it before
relying on it, especially if much time has passed.

## 3. Other currently-open, relevant issues

Checked via `list_issues` at handover time — 20 open issues total. The ones directly
relevant to what this session touched:

- **#9** — see §2 above. `priority:critical`, `type:security`, `phase:1-security-critical`.
- **#36** — `DOCS: Neutralize the banned Co-Authored-By recommendation in the archived
  remediation summary`. Filed by this session (from a closed duplicate PR, #33) against
  `docs/archive/DOCUMENTATION_REMEDIATION_SUMMARY.md:321`, which still contains a live,
  copyable `Co-Authored-By: Warp <agent@warp.dev>` instruction that directly contradicts
  `CLAUDE.md` §1's branding ban. **Confirmed still present on `main` at handover time.**
  `priority:low`.
- **#37** — `DOCS: Broaden the AI-attribution verification grep beyond
  Claude/Anthropic-specific matches`. Also filed by this session. The pre-push grep
  documented in `CLAUDE.md`/`AGENTS.md` §1 still only matches Claude/Anthropic-named
  `Co-Authored-By` trailers and space-separated "generated by/with" — misses
  `Generated-By:` (hyphenated), other-provider trailers, and `*-Session:` trailers.
  **Confirmed still present on `main` at handover time.** A working replacement regex is
  in the issue body, already verified against test cases. `priority:medium`.

Neither #36 nor #37 is security-critical, but both are small, well-scoped, and ready to
pick up as-is — the fix is already written out in each issue body.

**The rest of EPIC #6's backlog** (#7, #8, #10 through #22 — hardcoded MongoDB
credentials in tracked scripts, cross-tenant card read/write authorization gaps, a
session-cookie exposure in request logging, an SSO field-name mismatch, orphaned
analytics wiring, plus several `phase:3/4/5` maintainability/UX/tooling items) **was not
touched, reviewed, or verified this session.** Their open/closed state as of the last
`list_issues` call is accurate as of handover time, but their *content* wasn't
re-audited — don't assume they're still correctly scoped without rereading them.

## 4. Operational gotchas discovered this session

These cost real time and aren't written down anywhere else. Read this section before
repeating the same discovery process.

### `main` moves out from under you — a lot
`main` advanced **four times** during this session from what appeared to be other,
independent agent sessions working this same repo concurrently: a guided-tour feature,
an AI-attribution-policy expansion, a GDS `ChoiceChip` component swap, and a `CLAUDE.md`
quirk note. Two of those were near-duplicates of work this session was independently
doing at the same time (see §5), costing a full PR each. **If you're picking up fresh
work here, fetch `origin/main` and diff against what you expect before assuming the
branch state — don't trust that `main` looks like it did even a few messages ago in your
own context.** This pattern didn't slow down over the session; if anything it
accelerated. It's worth someone checking whether multiple sessions are pointed at this
repo without visibility into each other, rather than treating each collision as a
one-off.

### `package-lock.json` version drift is a recurring bug class, not a one-off
This session found and fixed the *same* bug — `package-lock.json`'s top-level
`"version"` field stuck at a stale value while `package.json` had already advanced —
**three separate times**, including once on `main` itself (introduced by the GDS PR,
independent of anything this session did). `npm install` re-syncs it automatically when
run after a version bump; the failure mode is a version bump script or manual edit that
touches `package.json` but not `package-lock.json`. If `verify-docs` or a build ever
looks inconsistent on version, check this file specifically.

### `create_pull_request` silently appends an AI-attribution footer
Confirmed independently (twice — once by this session, once by another parallel session
whose fix landed on `main` as PR #43): the `create_pull_request` MCP tool appends a
`\n\n---\n_Generated by [Claude Code](...)_` footer to the PR body server-side,
regardless of what's passed as `body`. `update_pull_request` called immediately after
with the same clean body **does not** re-trigger the append — it's a working fix, not
just a mitigation. Already documented in `CLAUDE.md`/`AGENTS.md` §7 — this note is here
because it's exactly the kind of thing worth re-verifying rather than re-discovering.

### Codex PR review is a mix of real findings and fabrications
Across both PRs this session, review comments included genuine, high-value findings
(caught real bugs — see §1) alongside comments that referenced commit hashes that don't
exist and commit metadata that doesn't match `git log` at all. Treat every specific,
checkable claim (a commit SHA, an author, a line of file content) as exactly that —
checkable — and check it before acting, rather than trusting the review's framing.

### Version-bump tooling needs to stay in lockstep with the checker it serves
`scripts/bump-version.sh`'s `DOC_FILES` list and `scripts/verify-docs-consistency.js`'s
`VERSION_REQUIRED_DOCS`/`REQUIRED_DOCS` lists must be edited together. This session added
`ROADMAP.md` and `PERMISSIONS_DESIGN.md` to the checker without initially updating the
bumper — caught only because a review comment flagged it, which would otherwise have
broken `npm run verify-docs` on the very next version bump. If you add a new
version-tracked doc, grep both files, not just one.

## 5. What NOT to redo

If you're an agent picking up a task on this repo and considering an onboarding tour,
an AI-attribution policy change, or a design-system/component-library swap: **check
`git log --oneline -30` on `main` first.** All three of those were independently
attempted by parallel sessions during this one session's lifetime, and two of them
collided directly with this session's own independent attempts at the same thing,
wasting a full implementation-and-PR cycle each time. The versions that landed on `main`
are the ones that won the race, not necessarily the only or best attempt — but they're
what's there now, and re-doing them from scratch is very likely wasted effort.

## 6. Quick orientation for a fresh session

- **Stack:** Next.js (Pages Router, React 19), MongoDB native driver, OAuth 2.0 SSO
  against `sso.doneisbetter.com`, Vercel deployment. Full detail: `ARCHITECTURE.md`.
- **No automated tests, ever** — `WARP.md`: "this is an MVP factory, no testing
  allowed." Manual verification (curl commands, click-paths) is the substitute, recorded
  in each issue/PR.
- **No real GitHub Projects board** — GraphQL access is (was, as of last check) disabled
  for this session's environment; the label-filtered Issues list is the fallback board.
  Re-verify this is still true before assuming it (`CLAUDE.md` §2/§7 — this has already
  flip-flopped in documentation once).
- **AI-attribution ban is absolute and repo-wide** — `CLAUDE.md`/`AGENTS.md` §1, an
  explicit owner directive. No exceptions for tool defaults. This file itself complies:
  no session links, no model name beyond the neutral "an AI coding assistant" framing
  required to explain what wrote it.
- **Landing changes:** feature/fix/chore branches, freely. PRs required for anything
  beyond a small change with explicit "push to main" instruction. Merge only on
  explicit instruction — never assume "looks done" means "merge it."
- **Current version:** `1.21.0` as of this handover. Check `package.json` directly
  before trusting that number if time has passed.
