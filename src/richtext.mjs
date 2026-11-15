// Conversions between three formats:
// - "markup": the light text format used in content/seed.json (**bold**, *italic*, [label](url), "• " bullets)
// - Notion rich text: the array Notion stores in text properties
// - HTML: what the website shows

const MAX = 1900; // Notion limits one text item to 2000 characters

function seg(content, { bold = false, italic = false, link = null } = {}) {
  const out = [];
  for (let i = 0; i < content.length; i += MAX) {
    out.push({
      type: 'text',
      text: { content: content.slice(i, i + MAX), link: link ? { url: link } : null },
      annotations: { bold, italic, strikethrough: false, underline: false, code: false, color: 'default' },
    });
  }
  return out;
}

export function markupToRich(markup) {
  const rich = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/gs;
  let last = 0, m;
  while ((m = re.exec(markup))) {
    if (m.index > last) rich.push(...seg(markup.slice(last, m.index)));
    if (m[1] !== undefined) rich.push(...seg(m[1], { bold: true }));
    else if (m[2] !== undefined) rich.push(...seg(m[2], { italic: true }));
    else rich.push(...seg(m[3], { link: m[4] }));
    last = re.lastIndex;
  }
  if (last < markup.length) rich.push(...seg(markup.slice(last)));
  return rich;
}

export const plain = (rich = []) => rich.map(r => r.plain_text ?? r.text?.content ?? '').join('');

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Normalise Notion's rich text (which may come back with plain_text/href) into simple pieces
function pieces(rich = []) {
  return rich.map(r => ({
    text: r.plain_text ?? r.text?.content ?? '',
    bold: !!r.annotations?.bold,
    italic: !!r.annotations?.italic,
    link: r.href ?? r.text?.link?.url ?? null,
  }));
}

// Split into lines, each line a list of pieces
function lines(rich) {
  const out = [[]];
  for (const p of pieces(rich)) {
    const parts = p.text.split('\n');
    parts.forEach((t, i) => {
      if (i > 0) out.push([]);
      if (t) out[out.length - 1].push({ ...p, text: t });
    });
  }
  return out;
}

function inline(ps) {
  return ps.map(p => {
    let h = esc(p.text);
    if (p.bold) h = `<strong>${h}</strong>`;
    if (p.italic) h = `<em>${h}</em>`;
    if (p.link) h = `<a href="${esc(p.link)}">${h}</a>`;
    return h;
  }).join('');
}

const isBullet = ps => ps.length && /^\s*•\s?/.test(ps[0].text);
const stripBullet = ps => {
  const [first, ...rest] = ps;
  const t = first.text.replace(/^\s*•\s?/, '');
  return t ? [{ ...first, text: t }, ...rest] : rest;
};

// Rich text to HTML blocks: paragraphs, lists, and "place cards" (a bullet that starts with a link)
export function richToHtml(rich) {
  const ls = lines(rich);
  let html = '', para = [], list = [];
  const flushPara = () => {
    if (!para.length) return;
    const allItalic = para.every(l => l.every(p => p.italic));
    const body = para.map(l => inline(allItalic ? l.map(p => ({ ...p, italic: false })) : l)).join('<br>');
    html += allItalic ? `<p class="note">${body}</p>` : `<p>${body}</p>`;
    para = [];
  };
  const flushList = () => {
    if (!list.length) return;
    const cards = list.every(l => l[0]?.link);
    if (cards) {
      html += '<ul class="places">' + list.map(l => {
        const [a, ...rest] = l;
        const note = inline(rest).replace(/^\s*:\s*/, '');
        return `<li><a href="${esc(a.link)}"><span><b>${esc(a.text)}</b>${note ? `<i>${note}</i>` : ''}</span></a></li>`;
      }).join('') + '</ul>';
    } else {
      html += '<ul>' + list.map(l => `<li>${inline(l)}</li>`).join('') + '</ul>';
    }
    list = [];
  };
  for (const l of ls) {
    const blank = !l.length || l.every(p => !p.text.trim());
    if (blank) { flushPara(); flushList(); continue; }
    if (isBullet(l)) { flushPara(); list.push(stripBullet(l)); continue; }
    flushList(); para.push(l);
  }
  flushPara(); flushList();
  return html;
}

// Rich text to a single-line HTML string for DeepL, and back
export function richToTranslatable(rich) {
  return pieces(rich).map(p => {
    let h = esc(p.text).replace(/\n/g, '<br>');
    if (p.bold) h = `<b>${h}</b>`;
    if (p.italic) h = `<i>${h}</i>`;
    if (p.link) h = `<a href="${esc(p.link)}">${h}</a>`;
    return h;
  }).join('');
}

const unesc = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

export function translatableToRich(html) {
  const rich = [];
  let bold = false, italic = false, link = null;
  const re = /<(\/?)(b|i|a|br)\b([^>]*)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[4] !== undefined) { rich.push(...seg(unesc(m[4]), { bold, italic, link })); continue; }
    const close = m[1] === '/', tag = m[2];
    if (tag === 'br') { rich.push(...seg('\n', { bold, italic, link })); continue; }
    if (tag === 'b') bold = !close;
    if (tag === 'i') italic = !close;
    if (tag === 'a') link = close ? null : (m[3].match(/href="([^"]*)"/)?.[1] ?? null);
    if (tag === 'a' && link) link = unesc(link);
  }
  return rich;
}
