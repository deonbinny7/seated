import { useCallback, useEffect, useRef, useState } from 'react';

/** Fetch JSON from the API, optionally re-fetching on an interval. */
export function useApi<T>(url: string | null, refreshMs?: number) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean; at?: number }>({ loading: !!url });
  const current = useRef(url);
  current.current = url;

  const load = useCallback(async (quiet = false) => {
    if (!url) return;
    if (!quiet) setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      const res = await fetch(url);
      const body = await res.json().catch(() => null);
      if (current.current !== url) return; // a newer request replaced this one
      if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
      setState({ data: body as T, loading: false, at: Date.now() });
    } catch (err) {
      if (current.current !== url) return;
      const message = err instanceof TypeError ? 'Cannot reach the Seated API. Is the server running?' : (err as Error).message;
      // On a background refresh keep showing the last good data.
      setState((s) => (quiet && s.data ? { ...s, loading: false } : { loading: false, error: message }));
    }
  }, [url]);

  useEffect(() => {
    setState({ loading: !!url });
    void load();
    if (!refreshMs) return;
    const timer = setInterval(() => void load(true), refreshMs);
    return () => clearInterval(timer);
  }, [load, refreshMs, url]);

  return { ...state, reload: () => load(true) };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Split a YYYYMMDD key into display parts. */
export function dateParts(key: string) {
  const d = new Date(Date.UTC(+key.slice(0, 4), +key.slice(4, 6) - 1, +key.slice(6, 8)));
  const dow = DAYS[d.getUTCDay()];
  const mon = MONTHS[d.getUTCMonth()];
  return { dow, day: d.getUTCDate(), mon, label: `${dow} ${d.getUTCDate()} ${mon}` };
}

/** "19:15" → "7:15 PM" */
export function fmtTime(t: string): string {
  const h = +t.slice(0, 2);
  return `${h % 12 || 12}:${t.slice(3)} ${h < 12 ? 'AM' : 'PM'}`;
}

export const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export function fmtRuntime(min: number): string {
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

export function fmtLikes(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}K` : String(n);
}

/** "G8, G9, G10" → "G8–G10" */
export function seatRange(ids: string[]): string {
  if (ids.length <= 2) return ids.join(', ');
  return `${ids[0]}–${ids[ids.length - 1]}`;
}

export function savedCity(): string | null {
  try {
    return localStorage.getItem('seated.city');
  } catch {
    return null;
  }
}

export function saveCity(slug: string) {
  try {
    localStorage.setItem('seated.city', slug);
  } catch {
    /* private mode: the choice just won't be remembered */
  }
}
