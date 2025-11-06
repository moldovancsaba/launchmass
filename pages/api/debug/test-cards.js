import clientPromise from '../../../lib/db';

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'launchmass');
    
    // Find default org
    const defaultOrg = await db.collection('organizations').findOne({ slug: 'default' });
    
    if (!defaultOrg) {
      return res.status(404).json({ error: 'Default org not found' });
    }
    
    // Find cards
    const cards = await db.collection('cards').find({ orgUuid: defaultOrg.uuid }).limit(5).toArray();
    
    return res.status(200).json({
      org: {
        uuid: defaultOrg.uuid,
        slug: defaultOrg.slug,
        name: defaultOrg.name,
        useSlugAsPublicUrl: defaultOrg.useSlugAsPublicUrl,
        isActive: defaultOrg.isActive,
      },
      cardsCount: cards.length,
      cards: cards.map(c => ({ title: c.title, orgUuid: c.orgUuid })),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
