import crypto from 'node:crypto';
import fs from 'node:fs';
import { markupToRich, richToTranslatable } from './richtext.mjs';

export const LANGS = ['fr', 'de', 'en'];

// Fingerprint of the French title + text: changes whenever the French content changes
export function fingerprint(row) {
  return crypto.createHash('sha1')
    .update(richToTranslatable(row.titre.fr) + '|' + richToTranslatable(row.texte.fr))
    .digest('hex').slice(0, 12);
}

const rt = p => p?.rich_text ?? p?.title ?? [];
const txt = p => rt(p).map(r => r.plain_text).join('');

// A Notion page from the "Guide Le Moulin" database, as a plain object
export function fromNotion(page) {
  const p = page.properties;
  return {
    id: page.id,
    partie: p['Partie']?.select?.name ?? '',
    ordre: p['Ordre']?.number ?? 999,
    publie: !!p['Publié']?.checkbox,
    slug: txt(p['Slug']).trim() || page.id.slice(0, 8),
    icone: p['Icône']?.select?.name ?? 'info',
    nouveau: !!p['Nouveau']?.checkbox,
    large: !!p['Mise en avant']?.checkbox,
    manual: !!p['Traduction manuelle']?.checkbox,
    hash: txt(p['Empreinte FR']).trim(),
    titre: { fr: rt(p['Titre']), de: rt(p['Titre DE']), en: rt(p['Titre EN']) },
    texte: { fr: rt(p['Texte FR']), de: rt(p['Texte DE']), en: rt(p['Texte EN']) },
    photos: (p['Photos']?.files ?? []).map(f => ({ name: f.name, url: f.file?.url ?? f.external?.url })).filter(f => f.url),
  };
}

// Rows from content/seed.json (used to fill Notion the first time, and for local tests)
export function fromSeed(path = new URL('../content/seed.json', import.meta.url)) {
  const rows = JSON.parse(fs.readFileSync(path, 'utf8'));
  return rows.map(r => {
    const row = {
      id: null,
      partie: r.partie, ordre: r.ordre, publie: true, slug: r.slug, icone: r.icone ?? 'info',
      nouveau: !!r.nouveau, large: !!r.large, manual: false,
      titre: Object.fromEntries(LANGS.map(l => [l, markupToRich(r.titre[l])])),
      texte: Object.fromEntries(LANGS.map(l => [l, markupToRich(r.texte[l])])),
      photos: (r.photos ?? []).map(url => ({ name: url.split('/').pop(), url })),
    };
    row.hash = fingerprint(row);
    return row;
  });
}

export function toNotionProps(row) {
  const r = (x) => ({ rich_text: x });
  return {
    'Titre': { title: row.titre.fr },
    'Partie': { select: { name: row.partie } },
    'Ordre': { number: row.ordre },
    'Publié': { checkbox: row.publie },
    'Texte FR': r(row.texte.fr),
    'Titre DE': r(row.titre.de),
    'Texte DE': r(row.texte.de),
    'Titre EN': r(row.titre.en),
    'Texte EN': r(row.texte.en),
    'Icône': { select: { name: row.icone } },
    'Nouveau': { checkbox: row.nouveau },
    'Mise en avant': { checkbox: row.large },
    'Slug': r([{ type: 'text', text: { content: row.slug } }]),
    'Empreinte FR': r([{ type: 'text', text: { content: row.hash } }]),
  };
}
