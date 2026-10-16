/**
 * Saves a photograph to the visitor's device.
 *
 * The bytes are fetched as a blob so the file lands in the downloads folder with its own name
 * rather than opening in a new tab. Where fetching is blocked the plain link still asks the
 * browser to save the file — some browsers honour it.
 */
export async function downloadPhotograph(src: string): Promise<void> {
  if (typeof document === 'undefined' || !src) return;
  const fileName = decodeURIComponent(src.split('/').pop() ?? '') || 'photograph.jpg';
  try {
    if (typeof fetch === 'function') {
      const response = await fetch(src, { mode: 'same-origin' });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        saveLink(url, fileName);
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
        return;
      }
    }
  } catch {
    // Falls back to the plain link below — some browsers still save it.
  }
  saveLink(src, fileName);
}

function saveLink(href: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
