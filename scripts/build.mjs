// Builds the website into dist/ from the Notion database (or from content/seed.json with --local).
// Also fills in missing German and English translations with DeepL and writes them back to Notion.
import fs from 'node:fs';
import path from 'node:path';
import { findDatabase, queryAll, updatePage } from '../src/notion.mjs';
import { fromNotion, fromSeed, fingerprint, LANGS } from '../src/model.mjs';
import { richToHtml, plain } from '../src/richtext.mjs';
import { hasDeepL, translateRich } from '../src/translate.mjs';

const LOCAL = process.argv.includes('--local');
const ROOT = new URL('..', import.meta.url).pathname;
const DIST = path.join(ROOT, 'dist');

// 1. Load content
let rows;
if (LOCAL) {
  rows = fromSeed();
  console.log(`Mode local : ${rows.length} rubriques depuis content/seed.json`);
} else {
  const db = await findDatabase();
  if (!db) throw new Error('Base « Guide Le Moulin » introuvable. Lancez d’abord « Créer la base Notion » et vérifiez que la page est partagée avec l’intégration.');
  rows = (await queryAll(db.id)).map(fromNotion);
  console.log(`${rows.length} rubriques lues dans Notion`);
}
rows = rows.filter(r => r.publie && r.partie).sort((a, b) => a.ordre - b.ordre);

// 2. Translations
const empty = rt => !plain(rt).trim();
for (const row of rows) {
  const fp = fingerprint(row);
  const stale = fp !== row.hash;
  const missing = ['de', 'en'].filter(l => empty(row.texte[l]) && !empty(row.texte.fr) || empty(row.titre[l]) && !empty(row.titre.fr));
  const todo = row.manual ? missing : (stale ? ['de', 'en'] : missing);
  if (!todo.length) continue;
  if (!hasDeepL() || LOCAL) {
    console.log(`  ! ${row.slug} : traduction ${todo.join('/')} à faire (pas de clé DeepL), le français est affiché à la place`);
    continue;
  }
  const props = {};
  for (const l of todo) {
    const [titre, texte] = await translateRich([row.titre.fr, row.texte.fr], l);
    row.titre[l] = titre; row.texte[l] = texte;
    props[`Titre ${l.toUpperCase()}`] = { rich_text: titre };
    props[`Texte ${l.toUpperCase()}`] = { rich_text: texte };
  }
  props['Empreinte FR'] = { rich_text: [{ type: 'text', text: { content: fp } }] };
  await updatePage(row.id, props);
  console.log(`  ~ ${row.slug} : traduit en ${todo.join('/')} et enregistré dans Notion`);
}

// 3. Photos (Notion file links expire after an hour, so they are copied into the site)
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'img'), { recursive: true });
async function download(url, base) {
  try {
    if (url.startsWith('./') || url.startsWith('content/')) {
      const src = path.join(ROOT, url.replace(/^\.\//, ''));
      const name = base + path.extname(src);
      fs.copyFileSync(src, path.join(DIST, 'img', name));
      return 'img/' + name;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const type = res.headers.get('content-type') || '';
    const ext = type.includes('png') ? '.png' : type.includes('webp') ? '.webp' : type.includes('gif') ? '.gif' : '.jpg';
    fs.writeFileSync(path.join(DIST, 'img', base + ext), Buffer.from(await res.arrayBuffer()));
    return 'img/' + base + ext;
  } catch (e) {
    console.log(`  ! photo non récupérée (${base}) : ${e.message}`);
    return null;
  }
}

// 4. Assemble the data the page needs
const pick = (o, l) => (empty(o[l]) ? o.fr : o[l]);
const tri = f => Object.fromEntries(LANGS.map(l => [l, f(l)]));
const data = { updated: new Date().toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit', year: 'numeric' }), home: null, intro: {}, ess: [], sections: [] };
for (const row of rows) {
  const photos = [];
  for (const [i, ph] of row.photos.entries()) {
    const src = await download(ph.url, `${row.slug}-${i + 1}`);
    if (src) photos.push(src);
  }
  const item = {
    id: row.slug,
    icon: row.icone,
    isNew: row.nouveau,
    wide: row.large,
    title: tri(l => plain(pick(row.titre, l))),
    html: tri(l => richToHtml(pick(row.texte, l))),
    photos,
  };
  if (row.partie === 'Accueil') data.home = item;
  else if (row.partie === 'Essentiel') data.ess.push(item);
  else if (row.partie === 'Intro maison') data.intro.house = item;
  else if (row.partie === 'Intro Grimentz') data.intro.village = item;
  else data.sections.push({ ...item, part: row.partie === 'Maison' ? 'house' : 'village' });
}

// 5. Write the page
const template = fs.readFileSync(path.join(ROOT, 'template', 'index.html'), 'utf8');
const json = JSON.stringify(data).replace(/</g, '\\u003c');
fs.writeFileSync(path.join(DIST, 'index.html'), template.replace('/*__DATA__*/null', json));
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
if (process.env.SITE_DOMAIN) fs.writeFileSync(path.join(DIST, 'CNAME'), process.env.SITE_DOMAIN.trim());
console.log(`Site prêt : ${data.sections.length} rubriques, ${data.ess.length} infos clés.`);
