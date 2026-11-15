// DeepL translation (free or paid key). Keeps bold, italic, links and line breaks.
import { richToTranslatable, translatableToRich } from './richtext.mjs';

const TARGET = { de: 'DE', en: 'EN-GB' };

export const hasDeepL = () => !!process.env.DEEPL_KEY;

export async function translateRich(richList, lang) {
  const key = process.env.DEEPL_KEY;
  const host = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  const text = richList.map(r => richToTranslatable(r) || ' ');
  const res = await fetch(`${host}/v2/translate`, {
    method: 'POST',
    headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text, source_lang: 'FR', target_lang: TARGET[lang],
      tag_handling: 'html', preserve_formatting: true,
      formality: lang === 'de' ? 'more' : 'default',
    }),
  });
  if (!res.ok) throw new Error(`DeepL ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.translations.map(t => translatableToRich(t.text));
}
