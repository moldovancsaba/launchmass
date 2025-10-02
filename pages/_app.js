import '../styles/globals.css';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // Functional: Hide the global info bar on all /admin routes.
  // Strategic: Keep CSS/global styles unchanged and suppress rendering only on admin paths
  // to keep the admin UI clean without duplicating layouts.
  const rawPath = router.asPath || router.pathname || '';
  const pathname = rawPath.split('?')[0].split('#')[0];
  // Bottom info bar removed globally by product decision to avoid UI duplication/overlap.

  return (
    <>
      <div className="background-content" />
      <Component {...pageProps} />
    </>
  );
}
