# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**launchmass** is a Next.js application that displays a mobile-first grid of oversized buttons/cards with a JSON-driven admin interface. Each card links to external resources and can be customized with gradients/colors. The application uses MongoDB for data persistence and includes drag-and-drop sorting capabilities in the admin panel.

## Essential Development Commands

### Core Development Workflow
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

### Data Management
```bash
# Seed database with default cards (requires ADMIN_TOKEN and BASE_URL env vars)
node scripts/seed-cards.cjs

# Environment variables required for seeding:
# ADMIN_TOKEN - Authentication token for admin operations
# BASE_URL - Base URL for API calls (default: http://localhost:3000)
```

### Deployment
```bash
# Deploy to Vercel production
vercel --prod
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js (React 19), ES Modules
- **Database**: MongoDB with connection pooling
- **UI Components**: Material-UI (@mui/material), @emotion
- **Drag & Drop**: @dnd-kit for admin card reordering
- **Deployment**: Vercel (assumed from build patterns)

### Project Structure
```
pages/
├── _app.js           # App wrapper with global background/info bar
├── index.js          # Main page displaying card grid
├── admin/
│   └── index.js      # Admin interface for card management
└── api/
    ├── cards/
    │   ├── index.js       # GET all cards, POST new card
    │   ├── [id].js        # PATCH/DELETE individual cards
    │   └── reorder.js     # POST bulk reorder cards
    └── links/
        └── index.js       # (exists but not analyzed)

components/
└── OversizedLink.jsx # Card component with gradient/color support

lib/
└── db.js             # MongoDB connection with dev/prod pooling

scripts/
└── seed-cards.cjs    # Database seeding script
```

### Data Flow
1. **Main Page**: Server-side rendering fetches cards from MongoDB → displays grid
2. **Admin Interface**: Client-side CRUD operations through API routes
3. **Authentication**: Bearer token system for admin operations (`ADMIN_TOKEN`)
4. **Card Ordering**: Drag-and-drop updates order field in database

## Key Development Patterns

### Environment Configuration
```bash
# Required environment variables:
MONGODB_URI=mongodb://...          # Database connection string
DB_NAME=launchmass               # Database name (optional, defaults to 'launchmass')
ADMIN_TOKEN=your-secret-token     # Admin authentication token
BASE_URL=http://localhost:3000    # Base URL for seeding script
```

### Card Data Schema
Cards stored in MongoDB `cards` collection with fields:
- `title` - Display title
- `href` - External link URL  
- `description` - Subtitle text
- `background` - CSS gradient or color value
- `order` - Sort order (numeric)
- `createdAt/updatedAt` - Timestamps

### Authentication Pattern
Admin operations require `Authorization: Bearer {ADMIN_TOKEN}` header. Token is stored in localStorage for admin interface persistence.

### Background/Styling System
- Supports CSS gradients and solid colors
- Default gradient: `linear-gradient(90deg, rgba(42, 123, 155, 1) 0%, rgba(87, 199, 133, 1) 50%, rgba(237, 221, 83, 1) 100%)`
- Admin interface parses multi-line CSS input and extracts background values

### Component Patterns
- **OversizedLink**: Handles gradient vs solid color detection
- **Admin Cards**: Inline editing with form state management
- **Drag & Drop**: Uses @dnd-kit with optimistic UI updates

## Project Rules Compliance

This project follows strict development protocols:

### Prohibited Practices
- **Tests are forbidden** - This is an MVP factory, no testing allowed
- **Breadcrumb navigation** - Explicitly prohibited in UI design
- **Hardcoded styles** - Must use centralized styling system

### Mandatory Practices
- **Comprehensive commenting** - All code must explain what it does and why
- **Strict versioning** - Follow MAJOR.MINOR.PATCH with increment rules
- **Complete documentation** - Update README.md, TASKLIST.md, RELEASE_NOTES.md, etc.
- **ISO 8601 timestamps** - Format: YYYY-MM-DDTHH:MM:SS.sssZ

### Version Management Protocol
1. **Before `npm run dev`**: Increment PATCH (+1)
2. **Before GitHub commit**: Increment MINOR (+1), reset PATCH to 0
3. **Production deployment**: Verify version consistency across all files

## Critical Development Notes

### Database Connection
- Uses connection pooling pattern for dev/production environments
- Global connection reuse in development to prevent connection exhaustion

### Admin Interface Features
- Real-time card editing with optimistic updates
- Drag-and-drop reordering with bulk database updates
- Token-based authentication with localStorage persistence

### CSS Architecture
- Global styles in `styles/globals.css`
- Montserrat font family from Google Fonts
- Fixed gradient background with semi-transparent card overlays
- Mobile-first responsive grid layout

### API Design
- RESTful endpoints with proper HTTP methods
- Consistent error handling and status codes
- ObjectId string conversion for client compatibility
- Bulk operations for efficiency (reorder endpoint)

## Integration Points

When working with this codebase, pay attention to:
- MongoDB connection patterns in `lib/db.js`
- Authentication flow in admin routes
- Card component gradient/color logic
- API route error handling consistency
- CSS grid responsive behavior

## Database Policy — Local Development

- Rule: Always use the production MongoDB for local development (no separate dev/staging DBs).
- Rationale: Ensures data parity and identical behavior between localhost and production; avoids schema/index drift and hidden bugs.
- Scope: All contributors and all local environments.
- Security: Do not commit secrets. Use .env.local (gitignored) to store MONGODB_URI and SSO configuration.
- Operational Note: Writes must follow business rules since they affect production data.
- Timestamp: 2025-10-01T11:15:00.000Z

## Authentication — SSO Integration (v1.5.0+)

**Critical: Admin features ONLY work on launchmass.doneisbetter.com (production subdomain)**

- Rule: All admin operations require valid SSO session from sso.doneisbetter.com
- Authentication Method: HttpOnly cookies with `Domain=.doneisbetter.com`
- Localhost Limitation: Admin features DO NOT work on localhost due to cookie domain mismatch
- Development Testing: Use Vercel preview deployments with *.doneisbetter.com subdomain
- Public Pages: Non-admin routes work fine on localhost (no SSO required)
- User Management: First SSO login automatically grants admin rights via `users` collection
- Audit Trail: All authentication attempts logged in `authLogs` collection with IP/user agent
- Session Monitoring: Client-side 5-minute interval checks with auto-redirect on expiration
- Legacy Auth: ADMIN_TOKEN bearer token system removed in v1.5.0 (deprecated)
- Timestamp: 2025-10-02T14:18:45.000Z

**Environment Variables Required:**
```bash
# Server-side SSO config
SSO_SERVER_URL=https://sso.doneisbetter.com
SSO_COOKIE_DOMAIN=.doneisbetter.com
SSO_LOGIN_PATH=/
SSO_LOGOUT_PATH=/logout

# Client-side SSO config (NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_SSO_SERVER_URL=https://sso.doneisbetter.com
NEXT_PUBLIC_SSO_LOGIN_PATH=/
NEXT_PUBLIC_SSO_LOGOUT_PATH=/logout
```

**For detailed implementation:** See `SSO_IMPLEMENTATION.md` and `DEPLOYMENT_GUIDE.md`
