export function encodePayload(
  payload: string,
  signal: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('Cancelled'));
      return;
    }
    const worker = new Worker(
      new URL('./compression.worker.ts', import.meta.url),
      { type: 'module' },
    );
    const cleanup = () => {
      clearTimeout(timer);
      worker.terminate();
      signal.removeEventListener('abort', abort);
    };
    const abort = () => {
      cleanup();
      reject(new Error('Cancelled'));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Encoding timed out'));
    }, 5000);
    signal.addEventListener('abort', abort, { once: true });
    worker.onerror = () => {
      cleanup();
      reject(new Error('Encoding failed'));
    };
    worker.onmessage = (event) => {
      cleanup();
      if (
        typeof event.data?.code === 'string' &&
        /^wl3\.[A-Za-z0-9_-]+$/.test(event.data.code) &&
        event.data.code.length <= 6000
      )
        resolve(event.data.code);
      else reject(new Error('Encoding failed'));
    };
    worker.postMessage(payload);
  });
}
export async function writeClipboard(
  value: string,
  write: (value: string) => Promise<void>,
  timeout = 2000,
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      write(value).then(
        () => true,
        () => false,
      ),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), timeout);
      }),
    ]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
