import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getOrgBySlugCached, getOrgByUuid } from '../../../lib/org.js';

// /organization/[id]/admin — Organization-scoped admin UI
// Functional: Reuses the existing Admin UI but locks organization selection to the path's org (slug or UUID).
// Strategic: Path-based admin avoids breadcrumbs and keeps routing consistent with public org pages.

export default function OrgAdminPage({ org }) {
  const router = useRouter();
  useEffect(() => {
    try {
      // WHAT: Set localStorage AND pass via query parameter
      // WHY: Query parameter ensures immediate org selection; localStorage as backup
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin.selectedOrgUuid', org.uuid);
      }
      router.replace(`/admin?orgUuid=${encodeURIComponent(org.uuid)}`);
    } catch {}
  }, [org?.uuid]);
  return (
    <main style={{ padding: 16 }}>
      <div className="org-banner" style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 600 }}>Organization Admin:</span>
        <span>{org?.name || 'Unknown'}</span>
        <span style={{ opacity: 0.7, fontSize: 12 }}>({org?.slug || org?.uuid})</span>
        <a
          href={`/organization/${encodeURIComponent(org.uuid)}`}
          className="tag-chip"
          style={{ marginLeft: 'auto' }}
        >
          ← Back to org
        </a>
      </div>
      <p style={{ opacity: 0.75 }}>Redirecting to admin… If not redirected, <a href="/admin">open admin</a>.</p>
    </main>
  );
}

export async function getServerSideProps(context) {
  const id = typeof context?.params?.slug === 'string' ? context.params.slug : '';
  let org = id ? await getOrgBySlugCached(id) : null;
  if ((!org || org.isActive === false) && id) {
    const byUuid = await getOrgByUuid(id);
    if (byUuid && byUuid.isActive !== false) org = byUuid;
  }
  if (!org || org.isActive === false) return { notFound: true };

  return {
    props: {
      org: { uuid: org.uuid, name: org.name, slug: org.slug }
    }
  };
}
