/**
 * images.js
 * Wikimedia Commons refuses image requests without a descriptive User-Agent (403 for the
 * default Android client), so every remote image goes through imgSource().
 */
const USER_AGENT = 'CEYLO/1.0 (https://github.com/KestroyStephan/CEYLO; stephankestroy@gmail.com)';

// Wikimedia serves (and caches) these standard thumbnail widths; others are slower or refused
const WIKI_WIDTHS = [250, 330, 500, 960, 1280];

/**
 * A Wikimedia thumbnail no wider than needed: cards ask for 500 px instead of the 960 px
 * stored in the data, which is about a quarter of the download.
 */
export function sizedUri(uri, width = 500) {
  const s = String(uri || '');
  if (!s.includes('upload.wikimedia.org') || !s.includes('/thumb/')) return uri;
  const w = WIKI_WIDTHS.find(x => x >= width) || 1280;
  return s.replace(/\/(\d+)px-([^/]+)$/, (m, px, file) => (Number(px) > w ? `/${w}px-${file}` : m));
}

/** Image source with the headers the host requires, sized for where it is shown. */
export function imgSource(uri, width) {
  if (!uri) return undefined;   // no photo: callers show a neutral placeholder
  if (String(uri).includes('wikimedia.org')) return { uri: sizedUri(uri, width), headers: { 'User-Agent': USER_AGENT } };
  return { uri };
}
