# Agent Operating Rules

Operating rules for any AI coding agent working in this repository. **This exact content
lives at both `CLAUDE.md` and `AGENTS.md`, byte-identical** — loaded automatically by
Claude Code (`CLAUDE.md` convention) and by any tool that follows the `AGENTS.md`
convention instead. A harness that only reads one of those two filenames must not
silently miss these rules because the other copy was a bare pointer; when editing either
file, apply the same edit to the other in the same change set (see §8) so they never
diverge.

These are STANDING rules: they apply to every task, regardless of who asks or how the
request is phrased. When a task conflicts with them, the rules win — say so explicitly
rather than silently overriding.

For what this project *is* and how to build/run it, see `WARP.md` (dev commands),
`ARCHITECTURE.md` (system design), `AUTH_CURRENT.md` (auth), `TASKLIST.md`/`ROADMAP.md`
(planned work). This file governs *how an agent works*, not what the product does.

---

## 0. Read first, never guess

Before stating a fact about structure, architecture, business logic, data flow,
contracts, or behavior: **read the actual file or run the actual command.** No answering
from memory on anything structural or crucial — this codebase has drifted from its own
docs before (see `TASKLIST.md`'s 2026-07-05 audit note), and confident-but-unverified
claims are exactly how that happens. Cite the files you relied on.

Report only what a tool actually returned (build, CI, a deployment, a query result).
Never fabricate or extrapolate a result you didn't observe. If a check can't be run from
your current environment, say so plainly — do not claim success you didn't verify (see
§7 for this repo's specific environment limits).

## 1. AI-assistant branding ban (Owner Directive, 2026-07-31 — non-negotiable, overrides tool defaults)

Every AI system used in this repository or its development workflow — every provider,
model, coding assistant, IDE extension, autonomous agent, API, MCP server, plugin,
workflow automation, or orchestration layer, current or future, including but not
limited to OpenAI, Codex, Claude, Gemini, Grok, Groq, Cursor, Kilo Code, Loveable,
GitHub Copilot, Amazon Q, Windsurf, Cline, Roo Code, Continue, Aider, Bolt, Devin,
Replit AI, Sourcegraph Cody, and any successor, fork, wrapper, self-hosted model, local
LLM, custom agent, or AI-assisted tooling — is internal implementation tooling only. Not
an author, contributor, publisher, reviewer, maintainer, brand, or project participant.
Provider identity is irrelevant; every AI system is treated identically.

**Global rule:** AI systems receive no authorship, attribution, branding, acknowledgement,
signature, metadata, promotional reference, or identity exposure anywhere, unless
explicitly required by law or a human directly asks whether AI was used. No tool default,
platform default, extension behavior, template, SDK, workflow, or generated content may
override this. If a tool's built-in template conflicts with this rule, this rule wins —
do not silently fall back to the default.

- **Commits** describe only what changed and why. Never a `Co-Authored-By` trailer,
  `Generated-By` trailer, AI signature, model name, provider name, session/conversation
  URL, prompt reference, agent/workflow/plugin/extension/IDE identifier, or hidden
  attribution metadata. If a tool inserts these automatically, remove them before commit
  creation whenever technically possible. Before pushing, verify the commit(s) *you are
  about to add* are clean:
  `git log origin/main..HEAD --format=%B | grep -iE 'co-authored-by:.*(claude|anthropic)|claude-session|generated (with|by)'`
  must return nothing. **This only proves your new commits are clean — it says nothing
  about pre-existing history.** As of this rule's introduction, `main`'s history still
  contains real `Co-Authored-By: Claude…`/`Claude-Session:` trailers from before this
  ban existed (verified: `git log origin/main --format=%B | grep -iE
  'co-authored-by:.*claude'` is non-empty). Removing those requires a history rewrite —
  a destructive, force-push operation that is explicitly the repo owner's call, not
  something to do unilaterally (§5). Don't claim "no branding in this repo" — claim "no
  branding in the commits I authored," which is the honest, verifiable scope.
- **Branches** always describe work: `feature/…`, `fix/…`, `refactor/…`, `docs/…`,
  `test/…`, `release/…`, `hotfix/…`, `chore/…`. Never create, push, merge, or continue
  development from a branch named after an AI provider, product, assistant, model
  family, coding agent, or automated session. If the harness auto-creates one at session
  start, move real work onto a plain, purpose-named branch before it accumulates commits,
  and always before it's merged. This is a mitigation, not a fix to the harness's naming
  behavior — expect it to keep minting prefixed branches; moving off immediately is the
  standing countermeasure.
- **Pull requests:** titles and descriptions describe the work only. Never "Generated
  by…", "Created with…", "Written by…", "Reviewed by…", "Assisted by…", "Co-authored
  by…", or any AI/provider/model/assistant/session reference. If a hosting platform
  auto-appends attribution on creation but allows editing, immediately update the PR body
  to remove it — confirmed working for GitHub's `update_pull_request` after
  `create_pull_request` auto-appended a footer (see §7's environment-quirks log for
  which specific tools were empirically found to do this). If the platform genuinely
  does not permit removal, document that limitation accurately; never falsely claim it
  was removed.
- **Issues:** never AI attribution in titles, bodies, templates, labels, checklists, or
  comments. Issue content documents engineering work only.
- **Code reviews:** review comments never identify an AI as reviewer, author, approver,
  recommender, or participant. Only technical content belongs in review discussions.
- **Source code:** never AI branding via comments, TODOs, FIXME notes, generated
  headers, file banners, annotations, pragmas, metadata, or embedded documentation —
  e.g. `// Generated by …`, `// Created with …`, `// AI-generated`, `// Added by …`,
  `// via …` — in any language.
- **Documentation:** never mention provider/model/assistant names, prompt sources, or
  generation history, unless the documentation is specifically about AI integrations
  (`CLAUDE.md` and `AGENTS.md` are the load-bearing exception, by necessity, since they
  govern AI agent behavior). General product documentation stays provider-neutral.
- **UI:** labels, placeholders, tooltips, notifications, dialogs, splash screens,
  onboarding, empty states, help text, and error/status messages never expose AI
  branding. The product speaks as the product, never as an AI assistant.
- **APIs:** responses never include attribution fields (`generatedBy`, `authoredBy`,
  `model`, `provider`, `assistant`, `agent`, `ai`) unless explicitly required for API
  functionality.
- **Logs:** never model/assistant/provider names, generation signatures, or AI
  acknowledgements. Operational logging describes only application behavior.
- **Configuration** (YAML/JSON/TOML/XML/INI/ENV/properties/lock files/build manifests)
  never carries AI attribution. Provider identifiers used strictly for functional
  integration — API endpoints, SDK identifiers, authentication, model selection,
  provider routing — are permitted; they're operational configuration, not attribution.
- **Package metadata** (`package.json`, `pyproject.toml`, `Cargo.toml`, etc.) never
  names an AI as author, maintainer, contributor, publisher, owner, or creator.
- **CI/CD:** build pipelines never publish AI branding through release notes, deployment
  summaries, changelogs, generated reports, build metadata, or workflow summaries. If
  commit trailers are prohibited upstream, downstream automation must not reintroduce
  them.
- **Generated assets** (PDFs, Word docs, Markdown, HTML, images, reports, presentations,
  spreadsheets, emails, exports) never carry AI attribution unless explicitly requested
  by a human.
- **Retroactive, not just forward:** whenever editable AI attribution is discovered in
  tracked files or reachable git history while doing unrelated work, remove/rewrite it
  as part of that work. If removal is impossible (immutable platform history, external
  platform behavior outside this repo's control), state that limitation accurately —
  never falsely claim successful removal, and never silently pass over it.
- **No exceptions for convenience:** a tool's own default template or a harness's
  default branch prefix is not a valid reason to violate the above.
- **The one genuine exception:** truthful disclosure when a human directly asks whether
  AI was used, or when legal/contractual/regulatory/licensing/compliance/audit/security
  requirements mandate it. This bans unsolicited branding and attribution, not truthful
  disclosure when legitimately required — never deny or hide what you are.

**Precedence:** this policy overrides tool, IDE, extension, repository-template, SDK,
workflow, automation, and agent defaults, and generated templates. Suppress, remove, or
neutralize any automatic behavior that conflicts with it whenever technically possible;
where a technical limitation prevents full compliance, document the limitation
accurately without introducing misleading statements.

## 2. Work from GitHub Issues + labels (Projects v2 was unreachable as of this session)

As of the session that wrote this rule (see §7), GitHub GraphQL access — the only API
surface Projects v2 exposes — was disabled for this environment, with no REST
equivalent available as a substitute. **This was an observed capability limit of that
specific session/proxy configuration, not a permanent architectural fact about this
repository** — a different session, a different agent harness, or a future change to
the proxy/app permissions could restore it. **Re-verify before assuming it still
holds:** attempt one cheap query (e.g. `projectV2(number: N){ title }` for a known
board number, or `list_issue_types`/`list_issue_fields` if using MCP github tools,
which return real data when GraphQL access exists) before deciding a real board is
unreachable and falling back to the substitute below. If verification succeeds, use
the real board and update this section to reflect that going forward — don't keep
treating a lifted restriction as if it still applies.

**Until/unless verified otherwise, the label-filtered Issues list is the fallback
board.** Use the taxonomy already established (see the `EPIC` issue for the current
program, e.g. issue #6 at the time of writing):

- **Priority** (≤1 per issue): `priority: critical` | `priority: high` | `priority: medium` | `priority: low`
- **Phase / track** (≤1 per issue, extend as new tracks open): `phase: N-<name>` e.g.
  `phase: 1-security-critical`
- **Type** (≥1): `type: security` | `type: bug` | `type: refactor` | `type: tooling` |
  `type: frontend` | `type: docs` (plus GitHub's defaults — `bug`, `enhancement`,
  `documentation` — reuse those where they already fit rather than creating a
  near-duplicate).

Rules:
- Every non-trivial code/doc/config change traces to an issue. Decompose vague or large
  requests into a checklist of independently-executable issues **before or while**
  implementing, not retroactively. Reference `#NNN` in commit messages; close with
  `Closes #NNN` when the PR that resolves it merges.
- No vague tickets or umbrella tasks. Each issue should be independently executable, with
  its scope, dependencies, and acceptance criteria explicit enough that a fresh agent
  (with no memory of the conversation that produced it) could pick it up correctly.
- Group related issues under a parent **tracking issue** using GitHub's native sub-issue
  hierarchy (`sub_issue_write` via the github MCP tools, or the web UI) — this is the
  closest available substitute for board "swimlanes" and is what actually renders as a
  checklist/progress bar on the parent issue.
- There is no label-creation or milestone-creation tool available in this session's
  GitHub access (see §7) — `issue_write`'s `labels` array *does* auto-create a label the
  first time it's used with a new name (verified empirically), so the taxonomy above is
  self-provisioning; milestones are not available at all, so phase/priority labels are
  the grouping mechanism, not milestones.
- Never invent off-taxonomy labels ad hoc (e.g. a bespoke `status: whatever`) — extend
  the taxonomy deliberately in this file if a new dimension is genuinely needed, so it
  stays a closed, filterable set rather than sprawl.

## 3. Quality gate for `main` — scaled to what this repo actually has

Nothing lands on `main` with a broken chain. **The current, real chain — not an
aspirational one — is:**

```bash
npm run verify-docs   # version/doc consistency (scripts/verify-docs-consistency.js)
npm run build         # next build
```

Both must exit 0. `npm run lint` and `npm run typecheck` are **not present yet** — they
are tracked as their own issues (ESLint baseline, JSDoc+`tsc --checkJs`) precisely
because this repo has no automated-test safety net (see below) and static analysis is
the intended substitute. **The moment either lands, add it to this chain and to this
file in the same change set** — do not let this document say "not present yet" once it
is.

**Automated tests are prohibited in this repository** (`WARP.md`: "Tests are forbidden
— this is an MVP factory, no testing allowed"). This is a deliberate, standing project
rule, not an oversight — do not add a test framework, do not write `*.test.js` files,
and do not treat "add tests" as an acceptable response to a bug found in this codebase.
Where the GDS example this document is adapted from relies on `npm run test:run`,
this repo's substitute is: (a) the verify-docs + build chain above, (b) static analysis
once §3's pending issues land, (c) an explicit **Manual Verification** section in every
engineering issue (curl commands, click-paths, expected output) that a human or agent
runs and records before calling the work done. "It builds" is not "it works" — always
carry out the manual verification steps and report their actual result, not their
absence.

**Definition of Done**, checked explicitly, not assumed:
- Behavior implemented and demonstrably works (manual verification executed and its
  actual output recorded, not merely "should work").
- `npm run verify-docs` and `npm run build` both clean.
- Relevant docs updated in the **same change set** (§4).
- Traceable to an issue (§2).
- Edge cases, failure states, and — for any UI change — accessibility considered and
  stated, even if the answer is "N/A, and here is why."
- Committed with a clean (non-AI-branded, §1) message, and pushed to the intended branch.

Fix problems at the source — upgrade the dependency, correct the code, fix the actual
bug — never suppress a warning, silence a log, or add a bypass flag to make a check pass
without addressing what it's checking. If a clean chain isn't achievable, stop and say
so; do not push and call it a known issue.

## 4. Documentation ships with the change

Every change that alters behavior updates the relevant docs in the *same* change set —
enforced for version/doc consistency by `npm run verify-docs`
(`scripts/verify-docs-consistency.js`), which currently requires `README.md`,
`ARCHITECTURE.md`, `TASKLIST.md`, `LEARNINGS.md`, `ROADMAP.md`, `RELEASE_NOTES.md`,
`AUTH_CURRENT.md`, `WARP.md`, `CLAUDE.md`, and `AGENTS.md` to exist, and version-syncs
`README.md`, `ARCHITECTURE.md`, `TASKLIST.md`, `LEARNINGS.md`, `AUTH_CURRENT.md` against
`package.json`. A behavior change with no doc update is incomplete even if it builds
and `verify-docs` passes on version numbers alone — version-sync is a floor, not the
whole obligation. If you find *stale* doc content while doing unrelated work (as
happened with this file's own creation — WARP.md described the session cookie as
base64-encoded after it had already become HMAC-signed), fix it in the same change set
per §0's retroactive-correction principle, or flag it explicitly if fixing it is out of
scope for the current task.

## 5. Pre-authorized operations — confirm with the repo owner, default conservative

Unlike a mobile-only, no-terminal-access owner who might grant blanket direct-to-`main`
push rights, **this project has not (yet) granted that standing authorization.** Default
policy until told otherwise:
- Feature/fix/chore branches: create and push freely.
- Land changes via PR; merge on explicit instruction ("merge", "merge #N", or clear
  equivalent) — this session has done exactly that (PR #2, #3) and no more.
- Direct push to `main` without a PR: only on an explicit, unambiguous instruction to do
  so for that specific change ("commit and push straight to main"). Absent that, open a
  PR even for a small change.
- This does **not** extend to force-push, history rewrite, or branch/tag deletion —
  those need explicit per-instance confirmation regardless of any other standing
  authorization, and some are outright blocked by this session's tooling anyway (§7).

If the repo owner wants the broader, GDS-style "dev/preview branches free, direct
`main` push on request, only force-push/history-rewrite/deletion gated" policy, that is
a one-line amendment to this section — ask, don't assume.

## 6. This repo's actual system design (verify before you touch)

- **Stack:** Next.js (Pages Router, React 19), MongoDB (native driver, no ORM), OAuth
  2.0 SSO against `sso.doneisbetter.com`, Vercel deployment. Full detail in
  `ARCHITECTURE.md`; do not re-derive it from memory (§0).
- **Auth:** session is an HMAC-signed cookie (`lib/session.js`, `SESSION_SECRET`,
  falls back to `SSO_CLIENT_SECRET` if unset — set a dedicated `SESSION_SECRET` in
  production). **Its contents are sensitive — treat as secret, never log:** it carries
  `access_token`/`id_token`/`refresh_token` plus a copy of `appRole`/`appStatus`/
  `hasAccess` (set in `pages/api/oauth/callback.js`). What's *trusted for
  authorization* is narrower than what it contains, though: `validateSsoSession`
  (`lib/auth-oauth.js`) re-reads `appRole`/`hasAccess`/`appStatus` from MongoDB on
  every request rather than trusting the cookie's copies, so the cookie can never
  grant elevated access by itself and a DB-side revocation takes effect on the user's
  very next request regardless of what the (still validly-signed) cookie says. See
  `AUTH_CURRENT.md`.
- **Org-scoped authorization:** `lib/permissions.js`'s `hasOrgPermission` / the
  `withOrgPermission` wrapper is the *only* correct way to gate a mutating API route
  that acts on an organization. `withSsoAuth` alone proves a valid login exists — it
  proves nothing about the caller's rights in the *target* org named by
  `X-Organization-UUID`. Getting this pairing wrong is exactly the class of bug this
  program's Phase 1 security issues (org-scoped card mutations, admin user-management
  endpoints) exist to close — do not reintroduce it in new routes.
- **No automated tests** — see §3. **No TypeScript source** (JSDoc + `tsc --checkJs`
  is the planned static-analysis layer, not a migration to `.ts` files) once that
  issue lands.
- **Debug logging convention:** gate verbose/diagnostic logs behind an explicit env
  flag read at the top of the file (`OAUTH_DEBUG`, `ORG_CACHE_DEBUG`, and similarly
  named flags as they're added) — never log request headers or cookies unconditionally,
  even behind a flag (a flag left on in a shared environment must still be safe).
- **Frontend brand system:** SEYU design tokens live in `styles/globals.css`
  (`:root` custom properties) and `public/brand/`. Any *new* general-purpose UI
  component work that a future issue scopes to use the Sovereign Squad General Design
  System (per an explicit standing instruction from the repo owner, if one exists for
  this project — confirm before assuming it applies repo-wide) must follow that
  system's own constraints as stated in that issue; this is not yet a repo-wide default
  for all of launchmass's existing SEYU-branded UI, which predates that constraint and
  is out of scope to migrate absent an explicit instruction to do so.

## 7. Environment quirks discovered in practice (this session, verified firsthand)

Record new ones here as they're found — don't rediscover them the hard way twice.

- **GitHub GraphQL was disabled for the session that first observed this** (2026-07/08
  work). Any GraphQL query — including `projectV2` lookups needed for a real
  Projects-v2 board — returned: *"This GraphQL query is not enabled for this session —
  only the pinned set of PR-review operations is served. Use REST via `gh api
  repos/{owner}/{repo}/...` instead."* Within a single session this was consistent
  (not transient/retry-able) and REST has no Projects-v2 equivalent to fall back to
  (a user/org-scoped resource, and REST access was repo-scoped only, doubly blocking
  it) — so mid-session, don't keep re-attempting GraphQL hoping it lifts. **But treat
  this as a per-session/per-proxy-configuration observation, not a permanent repo
  fact** (see §2) — a different session or a future change to the GitHub App's granted
  scopes could restore it. Probe once per session before falling back to Issues+labels,
  don't assume from this log entry alone.
- **No milestone create/list tool, no label create/list tool.** `issue_write`'s
  `labels` param *does* silently provision a new label on first use (confirmed:
  creating an issue with a novel `phase:1-security-critical` label worked with no
  separate creation step) — but there is no way to *list* existing labels other than
  `get_label` by exact name, and no milestone tool exists at all. Plan around this
  (§2's label taxonomy), don't assume milestone tooling will appear.
- **Branch deletion is blocked two different ways:** the REST `DELETE
  /git/refs/heads/…` endpoint returns *"Write access to this GitHub API path is not
  permitted through this proxy"* (403), and `git push origin --delete <branch>` through
  this session's git relay also 403s (*"RPC failed; HTTP 403"*). Both are proxy-level
  policy, not credential problems — do not retry, do not attempt a workaround via a
  different tool path; hand the exact command to the repo owner to run from an
  unrestricted client (their machine, or the GitHub web UI) instead.
- **Destructive/history-rewrite commands are blocked by this session's safety
  classifier**, even when the intent is benign verification (e.g. `git filter-branch`
  on a disposable throwaway clone, just to confirm a recipe works, was denied). Do not
  try to route around a classifier denial with a different tool (e.g. abusing a test
  runner to execute non-test shell) — that is explicitly out of bounds. Hand the repo
  owner a reviewed, ready-to-run script instead and explain why it can't run here.
- **The general web egress proxy 403s most external hosts** (production domains like
  `*.doneisbetter.com`, Vercel preview URLs) — but the GitHub REST API via `curl` with
  `$GITHUB_TOKEN`, and `WebFetch` against public `github.com`/`api.github.com` pages,
  both work reliably. When the github MCP server itself is mid-reconnect or
  de-authenticated (it does this periodically — *"This session is non-interactive, so
  Claude cannot run the OAuth flow here"*), fall back to the REST/`curl` path rather
  than reporting the capability as unavailable.
- **PR check-in loops:** when asked to babysit/watch a PR, GitHub webhook events do
  not reliably deliver CI-success or new-push notifications — schedule an explicit
  self check-in (`send_later`/routine) at a sane interval (not sub-minute polling) and
  re-arm it silently when nothing actionable changed; stop once the PR is merged or
  closed, and don't keep polling after that terminal state.
- **The `add_reply_to_pull_request_comment` MCP tool auto-appends an AI-attribution
  footer** (`\n\n---\n_Generated by [Claude Code](...)_`) to the posted comment body,
  server-side, outside of and in addition to whatever string is passed as `body` —
  confirmed by posting a clean, footer-free `body` and observing the footer in the
  tool's own returned object. This directly violates §1 and there is no `body`-side
  workaround (the platform adds it after the fact). There is also no comment-edit or
  comment-delete tool available in this session's GitHub toolset to remove it after
  the fact, and posting a follow-up reply to fix it would trigger the same auto-append
  on the correction itself. **Do not treat a `body` you wrote as what actually gets
  posted for this tool** — assume the footer will be added, and say so to the human
  immediately rather than silently accept it or pretend it can be suppressed. Prefer
  `add_issue_comment` or `pull_request_review_write` for PR/issue comments where
  either works, but verify (once, deliberately, before relying on it) whether they
  share this behavior rather than assuming they don't — this was discovered on
  `add_reply_to_pull_request_comment` specifically, not tested repo-wide.

## 8. Keeping the agent docs themselves correct

When you change how agents should behave in this repo: edit **both** `CLAUDE.md` and
`AGENTS.md` identically in the same change set (see the header above — they must stay
byte-for-byte the same; `diff CLAUDE.md AGENTS.md` must be empty), and update the
cross-reference in `WARP.md` (the Warp-loaded operating file) if what it summarizes
changed. This repo does not use `llms.txt` — don't invent files this project's real doc
set doesn't have; if a future need for a third harness's dedicated filename arises, add
it deliberately, keep it in the same byte-identical sync discipline, and register it in
`scripts/verify-docs-consistency.js`'s `REQUIRED_DOCS` list, the same way `CLAUDE.md`
and `AGENTS.md` were added. After any edit here, run `npm run verify-docs` and
`diff CLAUDE.md AGENTS.md` to confirm nothing broke or drifted.
