# Documentation Archive

This directory contains historical documentation that has been superseded by current implementations.

## Archived Authentication Documentation

**Date Archived:** 2025-12-21T13:33:53.000Z  
**Reason:** Multiple overlapping auth docs caused confusion about current implementation

### Files in Archive

1. **SSO_IMPLEMENTATION.md** (v1.5.0 - Oct 2025)
   - Original SSO cookie-forwarding implementation
   - Superseded by OAuth 2.0 in v1.7.0
   - Kept for historical reference of v1.5.0 approach

2. **SSO_INTEGRATION_SUMMARY.md** (v1.5.0 - Oct 2025)
   - Summary of v1.5.0 SSO integration
   - Deployment checklist for cookie-forwarding approach
   - Historical artifact

3. **OAUTH_MIGRATION_v1.6.0.md** (v1.6.0 - Oct 2025)
   - Migration guide from v1.5.0 to OAuth 2.0
   - Documents the transition period
   - Historical context for why OAuth was needed

4. **OAUTH_SETUP.md** (Oct 2025)
   - OAuth 2.0 setup guide for v1.6.0-v1.7.0
   - Detailed OAuth flow documentation
   - Superseded by AUTH_CURRENT.md

5. **DEPLOYMENT_GUIDE.md** (v1.5.0 - Oct 2025)
   - Deployment guide for v1.5.0 cookie-forwarding SSO
   - Superseded by current deployment processes
   - Contains valuable troubleshooting info

### Current Authentication Documentation

**For current OAuth 2.0 implementation, see:**
- **AUTH_CURRENT.md** - Single authoritative authentication guide (root directory)
- **ARCHITECTURE.md** - Authentication System section
- **WARP.md** - Development setup and OAuth configuration

## Why Archive?

1. **Reduce Confusion:** Multiple auth docs (1,748 lines across 5 files) described overlapping approaches
2. **Single Source of Truth:** Current implementation now in AUTH_CURRENT.md
3. **Historical Value:** Preserves evolution of authentication system for future reference
4. **Protocol Compliance:** Eliminates outdated content per documentation governance rules

## Authentication Evolution Timeline

- **v1.5.0** (Oct 2, 2025) - Cookie-forwarding SSO with lib/auth.js
- **v1.6.0** (Oct 3, 2025) - OAuth 2.0 development and testing
- **v1.7.0** (Oct 7, 2025) - OAuth 2.0 production deployment with lib/auth-oauth.js
- **v1.13.0** (Dec 20, 2025) - SSO permission sync integration, simplified roles

## Access

These documents remain available for:
- Understanding historical authentication approaches
- Troubleshooting legacy issues
- Learning from implementation decisions
- Documentation compliance audits

**Do not use for current development.** Always refer to current documentation in root directory.
