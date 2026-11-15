// Translation of French content into German and English.
// Uses Claude (ANTHROPIC_API_KEY) if available, otherwise DeepL (DEEPL_KEY).
// Bold, italic, links and line breaks are kept.
import { richToTranslatable, translatableToRich } from './richtext.mjs';

export const hasDeepL = () => !!(process.env.ANTHROPIC_API_KEY || process.env.DEEPL_KEY);
export const translatorName = () => (process.env.ANTHROPIC_API_KEY ? 'Claude' : 'DeepL');

const STYLE = {
  de: 'Swiss Standard German (Schweizer Hochdeutsch): always "ss", never "ß"; address the guest formally with "Sie"; Swiss usage such as "Velo", "parkieren", "Lavabo"',
  en: 'British English, warm and natural',
};

async function claude(html, lang) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5',
      max_tokens: 4000,
      system:
        `You translate a holiday apartment guest guide (Le Moulin 1771, Grimentz, Switzerland) from French into ${STYLE[lang]}. ` +
        'The hosts are Gaëlle and Alexandre; the tone is warm, short and practical, written by real people, never marketing-like. ' +
        'The input is a fragment of HTML using only <b>, <i>, <a href="..."> and <br>. Keep every tag, attribute and URL exactly as is and in the same places; translate only the text. ' +
        'Keep proper names (places, shops, restaurants, products) unchanged. Keep Swiss formats such as "CHF 10.-" and 24-hour times. ' +
        'Never use em dashes or en dashes. Reply with the translated HTML fragment only, with no comment.',
      messages: [{ role: 'user', content: html }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.content.filter(c => c.type === 'text').map(c => c.text).join('').trim();
}

async function deepl(htmls, lang) {
  const key = process.env.DEEPL_KEY;
  const host = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  const res = await fetch(`${host}/v2/translate`, {
    method: 'POST',
    headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: htmls, source_lang: 'FR', target_lang: lang === 'de' ? 'DE' : 'EN-GB',
      tag_handling: 'html', preserve_formatting: true, formality: lang === 'de' ? 'more' : 'default',
    }),
  });
  if (!res.ok) throw new Error(`DeepL ${res.status}: ${await res.text()}`);
  return (await res.json()).translations.map(t => t.text);
}

export async function translateRich(richList, lang) {
  const htmls = richList.map(r => richToTranslatable(r));
  let out;
  if (process.env.ANTHROPIC_API_KEY) {
    out = [];
    for (const h of htmls) out.push(h.trim() ? await claude(h, lang) : '');
  } else {
    out = await deepl(htmls.map(h => h || ' '), lang);
  }
  return out.map(h => translatableToRich(h.replace(/[–—]/g, ',')));
}
