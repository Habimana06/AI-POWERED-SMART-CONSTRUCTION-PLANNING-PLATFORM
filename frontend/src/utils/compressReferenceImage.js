/**
 * Shrink 3D canvas captures before API upload (avoids nginx 413 / payload limits).
 */
export function compressReferenceImage(dataUri, { maxWidth = 640, quality = 0.72 } = {}) {
  if (!dataUri || typeof dataUri !== 'string') return Promise.resolve(dataUri);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxWidth / (img.width || maxWidth));
        const w = Math.max(1, Math.round((img.width || maxWidth) * scale));
        const h = Math.max(1, Math.round((img.height || maxWidth) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(dataUri);
      }
    };
    img.onerror = () => resolve(dataUri);
    img.src = dataUri;
  });
}

export async function compressReferenceImages(images = [], options) {
  const list = await Promise.all(
    (images || []).filter(Boolean).map((uri) => compressReferenceImage(uri, options)),
  );
  return list;
}
