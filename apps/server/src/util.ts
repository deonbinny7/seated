import type { DayPart } from '@seated/core';

/** Stable 32-bit hash of a string. */
export function hash(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Seeded random generator: the same seed string always yields the same sequence. */
export function rng(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const pick = <T>(r: () => number, items: readonly T[]): T => items[Math.floor(r() * items.length)];
export const between = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

// --- Time. Cinemas run on IST, so "today" and showtimes are computed there. ---

const IST_OFFSET_MS = 5.5 * 3600_000;
const pad = (n: number) => String(n).padStart(2, '0');

/** A Date whose UTC fields read as IST wall-clock time. */
export function istNow(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}

export function dateKey(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/** The next `days` dates starting today, as YYYYMMDD. */
export function upcomingDates(days = 7): string[] {
  const now = istNow();
  return Array.from({ length: days }, (_, i) => dateKey(new Date(now.getTime() + i * 86_400_000)));
}

/** Minutes from now until a show at `date` (YYYYMMDD) and `time` (HH:MM), IST. */
export function minutesUntil(date: string, time: string): number {
  const show = Date.UTC(+date.slice(0, 4), +date.slice(4, 6) - 1, +date.slice(6, 8), +time.slice(0, 2), +time.slice(3, 5));
  return (show - istNow().getTime()) / 60_000;
}

export function isWeekend(date: string): boolean {
  const day = new Date(Date.UTC(+date.slice(0, 4), +date.slice(4, 6) - 1, +date.slice(6, 8))).getUTCDay();
  return day === 0 || day === 6;
}

export function dayPart(time: string): DayPart {
  const h = +time.slice(0, 2);
  return h < 12 ? 'morning' : h < 16 ? 'afternoon' : h < 20 ? 'evening' : 'night';
}

/** Tiny time-to-live cache for computed responses. */
export class TtlCache<T> {
  private store = new Map<string, { at: number; value: T }>();
  constructor(private ttlMs: number, private max = 500) {}

  get(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() - hit.at > this.ttlMs) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T): T {
    if (this.store.size >= this.max) this.store.delete(this.store.keys().next().value!);
    this.store.set(key, { at: Date.now(), value });
    return value;
  }
}
