/** The maximum encoded image file size accepted by Community photo uploads. */
export const MAX_COMMUNITY_IMAGE_BYTES = 100 * 1024;

const MAX_IMAGE_DIMENSION = 2048;
const SUPPORTED_UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const JPEG_QUALITIES = [0.88, 0.78, 0.68, 0.58, 0.48, 0.38, 0.28, 0.18] as const;

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
}

/**
 * Returns an image file that is guaranteed to be no larger than `maxBytes`.
 * Already-small JPEG, PNG, WebP and GIF files are left byte-for-byte unchanged;
 * larger or browser/API-incompatible image formats are downsampled and encoded as JPEG.
 */
export async function compressCommunityImage(
  file: File,
  maxBytes = MAX_COMMUNITY_IMAGE_BYTES,
): Promise<File> {
  if (!file || file.size <= 0) throw new Error('Please choose a non-empty image file.');
  if (!Number.isFinite(maxBytes) || maxBytes <= 0)
    throw new Error('The image size limit is invalid.');

  const mimeType = canonicalImageMime(file);
  if (!mimeType) {
    throw new Error('Please choose a JPEG, PNG, WebP, or GIF image.');
  }

  if (file.size <= maxBytes && SUPPORTED_UPLOAD_TYPES.has(mimeType)) {
    return mimeType === file.type
      ? file
      : new File([file], filenameForMime(file.name, mimeType), {
          type: mimeType,
          lastModified: file.lastModified,
        });
  }

  const decoded = await decodeImage(file);
  try {
    const longestSide = Math.max(decoded.width, decoded.height);
    if (!Number.isFinite(longestSide) || longestSide <= 0) {
      throw new Error('The selected image has invalid dimensions.');
    }

    let scale = Math.min(1, MAX_IMAGE_DIMENSION / longestSide);
    let width = Math.max(1, Math.round(decoded.width * scale));
    let height = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement('canvas');

    // Reduce quality first, then dimensions. The final small-dimension passes make the
    // byte limit a hard guarantee even for very detailed or unusually large photographs.
    for (let sizePass = 0; sizePass < 32; sizePass++) {
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Your browser could not prepare this image for upload.');

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      // JPEG has no alpha channel. Use a clean white backdrop for transparent PNG/WebP.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(decoded.source, 0, 0, width, height);

      for (const quality of JPEG_QUALITIES) {
        const blob = await canvasToJpegBlob(canvas, quality);
        if (blob.size <= maxBytes) {
          return new File([blob], filenameForMime(file.name, 'image/jpeg'), {
            type: 'image/jpeg',
            lastModified: file.lastModified,
          });
        }
      }

      if (width === 1 && height === 1) break;
      scale *= 0.82;
      width = Math.max(1, Math.floor(decoded.width * scale));
      height = Math.max(1, Math.floor(decoded.height * scale));
    }

    throw new Error('This image could not be reduced below 100 KB. Please choose another photo.');
  } finally {
    decoded.dispose();
  }
}

/** Reads a compressed image file for local previews and data-URL-backed Community posts. */
export function readImageAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('The selected photo could not be read.'));
    };
    reader.onerror = () => reject(new Error('The selected photo could not be read.'));
    reader.readAsDataURL(file);
  });
}

function canonicalImageMime(file: File): string | null {
  const declared = file.type.toLowerCase().split(';', 1)[0].trim();
  if (declared === 'image/jpg') return 'image/jpeg';
  if (declared.startsWith('image/')) return declared;

  const extension = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'avif':
      return 'image/avif';
    case 'bmp':
      return 'image/bmp';
    case 'heic':
    case 'heif':
      return 'image/heic';
    case 'svg':
      return 'image/svg+xml';
    default:
      return null;
  }
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      };
    } catch {
      // Some browsers have createImageBitmap but do not support every image type there.
      // Fall through to the broadly supported HTMLImageElement decoder.
    }
  }

  return new Promise((resolve, reject) => {
    let objectUrl: string;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      reject(new Error('Your browser could not open this image for compression.'));
      return;
    }

    const image = new Image();
    const releaseUrl = () => URL.revokeObjectURL(objectUrl);
    image.onload = () => {
      releaseUrl();
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        dispose: () => undefined,
      });
    };
    image.onerror = () => {
      releaseUrl();
      reject(
        new Error(
          'This image format could not be opened for automatic compression. Please choose a JPEG, PNG, WebP, or GIF photo.',
        ),
      );
    };
    image.src = objectUrl;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== 'function') {
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const payload = dataUrl.split(',', 2)[1];
        if (!payload) throw new Error('Canvas returned an empty image.');
        const bytes = Uint8Array.from(atob(payload), (character) => character.charCodeAt(0));
        resolve(new Blob([bytes], { type: 'image/jpeg' }));
      } catch {
        reject(new Error('Your browser could not encode this image for upload.'));
      }
      return;
    }

    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size === 0) {
          reject(new Error('Your browser could not encode this image for upload.'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality,
    );
  });
}

function filenameForMime(originalName: string, mimeType: string): string {
  const baseName = originalName.replace(/\.[^./\\]+$/, '') || 'community-photo';
  const extension = mimeType === 'image/jpeg' ? '.jpg' : mimeType.split('/')[1];
  return `${baseName}${extension.startsWith('.') ? extension : `.${extension}`}`;
}
