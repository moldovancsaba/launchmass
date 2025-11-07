import OversizedLink from '../../components/OversizedLink';
import Header from '../../components/Header';
import clientPromise from '../../lib/db';
import { getOrgBySlugCached, getOrgByUuid } from '../../lib/org.js';

// /organization/[slug]: organization-specific launchmass (SSR)
// Functional: Renders the grid of cards for a specific organization, with optional tag filtering via ?tag=.
// Strategic: Mirrors narimato's path-based routing; uses server-side org resolution and org-scoped DB queries.

export default function OrgHome({ org, cards, activeTag }) {
  return (
    <>
      <Header orgName={org?.name || 'Organization'} />
      {activeTag ? (
        <div className="filter-bar" style={{ padding: '8px 16px' }}>
          <span>Filtering by</span>
          <a className="tag-chip" href={`/organization/${encodeURIComponent(org.uuid)}?tag=${encodeURIComponent(activeTag)}`} style={{ marginLeft: 8 }}>#{activeTag}</a>
          <a className="tag-chip" href={`/organization/${encodeURIComponent(org.uuid)}`} style={{ marginLeft: 8 }}>Clear</a>
        </div>
      ) : null}
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
    </>
  );
}

export async function getServerSideProps(context) {
  const { params, query } = context;
  const slugOrUuid = typeof params?.slug === 'string' ? params.slug : '';
  // Attempt slug first; fallback to UUID to support /organization/{uuid} URLs
  let org = await getOrgBySlugCached(slugOrUuid);
  // Enforce: Slug-based public URL must be explicitly enabled by editor (useSlugAsPublicUrl===true)
  if (org && org.isActive !== false && org.useSlugAsPublicUrl !== true) {
    // Treat as not found for slug access; do not allow accidental public exposure via slug
    org = null;
  }
  if ((!org || org.isActive === false) && slugOrUuid) {
    const byUuid = await getOrgByUuid(slugOrUuid);
    if (byUuid && byUuid.isActive !== false) org = byUuid;
  }
  if (!org || org.isActive === false) return { notFound: true };

  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'launchmass');

    const rawTag = typeof query.tag === 'string' ? query.tag : '';
    const filterTag = rawTag.trim().toLowerCase();

    const q = filterTag ? { orgUuid: org.uuid, tags: filterTag } : { orgUuid: org.uuid };
    const rows = await db.collection('cards').find(q).sort({ order: 1, _id: 1 }).toArray();

    // Functional: Normalize timestamps to ISO strings for consistent JSON serialization
    // Strategic: Handle both Date objects (new cards) and string timestamps (migrated legacy cards)
    const toISOString = (val) => {
      if (!val) return undefined;
      if (typeof val === 'string') return val; // Already a string
      if (val instanceof Date) return val.toISOString(); // Date object
      return undefined;
    };

    const safe = rows.map(({ _id, createdAt, updatedAt, ...rest }) => ({
      ...rest,
      tags: Array.isArray(rest?.tags) ? rest.tags : [],
      ...(createdAt && { createdAt: toISOString(createdAt) }),
      ...(updatedAt && { updatedAt: toISOString(updatedAt) })
    }));

    return { props: { org: { uuid: org.uuid, slug: org.slug, name: org.name }, cards: safe, activeTag: filterTag || null } };
  } catch (error) {
    console.error('[organization/[slug]] Error fetching cards:', error);
    return { props: { org: { uuid: org.uuid, slug: org.slug, name: org.name }, cards: [], activeTag: null } };
  }
}
