import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  bestBlock, buildGeometry, scoreAll,
  type ApiMeta, type BestPick, type BlockFilters, type MovieShowtimes, type ShowDetail,
} from '@seated/core';
import { SyntheticProvider } from './providers/synthetic';
import type { ShowtimeProvider } from './providers/types';
import { TtlCache, upcomingDates } from './util';

// The one place a data source is chosen. Everything below depends only on the interface.
const provider: ShowtimeProvider = new SyntheticProvider();

const app = new Hono();

// In production the web app is served from a different origin (Vercel) than this API (Render).
// The API is public and read-only, so any origin may read it unless ALLOWED_ORIGIN narrows that.
app.use('/api/*', cors({ origin: process.env.ALLOWED_ORIGIN?.split(',') ?? '*' }));

/** Health check for the hosting platform, and a quick way to see the API is awake. */
app.get('/api/health', (c) => c.json({ ok: true }));
app.get('/', (c) => c.text('Seated API. See /api/cities'));
/** Ranking a film scans every show's seat map, so results are kept for two minutes. */
const bestCache = new TtlCache<BestPick[]>(120_000);

async function resolve(citySlug: string | undefined, movieId?: string) {
  const city = (await provider.cities()).find((c) => c.slug === citySlug);
  if (!city) return null;
  const movies = await provider.movies(city);
  return { city, movies, movie: movies.find((m) => m.id === movieId) };
}

function pickDate(raw: string | undefined): string {
  const dates = upcomingDates();
  return raw && dates.includes(raw) ? raw : dates[0];
}

app.get('/api/meta', (c) =>
  c.json<ApiMeta>({ provider: provider.name, demo: provider.demo, movieSource: provider.movieSource }),
);

app.get('/api/cities', async (c) => c.json(await provider.cities()));

app.get('/api/movies', async (c) => {
  const ctx = await resolve(c.req.query('city'));
  if (!ctx) return c.json({ error: 'Unknown city' }, 404);
  return c.json(ctx.movies);
});

app.get('/api/movies/:id/showtimes', async (c) => {
  const ctx = await resolve(c.req.query('city'), c.req.param('id'));
  if (!ctx?.movie) return c.json({ error: 'Unknown city or movie' }, 404);
  const date = pickDate(c.req.query('date'));
  const cinemas = await provider.showtimes(ctx.city, ctx.movie, date);
  return c.json<MovieShowtimes>({ movie: ctx.movie, date, dates: upcomingDates(), cinemas });
});

/**
 * The best block of `n` seats in every show of a film, best show first.
 * Shows rank by their best block's average score, then price, then time.
 */
app.get('/api/best/:id', async (c) => {
  const ctx = await resolve(c.req.query('city'), c.req.param('id'));
  if (!ctx?.movie) return c.json({ error: 'Unknown city or movie' }, 404);

  const date = pickDate(c.req.query('date'));
  const n = Math.min(10, Math.max(1, Number(c.req.query('n')) || 2));
  const maxPrice = Number(c.req.query('maxPrice')) || undefined;
  const filters: BlockFilters = {
    centreOnly: c.req.query('centre') === '1',
    notTooClose: c.req.query('notClose') !== '0',
    maxPrice,
  };

  const key = [ctx.city.slug, ctx.movie.id, date, n, filters.centreOnly, filters.notTooClose, maxPrice].join('|');
  let picks = bestCache.get(key);
  if (!picks) {
    picks = [];
    for (const { cinema, shows } of await provider.showtimes(ctx.city, ctx.movie, date)) {
      for (const show of shows) {
        const record = { show, date, movie: ctx.movie, cinema, city: ctx.city };
        const { layout, hallSpec } = await provider.seatLayout(record);
        const block = bestBlock(layout, scoreAll(buildGeometry(layout, hallSpec)), n, filters);
        if (block) picks.push({ show, cinema, block, total: block.pricePerSeat * n });
      }
    }
    picks.sort((a, b) =>
      Math.round(b.block.avg) - Math.round(a.block.avg) || a.total - b.total || a.show.time.localeCompare(b.show.time),
    );
    bestCache.set(key, picks);
  }
  return c.json(picks);
});

app.get('/api/shows/:id', async (c) => {
  const record = await provider.show(c.req.param('id'));
  if (!record) return c.json({ error: 'Show not found' }, 404);

  const [{ layout, hallSpec }, showtimes] = await Promise.all([
    provider.seatLayout(record),
    provider.showtimes(record.city, record.movie, record.date),
  ]);
  const siblings = showtimes.find((s) => s.cinema.code === record.cinema.code)?.shows ?? [];

  return c.json<ShowDetail>({
    ...record,
    layout,
    hallSpec,
    siblings,
    booking: provider.bookingLinks(record),
    fetchedAt: new Date().toISOString(),
  });
});

const port = Number(process.env.PORT) || 8787;
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () => {
  console.log(`Seated API (${provider.name} provider) listening on port ${port}`);
});
