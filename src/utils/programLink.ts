import type { Program } from '../types';
import { validateProgram } from '../storage/localStorage';

const HASH_KEY = 'program=';

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Share URL carrying the program (days only, no history) in the hash. */
export function encodeProgramLink(program: Program, base: string = window.location.href.split('#')[0]): string {
  const payload = { name: program.name, dayOrder: program.dayOrder, days: program.days };
  return `${base}#${HASH_KEY}${toBase64Url(JSON.stringify(payload))}`;
}

/** Parse a program out of a URL hash; null if absent or malformed. */
export function decodeProgramHash(hash: string): Program | null {
  const idx = hash.indexOf(HASH_KEY);
  if (idx === -1) return null;
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(hash.slice(idx + HASH_KEY.length)));
    if (typeof parsed !== 'object' || parsed === null) return null;
    return validateProgram({ id: 'shared', savedAt: new Date().toISOString(), ...(parsed as object) });
  } catch {
    return null;
  }
}
