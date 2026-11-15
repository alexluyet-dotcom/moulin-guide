// Minimal Notion API client (no dependencies, Node 20+)
const API = 'https://api.notion.com/v1';
const VERSION = '2022-06-28';
export const DB_TITLE = 'Guide Le Moulin';

export const PARTS = ['Accueil', 'Essentiel', 'Intro maison', 'Intro Grimentz', 'Maison', 'Grimentz'];
export const ICONS = ['acces', 'parking', 'bus', 'cle', 'cuisine', 'poele', 'chauffage', 'tv', 'skis', 'dechets',
  'securite', 'liens', 'restaurants', 'courses', 'bars', 'sport', 'pluie', 'patinoire', 'patrimoine',
  'info', 'photo', 'carte', 'velo', 'soleil', 'enfants'];

function token() {
  const t = process.env.NOTION_TOKEN;
  if (!t) throw new Error('NOTION_TOKEN manquant : ajoutez le secret dans GitHub (voir le guide de mise en route).');
  return t;
}

async function call(method, path, body, tries = 4) {
  const res = await fetch(API + path, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Notion-Version': VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if ((res.status === 429 || res.status >= 500) && tries > 0) {
    await new Promise(r => setTimeout(r, 1500));
    return call(method, path, body, tries - 1);
  }
  const json = await res.json();
  if (!res.ok) throw new Error(`Notion ${res.status} ${path}: ${json.message}`);
  return json;
}

export async function findDatabase() {
  const r = await call('POST', '/search', { query: DB_TITLE, filter: { property: 'object', value: 'database' } });
  return r.results.find(d => d.title?.map(t => t.plain_text).join('') === DB_TITLE) || null;
}

export async function findParentPage() {
  if (process.env.NOTION_PAGE_ID) {
    const raw = process.env.NOTION_PAGE_ID.trim().split(/[?#]/)[0];
    const uuid = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    if (uuid) return uuid[0].replace(/-/g, '');
    const tail = raw.match(/[0-9a-f]{32}$/i);
    if (tail) return tail[0];
  }
  const r = await call('POST', '/search', { filter: { property: 'object', value: 'page' } });
  const ids = new Set(r.results.map(p => p.id));
  // keep only the shared page itself, not the sub-pages Notion also returns
  const pages = r.results.filter(p => !(p.parent?.type === 'page_id' && ids.has(p.parent.page_id)));
  if (pages.length === 1) return pages[0].id;
  throw new Error(`Je trouve ${pages.length} pages partagées avec l'intégration. Partagez une seule page avec elle, ou ajoutez le secret NOTION_PAGE_ID.`);
}

const sel = names => ({ select: { options: names.map(name => ({ name })) } });

export async function createDatabase(parentId) {
  return call('POST', '/databases', {
    parent: { type: 'page_id', page_id: parentId },
    title: [{ type: 'text', text: { content: DB_TITLE } }],
    is_inline: true,
    properties: {
      'Titre': { title: {} },
      'Partie': sel(PARTS),
      'Ordre': { number: {} },
      'Publié': { checkbox: {} },
      'Texte FR': { rich_text: {} },
      'Titre DE': { rich_text: {} },
      'Texte DE': { rich_text: {} },
      'Titre EN': { rich_text: {} },
      'Texte EN': { rich_text: {} },
      'Photos': { files: {} },
      'Icône': sel(ICONS),
      'Nouveau': { checkbox: {} },
      'Mise en avant': { checkbox: {} },
      'Slug': { rich_text: {} },
      'Traduction manuelle': { checkbox: {} },
      'Empreinte FR': { rich_text: {} },
    },
  });
}

export async function queryAll(dbId) {
  const out = [];
  let cursor;
  do {
    const r = await call('POST', `/databases/${dbId}/query`, { start_cursor: cursor, page_size: 100 });
    out.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return out;
}

export const createPage = (dbId, properties) => call('POST', '/pages', { parent: { database_id: dbId }, properties });
export const updatePage = (pageId, properties) => call('PATCH', `/pages/${pageId}`, { properties });
