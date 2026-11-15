// One-time setup: creates the "Guide Le Moulin" database in Notion and fills it with the current content.
import { findDatabase, findParentPage, createDatabase, createPage } from '../src/notion.mjs';
import { fromSeed, toNotionProps } from '../src/model.mjs';

const existing = await findDatabase();
if (existing && !process.env.FORCE) {
  console.log(`La base « Guide Le Moulin » existe déjà (${existing.url}). Rien à faire.`);
  process.exit(0);
}
const parent = await findParentPage();
const db = await createDatabase(parent);
console.log(`Base créée : ${db.url}`);
const rows = fromSeed();
for (const row of rows) {
  await createPage(db.id, toNotionProps(row));
  console.log(`  + ${row.partie} · ${row.slug}`);
}
console.log(`${rows.length} rubriques ajoutées. Le site peut maintenant être construit.`);
