import '../styles/globals.css';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // Functional: Hide the global info bar on all /admin routes.
  // Strategic: Keep CSS/global styles unchanged and suppress rendering only on admin paths
  // to keep the admin UI clean without duplicating layouts.
  const rawPath = router.asPath || router.pathname || '';
  const pathname = rawPath.split('?')[0].split('#')[0];
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  return (
    <>
      <div className="background-content" />
      <Component {...pageProps} />
      {!isAdminRoute && (
        <div className="info-bar">
          <img
            src="https://i.ibb.co/nsmDf93m/seyu-logo.png"
            alt="SEYU Logo"
            width="48"
            height="48"
          />
          <span className="info-text">SEYU SOLUTIONS</span>
        </div>
      )}
    </>
  );
}
