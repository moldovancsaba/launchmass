import { useState, useEffect } from 'react';

// Header component with hamburger menu and organization title
// WHAT: Provides consistent navigation across all public pages with auth-aware menu
// WHY: Centralized menu reduces UI clutter and provides mobile-friendly navigation

export default function Header({ orgName, onAddCard, showAddCard = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // WHAT: Check authentication status on mount
  // WHY: Show/hide auth-protected menu items based on login state
  useEffect(() => {
    fetch('/api/auth/validate', { credentials: 'include', cache: 'no-store' })
      .then(res => res.json())
      .then(data => setIsAuthenticated(!!data.isValid))
      .catch(() => setIsAuthenticated(false));
  }, []);

  return (
    <>
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: '#1B1F3C',
        borderBottom: '1px solid #2A2F52',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
        zIndex: 1000,
      }}>
        {/* Hamburger Button - Top Left */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            position: 'absolute',
            left: '16px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            zIndex: 1001,
          }}
          aria-label="Menu"
        >
          <span style={{
            display: 'block',
            width: '24px',
            height: '3px',
            background: '#fff',
            borderRadius: '2px',
            transition: 'transform 0.2s, opacity 0.2s',
            transform: menuOpen ? 'rotate(45deg) translateY(7px)' : 'none',
          }} />
          <span style={{
            display: 'block',
            width: '24px',
            height: '3px',
            background: '#fff',
            borderRadius: '2px',
            transition: 'opacity 0.2s',
            opacity: menuOpen ? 0 : 1,
          }} />
          <span style={{
            display: 'block',
            width: '24px',
            height: '3px',
            background: '#fff',
            borderRadius: '2px',
            transition: 'transform 0.2s, opacity 0.2s',
            transform: menuOpen ? 'rotate(-45deg) translateY(-7px)' : 'none',
          }} />
        </button>

        {/* Brand - Center: SEYU white lockup, with optional org label */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
          <img src="/brand/seyu-white.png" alt="SEYU" style={{ height: '26px', width: 'auto', display: 'block' }} />
          {orgName && orgName.toLowerCase() !== 'launchmass' && (
            <span style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '9px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: '#566184',
              fontWeight: 700,
            }}>
              {orgName}
            </span>
          )}
        </div>

        {/* Add Card Button - Top Right (admin pages only) */}
        {showAddCard && onAddCard && (
          <button
            onClick={onAddCard}
            style={{
              position: 'absolute',
              right: '16px',
              background: '#B62684',
              color: '#fff',
              border: 'none',
              borderRadius: '999px',
              padding: '9px 18px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 10px 28px rgba(182,38,132,0.45)',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.08)'}
            onMouseOut={e => e.currentTarget.style.filter = 'none'}
          >
            + Add Card
          </button>
        )}
      </header>

      {/* Dropdown Menu */}
      {menuOpen && (
        <>
          {/* Overlay to close menu when clicking outside */}
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999,
              background: 'rgba(0, 0, 0, 0.3)',
            }}
          />
          
          {/* Menu Panel */}
          <nav style={{
            position: 'fixed',
            top: '64px',
            left: 0,
            width: '280px',
            maxHeight: 'calc(100vh - 64px)',
            background: '#1B1F3C',
            borderRight: '1px solid #2A2F52',
            boxShadow: '2px 0 24px rgba(0, 0, 0, 0.45)',
            zIndex: 1000,
            padding: '16px 14px',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a
                href="/"
                className="menu-item"
                onClick={() => setMenuOpen(false)}
              >
                🏠 Home
              </a>
              
              {isAuthenticated && (
                <>
                  <a
                    href="/admin"
                    className="menu-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    ⚙️ Admin
                  </a>
                  <a
                    href="/settings"
                    className="menu-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    🏢 Organizations
                  </a>
                  <a
                    href="/admin/users"
                    className="menu-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    👥 Manage Users
                  </a>
                  <div style={{ borderTop: '1px solid #2A2F52', margin: '8px 0' }} />
                  <button
                    className="menu-item"
                    onClick={async () => {
                      try {
                        // WHAT: Call Launchmass logout API to clear local session
                        // WHY: Must clear both Launchmass AND SSO sessions
                        const response = await fetch('/api/auth/logout', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                        });
                        
                        const data = await response.json();
                        
                        // WHAT: Redirect to SSO logout which will redirect back
                        // WHY: Complete the full logout flow
                        if (data.redirectUrl) {
                          window.location.href = data.redirectUrl;
                        } else {
                          window.location.href = '/';
                        }
                      } catch (error) {
                        console.error('Logout failed:', error);
                        // Fallback: direct redirect to SSO logout
                        const ssoUrl = 'https://sso.doneisbetter.com';
                        const returnUrl = encodeURIComponent(window.location.origin);
                        window.location.href = `${ssoUrl}/api/oauth/logout?post_logout_redirect_uri=${returnUrl}`;
                      }
                    }}
                    style={{
                      background: 'rgba(196, 43, 87, 0.15)',
                      color: '#F2A9BD',
                      border: 'none',
                      width: '100%',
                      textAlign: 'left',
                    }}
                  >
                    🚪 Logout
                  </button>
                </>
              )}
              
              {!isAuthenticated && (
                <a
                  href="/admin"
                  className="menu-item"
                  onClick={() => setMenuOpen(false)}
                >
                  🔐 Login
                </a>
              )}
            </div>
          </nav>
        </>
      )}

      <style jsx>{`
        .menu-item {
          display: block;
          padding: 11px 14px;
          text-decoration: none;
          color: #A6AFC4;
          border-radius: 9px;
          font-size: 14px;
          font-weight: 600;
          transition: background 0.15s, color 0.15s;
        }
        .menu-item:hover {
          background: rgba(182, 38, 132, 0.18);
          color: #fff;
        }
      `}</style>
    </>
  );
}
