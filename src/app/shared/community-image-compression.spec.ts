import { afterEach, describe, expect, it, vi } from 'vitest';
import { compressCommunityImage, MAX_COMMUNITY_IMAGE_BYTES } from './community-image-compression';

describe('compressCommunityImage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps an already-small supported image unchanged', async () => {
    const file = new File(['small photo'], 'holiday.jpg', { type: 'image/jpeg' });

    await expect(compressCommunityImage(file)).resolves.toBe(file);
  });

  it('downscales and recompresses a large image until the output is within 100 KB', async () => {
    const source = new File([new Uint8Array(MAX_COMMUNITY_IMAGE_BYTES + 1)], 'large.png', {
      type: 'image/png',
    });
    const bitmap = { width: 4000, height: 3000, close: vi.fn() } as unknown as ImageBitmap;
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));

    const context = {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    let canvas!: HTMLCanvasElement;
    const toBlob = vi.fn((callback: BlobCallback, _type?: string, quality?: number) => {
      // A realistic monotonic stand-in for JPEG encoding size: higher quality and
      // larger dimensions produce more bytes, so the compressor must retry.
      const bytes = Math.max(1, Math.ceil(canvas.width * canvas.height * 0.08 * (quality ?? 1)));
      callback(new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' }));
    });
    canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toBlob,
    } as unknown as HTMLCanvasElement;

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((
      name: string,
      options?: ElementCreationOptions,
    ) => {
      if (name.toLowerCase() === 'canvas') return canvas as unknown as HTMLElement;
      return originalCreateElement(name, options);
    }) as typeof document.createElement);

    const compressed = await compressCommunityImage(source);

    expect(compressed.size).toBeLessThanOrEqual(MAX_COMMUNITY_IMAGE_BYTES);
    expect(compressed.type).toBe('image/jpeg');
    expect(compressed.name).toBe('large.jpg');
    expect(toBlob).toHaveBeenCalled();
    expect(context.drawImage).toHaveBeenCalled();
    expect(bitmap.close).toHaveBeenCalledOnce();
  });
});
