/**
 * Lightweight device fingerprint. Stable per browser+os, not a security
 * boundary on its own — combined with server-side session validation it
 * is good enough for "max 2 devices" policy on a school platform.
 */
export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'ssr';
  const stored = localStorage.getItem('mrass:device_fp');
  if (stored) return stored;

  const parts = [
    navigator.userAgent,
    navigator.language,
    String(navigator.hardwareConcurrency ?? 0),
    String((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0),
    new Date().getTimezoneOffset(),
    screen.width + 'x' + screen.height,
    screen.colorDepth,
  ];
  const fp = simpleHash(parts.join('|'));
  localStorage.setItem('mrass:device_fp', fp);
  return fp;
}

function simpleHash(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}
