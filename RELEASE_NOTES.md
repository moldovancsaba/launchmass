# Release Notes - launchmass

## [v1.1.0] — 2025-01-21T14:12:14.000Z

## [v1.2.0] — 2025-09-16T12:24:10.000Z

### Changed
- Hide global bottom info bar on admin routes via conditional rendering in pages/_app.js; other pages unaffected.
- Stabilized build by adding pages/_document.js (or ensuring it exists) and deferring MongoDB client initialization to runtime (lazy init) to avoid build-time env throws.

### Documentation
- Updated version across package.json, README.md badge, ARCHITECTURE.md, LEARNINGS.md.
- Roadmap and tasks logged in governance docs where applicable.

### Added
- **Complete Documentation Framework**: Established comprehensive project documentation structure
  - Created TASKLIST.md for development task management
  - Created ROADMAP.md for strategic planning and milestone tracking
  - Created ARCHITECTURE.md for system component documentation
  - Created LEARNINGS.md for development insights and lessons learned
  - Updated README.md with full documentation index and project overview

### Changed
- **Version Management**: Applied semantic versioning protocol with MINOR increment for commit
  - Updated from v1.0.1 to v1.1.0 following pre-commit versioning rules
  - Ensured version consistency across all project files and documentation

### Technical Details
- **Documentation Standards**: All documentation follows project governance rules
  - No outdated or deprecated content included
  - Forward-looking roadmap without historical entries
  - Structured task management with ownership and delivery dates
  - ISO 8601 timestamp format compliance throughout

## [v1.0.1] — 2025-01-21T13:49:24.000Z

### Added
- **Google Analytics Integration**: Implemented gtag.js tracking with ID G-HQ5QPLMJC1
  - Created `pages/_document.js` with comprehensive Google Analytics setup
  - Ensures consistent tracking across all application pages
  - Follows Google's recommended gtag.js implementation approach
  - Added detailed code comments explaining implementation decisions

### Changed
- **Documentation Structure**: Established comprehensive documentation framework
  - Updated README.md with version badge and documentation links
  - Created TASKLIST.md for development task tracking
  - Created ROADMAP.md for strategic planning and milestones
  - Created ARCHITECTURE.md for system overview and component documentation
  - Created LEARNINGS.md for development insights and lessons learned

### Technical Details
- **Version Management**: Incremented PATCH version following semantic versioning protocol
- **Code Quality**: Applied comprehensive commenting standards throughout implementation
- **Architecture**: Analytics injection via Next.js _document.js ensures optimal performance and coverage
