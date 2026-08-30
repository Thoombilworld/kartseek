/**
 * Allowlist sanitizer for seller-authored rich text.
 *
 * Product descriptions are written by sellers and rendered through
 * `dangerouslySetInnerHTML` on a **server** component, so the result is spliced
 * into the SSR'd document. That matters: markup injected by `innerHTML` on the
 * client cannot run `<script>`, but markup that arrives as part of the initial
 * HTML response is parsed normally and runs. The site's CSP does not save us
 * either — `script-src` carries `'unsafe-inline'`, which is exactly what an
 * injected inline script needs.
 *
 * The previous implementation was a denylist: strip `<script>`, `<iframe>`,
 * `on*=` handlers and the literal text `javascript:`. Every denylist of this
 * shape leaks, and this one leaked on all ten payloads it was tested against —
 * an unclosed `<script>` (the regex needed a closing tag), an entity-encoded
 * `&#106;avascript:` href (entities are decoded by the browser *after* the
 * filter ran), `<meta http-equiv=refresh>`, `<base>`, `<form>` and `<style>`
 * (never considered at all).
 *
 * So this works the other way around: walk the string once, and emit a tag only
 * when its name is on an explicit list. Anything unrecognised is escaped and
 * shown as literal text. Attributes are never copied through — the few that are
 * allowed (`href`, `src`) are re-built from a validated value, so an event
 * handler has no path to the output regardless of how it is spelled.
 *
 * This is defence-in-depth for the render path, not a substitute for validating
 * what sellers submit: the API stores these strings verbatim (its
 * InputSanitizerMiddleware logs injection patterns but deliberately does not
 * block), so the same content is still sitting in the database.
 */

/** Formatting tags a product description may use. Attributes are dropped. */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr',
  'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 'u', 's', 'small', 'sub', 'sup',
  'blockquote', 'code', 'pre',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption',
  'span', 'div', 'section', 'article',
]);

/** Tags that take no closing form. */
const VOID_TAGS = new Set(['br', 'hr']);

/** Tags whose *content* is code, not text — dropped wholesale, body included. */
const DROP_WITH_CONTENT = new Set(['script', 'style', 'noscript', 'template', 'svg', 'math']);

function escapeText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fromCodePointSafe(code: number): string {
  return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
}

/**
 * Resolve the entities a browser resolves inside an attribute value.
 *
 * Needed because URL validation has to see what the browser will see:
 * `&#106;avascript:alert(1)` and `java&Tab;script:alert(1)` both resolve to a
 * `javascript:` URL, and testing the raw text for the string "javascript:"
 * misses both. This is why the old filter's `javascript\s*:` rule was bypassable.
 */
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => fromCodePointSafe(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec: string) => fromCodePointSafe(parseInt(dec, 10)))
    .replace(/&tab;?/gi, '\t')
    .replace(/&newline;?/gi, '\n')
    .replace(/&colon;?/gi, ':')
    .replace(/&amp;?/gi, '&');
}

/**
 * Whether a URL may be emitted.
 *
 * An allowlist of schemes rather than a denylist: `javascript:`, `data:`,
 * `vbscript:` and `blob:` are excluded by not being listed, so no spelling of
 * them — entity-encoded, tab-separated, mixed case — can match.
 */
export function isSafeUrl(raw: string): boolean {
  // Control characters and whitespace are stripped first: the HTML parser
  // ignores them inside a scheme, so `java\tscript:` is `javascript:` to it.
  const url = decodeEntities(raw)
    .replace(/[\u0000-\u0020\u007F-\u00A0]/g, '')
    .toLowerCase();

  if (url.startsWith('http://') || url.startsWith('https://')) return true;
  if (url.startsWith('mailto:') || url.startsWith('tel:')) return true;
  // Protocol-relative is off-site — `//evil.example/phish` inherits our scheme
  // and reads like a path. Rejected before the relative-path rule below, which
  // would otherwise wave it through for having no scheme of its own.
  if (url.startsWith('//')) return false;
  if (url.startsWith('/')) return true;
  // A bare relative path is safe as long as it cannot be read as a scheme.
  if (!/^[a-z][a-z0-9+.-]*:/.test(url)) return true;
  return false;
}

/** Pull one attribute's value out of a raw tag's attribute text. */
function readAttr(attrs: string, name: string): string | null {
  const re = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'\`=<>]+))`, 'i');
  const m = re.exec(attrs);
  if (!m) return null;
  return m[1] ?? m[2] ?? m[3] ?? null;
}

/**
 * Sanitize seller-authored HTML down to a safe formatting subset.
 *
 * Allowed: the formatting tags in `ALLOWED_TAGS` with all attributes stripped,
 * `<a href>` and `<img src>` restricted to http(s)/mailto/tel/relative URLs.
 * Everything else is escaped to literal text; `<script>`/`<style>` and friends
 * are dropped along with their contents.
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  let out = '';
  let i = 0;

  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      out += escapeText(html.slice(i));
      break;
    }
    out += escapeText(html.slice(i, lt));

    // Comments and doctypes/CDATA carry no display value — drop them rather
    // than escaping them into visible text.
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith('<!', lt) || html.startsWith('<?', lt)) {
      const end = html.indexOf('>', lt + 2);
      i = end === -1 ? html.length : end + 1;
      continue;
    }

    const gt = html.indexOf('>', lt + 1);
    if (gt === -1) {
      // Unterminated tag — `<script>alert(1)` with no `>` reaches here. Escaping
      // the remainder is what keeps the old "unclosed tag" bypass shut.
      out += escapeText(html.slice(lt));
      break;
    }

    const rawTag = html.slice(lt, gt + 1);
    const parsed = /^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)([\s\S]*?)\/?\s*>$/.exec(rawTag);
    if (!parsed) {
      out += escapeText(rawTag);
      i = gt + 1;
      continue;
    }

    const [, closing, rawName, attrs] = parsed;
    const name = rawName.toLowerCase();

    // Executable containers: skip the element and everything inside it.
    if (DROP_WITH_CONTENT.has(name)) {
      if (closing) { i = gt + 1; continue; }
      const closeRe = new RegExp(`</\\s*${name}\\s*>`, 'i');
      const rest = html.slice(gt + 1);
      const m = closeRe.exec(rest);
      i = m ? gt + 1 + m.index + m[0].length : html.length;
      continue;
    }

    if (closing) {
      // `a` is not in ALLOWED_TAGS because its opening form needs href handling,
      // but its closing form still has to come through or a sanitized link would
      // swallow the rest of the description into the anchor.
      const closable = (ALLOWED_TAGS.has(name) && !VOID_TAGS.has(name)) || name === 'a';
      out += closable ? `</${name}>` : escapeText(rawTag);
      i = gt + 1;
      continue;
    }

    if (ALLOWED_TAGS.has(name)) {
      // Attributes are dropped, not filtered — nothing the seller wrote about
      // this element reaches the page.
      out += VOID_TAGS.has(name) ? `<${name} />` : `<${name}>`;
    } else if (name === 'a') {
      const href = readAttr(attrs, 'href');
      // Outbound links in seller copy are untrusted: no referrer, no window
      // handle back to us, and no SEO credit.
      out += href && isSafeUrl(href)
        ? `<a href="${escapeText(decodeEntities(href))}" target="_blank" rel="noopener noreferrer nofollow">`
        : escapeText(rawTag);
    } else if (name === 'img') {
      const src = readAttr(attrs, 'src');
      const alt = readAttr(attrs, 'alt') ?? '';
      out += src && isSafeUrl(src)
        ? `<img src="${escapeText(decodeEntities(src))}" alt="${escapeText(alt)}" loading="lazy" />`
        : escapeText(rawTag);
    } else {
      out += escapeText(rawTag);
    }

    i = gt + 1;
  }

  return out;
}
