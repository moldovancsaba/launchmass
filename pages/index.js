import { useRouter } from 'next/router';
import { ChoiceChip, GdsEmptyStateTemplate, GdsErrorPageTemplate } from '@sovereignsquad/gds-core';
import OversizedLink from '../components/OversizedLink';
import Header from '../components/Header';
import clientPromise from '../lib/db';

/**
 * WHAT: Public card-grid landing page -- renders exactly one of three
 * mutually-exclusive states: fetch error, genuinely-empty org, or a
 * populated grid (see issue #19).
 * WHY (GDS component choice): the issue's suggested `GdsEmptyStateTemplate`
 * checked out against the actually-installed gds-core@6.0.0 dist
 * (node_modules/@sovereignsquad/gds-core/dist/AISearchCard-DlLxEGV9.d.ts) --
 * it exists, exactly as named, as a governed "first-run / no-results" page
 * template (id `empty-state-page`) with a documented accessibility contract
 * ("single h1, specific empty reason, keyboard reachable recovery, no
 * color-only meaning"). Its sibling `GdsErrorPageTemplate` (id `error-page`,
 * contract "main landmark, semantic heading, recovery action label, status
 * text") is the direct fit for the error state: passing `onRetry`+
 * `retryLabel` renders GDS's own retry button with no hand-rolled markup,
 * exactly matching the issue's "GDS button primitives, not a hand-rolled
 * <button>" constraint. Both templates render their own `<main>` landmark
 * (via GDS's internal `PageTemplateFrame`), so the populated-grid `<main
 * className="grid">` below is only rendered when there are cards to show --
 * avoiding two `<main>` landmarks on the same page.
 */
export default function Home({ cards, activeTag, orgName, orgBackground, fetchError }) {
  const hasCards = Array.isArray(cards) && cards.length > 0;
  const router = useRouter();

  // WHAT: Retry re-triggers the SSR data fetch via a full navigation.
  // WHY: This page has no client-side data-fetching layer (SSR-per-request
  // model, unchanged by this issue -- see issue #19 Non-Goals), so a full
  // reload is the simplest correct retry mechanism; the browser's own
  // native loading indicator covers the "retry in flight" UX.
  function handleRetry() {
    window.location.reload();
  }

  return (
    <>
      {/* Default organization background override */}
      {orgBackground && (
        <style jsx global>{`
          .background-content::before {
            background: ${orgBackground} !important;
          }
        `}</style>
      )}
      <Header orgName={orgName || 'launchmass'} />
      {fetchError ? (
        // WHAT: Distinct from the empty state below -- a DB/fetch failure,
        // not a legitimately-empty org. Copy is fixed/generic on purpose:
        // the real error only goes to the server-side console.error in
        // getServerSideProps (see issue #19 Security/Privacy Requirements).
        <GdsErrorPageTemplate
          title="We couldn't load this page right now."
          description="Please try again in a moment. If the problem continues, check back later."
          onRetry={handleRetry}
          retryLabel="Try again"
        />
      ) : !hasCards ? (
        // WHAT: Genuinely-empty org (including a tag filter with zero
        // matches, see the filter bar below) -- restyled onto GDS from the
        // previous hand-rolled <section>, same copy and same two quick links.
        <GdsEmptyStateTemplate
          title="Welcome to SEYU"
          description="No content found yet."
          actions={[
            { id: 'organizations', label: 'Organizations', onClick: () => router.push('/settings#organizations') },
            { id: 'admin', label: 'Admin', onClick: () => router.push('/admin') },
          ]}
        />
      ) : null}
      {activeTag ? (
        <div className="filter-bar" style={{ padding: '8px 16px', marginTop: 64, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Filtering by</span>
          <ChoiceChip active label={`#${activeTag}`} href={`/?tag=${encodeURIComponent(activeTag)}`} />
          <ChoiceChip label="Clear" href="/" />
        </div>
      ) : null}
      {hasCards && (
        <main className="grid">
          {cards.map((c, i) => (
            <OversizedLink
              key={i}
              href={c.href}
              title={c.title}
              description={c.description}
              background={c.background}
              tags={Array.isArray(c.tags) ? c.tags : []}
            />
          ))}
        </main>
      )}
    </>
  );
}

export async function getServerSideProps(context) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'launchmass');

    // WHAT: Find default organization and show its cards
    // WHY: Main page should show cards from the default organization
    const orgsCol = db.collection('organizations');
    const defaultOrg = await orgsCol.findOne({ isDefault: true, isActive: { $ne: false } });

    const rawTag = typeof context.query.tag === 'string' ? context.query.tag : '';
    const filterTag = rawTag.trim().toLowerCase();
    
    // WHAT: Build query to filter by default org (if exists) and optional tag
    // WHY: Show only cards from default org on main page
    let query = {};
    if (defaultOrg) {
      query.orgUuid = defaultOrg.uuid;
    }
    if (filterTag) {
      query.tags = filterTag;
    }

    const cards = await db.collection('cards').find(query).sort({ order: 1, _id: 1 }).toArray();

    // Functional: Normalize timestamps to ISO strings for consistent JSON serialization
    // Strategic: Handle both Date objects (new cards) and string timestamps (migrated legacy cards)
    const toISOString = (val) => {
      if (!val) return undefined;
      if (typeof val === 'string') return val; // Already a string
      if (val instanceof Date) return val.toISOString(); // Date object
      return undefined;
    };

    const safe = cards.map(({ createdAt, updatedAt, ...rest }) => {
      delete rest._id;
      return {
        ...rest,
        tags: Array.isArray(rest?.tags) ? rest.tags : [],
        ...(createdAt && { createdAt: toISOString(createdAt) }),
        ...(updatedAt && { updatedAt: toISOString(updatedAt) })
      };
    });
    return { props: { cards: safe, activeTag: filterTag || null, orgName: defaultOrg?.name || null, orgBackground: defaultOrg?.background || null, fetchError: false } };
  } catch (err) {
    // WHAT: Capture and log the real error, then tell the page this was a
    // failure -- not a legitimately-empty org (see issue #19).
    // WHY: The previous bare `catch {}` discarded the exception entirely and
    // returned the exact same shape as a genuinely-empty org, so a DB outage
    // was indistinguishable from "no content yet" to both visitors and
    // anyone checking server logs.
    console.error('[index] getServerSideProps failed:', err.message);
    return { props: { cards: [], activeTag: null, orgName: null, orgBackground: null, fetchError: true } };
  }
}
