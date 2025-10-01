# launchmass

![Version](https://img.shields.io/badge/version-1.4.0-blue)

Mobile-first grid of oversized buttons with a simple JSON-driven admin page. Features Google Analytics tracking for user engagement monitoring.

Note: The global bottom info bar is automatically suppressed on admin routes (/admin) to keep the admin UI uncluttered.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Documentation

### Organizations
- Organization context is required for admin writes and recommended for reads.
- Headers:
  - X-Organization-UUID (preferred)
  - X-Organization-Slug (fallback)
- Public route: `/organization/[slug]` with optional `?tag=` filtering.
- Admin usage:
  1) Paste your ADMIN_TOKEN on /admin and click “Save token”
  2) Click “Refresh orgs” and select an organization from the dropdown
  3) All admin actions (Add, Edit, Delete, Reorder) now apply to the selected org
- Optional path-based admin per organization: `/organization/[id]/admin` — pre-scoped admin UI for the org
- Organizations management UI: `/organizations` — create, edit (name/slug/description), and soft-delete organizations (requires ADMIN_TOKEN)

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and component overview
- [TASKLIST.md](TASKLIST.md) - Active development tasks and priorities
- [ROADMAP.md](ROADMAP.md) - Future development plans and milestones
- [RELEASE_NOTES.md](RELEASE_NOTES.md) - Version history and changelog
- [LEARNINGS.md](LEARNINGS.md) - Development insights and lessons learned
- [WARP.md](WARP.md) - AI development guidance and project rules
- [WARP.DEV_AI_CONVERSATION.md](WARP.DEV_AI_CONVERSATION.md) - Timestamped planning log
