import brotliPromise from 'brotli-wasm';
const limit = 128 * 1024;
self.onmessage = async (event: MessageEvent<unknown>) => {
  try {
    const payload = event.data;
    if (typeof payload !== 'string' || !payload || payload.length >= limit)
      throw new Error('Invalid size');
    const bytes = new TextEncoder().encode(payload);
    if (bytes.length >= limit) throw new Error('Invalid size');
    const tuple = JSON.parse(payload);
    if (!Array.isArray(tuple) || tuple[0] !== 4)
      throw new Error('Invalid schema');
    const brotli = await brotliPromise;
    const compressed = brotli.compress(bytes, { quality: 11 });
    if (compressed.length > 4497) throw new Error('Code too long');
    const code =
      'wl3.' +
      btoa(String.fromCharCode(...compressed))
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replace(/=+$/, '');
    if (code.length > 6000) throw new Error('Code too long');
    self.postMessage({ code });
  } catch {
    self.postMessage({ error: 'encoding_failed' });
  }
};
