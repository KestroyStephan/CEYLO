import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';

// Verification documents: photos or PDF scans, up to 5 MB each
export const MAX_DOC_BYTES = 5 * 1024 * 1024;
const DOC_TYPES = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' };
export const extOf = (asset) => DOC_TYPES[asset.mimeType] || (String(asset.name || asset.uri).split('.').pop() || 'jpg').toLowerCase();
export const isPdf = (asset) => extOf(asset) === 'pdf';
export const fmtSize = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

// Returns null when the file is acceptable, otherwise a [title, message] pair for a toast
export const checkDocument = (asset, { allowPdf = true } = {}) => {
  const ext = extOf(asset);
  const okType = allowPdf ? ['jpg', 'jpeg', 'png', 'pdf'].includes(ext) : ['jpg', 'jpeg', 'png'].includes(ext);
  if (!okType) return ['Unsupported file', allowPdf ? 'Use a JPG or PNG photo, or a PDF.' : 'Use a JPG or PNG photo.'];
  const size = asset.size ?? asset.fileSize;
  if (size && size > MAX_DOC_BYTES) return ['File too large', `This file is ${fmtSize(size)}. The limit is 5 MB.`];
  return null;
};

// Uploads one file and reports its own progress as a fraction from 0 to 1
export const uploadFile = async (asset, storagePath, onFraction) => {
  const res  = await fetch(asset.uri);
  const blob = await res.blob();
  const contentType = asset.mimeType || (isPdf(asset) ? 'application/pdf' : 'image/jpeg');
  const r    = ref(storage, storagePath);
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(r, blob, { contentType });
    task.on('state_changed',
      snap => onFraction && onFraction(snap.totalBytes ? Math.min(1, snap.bytesTransferred / snap.totalBytes) : 0),
      reject,
      async () => { onFraction && onFraction(1); resolve(await getDownloadURL(task.snapshot.ref)); }
    );
  });
};
