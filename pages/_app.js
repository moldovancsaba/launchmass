import '../styles/globals.css';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // Functional: Hide the global info bar on all /admin routes.
  // Strategic: Keep CSS/global styles unchanged and suppress rendering only on admin paths
  // to keep the admin UI clean without duplicating layouts.
  const rawPath = router.asPath || router.pathname || '';
  const pathname = rawPath.split('?')[0].split('#')[0];
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/') || pathname.endsWith('/admin') || pathname.includes('/admin/');

  return (
    <>
      <div className="background-content" />
      <Component {...pageProps} />
      {!isAdminRoute && (
        <div className="info-bar" style={{ display:'flex', alignItems:'center', gap:8, position:'fixed', bottom:8, left:8, right:8, padding:'8px 12px', background:'rgba(0,0,0,0.06)', borderRadius:12, backdropFilter:'blur(2px)', zIndex:1000, color:'#111' }}>
          <img
            src="https://i.ibb.co/nsmDf93m/seyu-logo.png"
            alt="SEYU Logo"
            width="32"
            height="32"
            style={{ borderRadius: 6 }}
          />
          <span className="info-text" style={{ fontWeight:600 }}>SEYU SOLUTIONS</span>
          {/* Functional: Quick-access links to Organizations and Admin from any non-admin page. */}
          {/* Strategic: Improves discoverability even when / redirects to an org; avoids breadcrumbs. */}
          <a href="/organizations" className="tag-chip" style={{ marginLeft: 'auto' }}>Organizations</a>
          <a href="/admin" className="tag-chip">Admin</a>
        </div>
      )}
    </>
  );
}
