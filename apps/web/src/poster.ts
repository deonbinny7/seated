import type { Movie } from '@seated/core';

/**
 * Poster art drawn in code from a film's palette and title, so the demo
 * catalogue needs no image files. A film with real artwork (posterUrl /
 * backdropUrl) uses that instead.
 */

function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function drawArt(canvas: HTMLCanvasElement, movie: Movie, wide: boolean) {
  const ctx = canvas.getContext('2d')!;
  const { width: w, height: h } = canvas;
  const [dark, mid, light] = movie.palette;
  const r = seeded(movie.id);

  const bg = ctx.createLinearGradient(0, 0, w * 0.4, h);
  bg.addColorStop(0, mid);
  bg.addColorStop(1, dark);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // A glowing disc (sun, moon, planet) and a few horizon bands give each film its own look.
  const cx = w * (0.25 + r() * 0.5);
  const cy = h * (wide ? 0.42 : 0.3 + r() * 0.12);
  const radius = Math.min(w, h) * (0.22 + r() * 0.16);
  const glow = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 2.6);
  glow.addColorStop(0, `${light}cc`);
  glow.addColorStop(1, `${light}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  const bands = 4 + Math.floor(r() * 3);
  for (let i = 0; i < bands; i++) {
    const y = h * (0.5 + (i / bands) * 0.5);
    ctx.fillStyle = i % 2 ? `${dark}d0` : `${mid}90`;
    ctx.beginPath();
    ctx.moveTo(0, y + r() * h * 0.06);
    for (let x = 0; x <= w; x += w / 6) ctx.lineTo(x, y + (r() - 0.5) * h * 0.09);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();
  }

  const shade = ctx.createLinearGradient(0, h * 0.45, 0, h);
  shade.addColorStop(0, '#00000000');
  shade.addColorStop(1, '#000000d8');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);

  const size = wide ? h * 0.15 : w * 0.125;
  ctx.font = `800 ${size}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  const pad = w * (wide ? 0.05 : 0.08);
  const lines = wrap(ctx, movie.title, w - pad * 2);
  lines.forEach((line, i) => ctx.fillText(line, pad, h - pad - (lines.length - 1 - i) * size * 1.08));
}

const cache = new Map<string, string>();

/** Data URL of a film's portrait poster. */
export function posterUrl(movie: Movie): string {
  if (movie.posterUrl) return movie.posterUrl;
  let url = cache.get(movie.id);
  if (!url) {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 600;
    drawArt(canvas, movie, false);
    url = canvas.toDataURL('image/jpeg', 0.85);
    cache.set(movie.id, url);
  }
  return url;
}
