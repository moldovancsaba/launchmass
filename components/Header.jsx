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
        height: '56px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
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
            background: '#111',
            borderRadius: '2px',
            transition: 'transform 0.2s, opacity 0.2s',
            transform: menuOpen ? 'rotate(45deg) translateY(7px)' : 'none',
          }} />
          <span style={{
            display: 'block',
            width: '24px',
            height: '3px',
            background: '#111',
            borderRadius: '2px',
            transition: 'opacity 0.2s',
            opacity: menuOpen ? 0 : 1,
          }} />
          <span style={{
            display: 'block',
            width: '24px',
            height: '3px',
            background: '#111',
            borderRadius: '2px',
            transition: 'transform 0.2s, opacity 0.2s',
            transform: menuOpen ? 'rotate(-45deg) translateY(-7px)' : 'none',
          }} />
        </button>

        {/* Organization Title - Center */}
        {orgName && (
          <h1 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            color: '#111',
            textAlign: 'center',
          }}>
            {orgName}
          </h1>
        )}

        {/* Add Card Button - Top Right (admin pages only) */}
        {showAddCard && onAddCard && (
          <button
            onClick={onAddCard}
            style={{
              position: 'absolute',
              right: '16px',
              background: 'rgba(0, 150, 255, 0.9)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(0, 150, 255, 1)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(0, 150, 255, 0.9)'}
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
            top: '56px',
            left: 0,
            width: '280px',
            maxHeight: 'calc(100vh - 56px)',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
            borderRight: '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            padding: '16px',
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
                  <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.1)', margin: '8px 0' }} />
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
                      background: 'rgba(255, 100, 100, 0.1)',
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
          padding: 12px 16px;
          text-decoration: none;
          color: #111;
          border-radius: 8px;
          font-size: 15px;
          transition: background 0.2s;
        }
        .menu-item:hover {
          background: rgba(0, 0, 0, 0.05);
        }
      `}</style>
    </>
  );
}
