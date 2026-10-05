/**
 * images.js
 * Wikimedia Commons refuses image requests without a descriptive User-Agent (403 for the
 * default Android client), so every remote image goes through imgSource().
 */
const USER_AGENT = 'CEYLO/1.0 (https://github.com/KestroyStephan/CEYLO; stephankestroy@gmail.com)';

/** Image source with the headers the host requires. */
export function imgSource(uri) {
  if (!uri) return undefined;   // no photo: callers show a neutral placeholder
  if (String(uri).includes('wikimedia.org')) return { uri, headers: { 'User-Agent': USER_AGENT } };
  return { uri };
}
