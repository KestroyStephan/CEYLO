/**
 * images.js
 * Wikimedia Commons refuses image requests without a descriptive User-Agent (403 for the
 * default Android client), so every remote image goes through imgSource().
 */
const USER_AGENT = 'CEYLO/1.0 (https://github.com/KestroyStephan/CEYLO; stephankestroy@gmail.com)';

// A real Commons photo used when a place has no image of its own
export const FALLBACK_IMAGE = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Galle_Fort.jpg/960px-Galle_Fort.jpg';

/** Image source with the headers the host requires. */
export function imgSource(uri) {
  if (!uri) return { uri: FALLBACK_IMAGE, headers: { 'User-Agent': USER_AGENT } };
  if (String(uri).includes('wikimedia.org')) return { uri, headers: { 'User-Agent': USER_AGENT } };
  return { uri };
}
