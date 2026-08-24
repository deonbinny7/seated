# Seated

Find the best cinema seats still free for any show, and see the view from them in 3D before you book.

Seated is a study and rebuild of the product idea behind [seats.movie](https://seats.movie): a seat **recommendation** layer that sits on top of ticket booking. Booking sites show which seats are free; Seated answers which free seats are actually good, and lets you sit in them first.

## What it does

- **City → film → show** discovery across 10 cities, with date, time-of-day and price filters.
- **Best seats for a film**: scores every free seat in every show, then ranks shows by their best block of N seats side by side (no aisle or sold seat between).
- **2D seat map** with a best-view zone and an optional score heat map.
- **3D hall**, generated in code from the seat grid: a first-person view from any seat (drag to look around) and a whole-hall orbit view. Tap a seat in either view; 2D and 3D share one selection.
- **Explainable score**: each seat shows its three angles, three sub-scores and a one-line reason.
- **Booking hand-off** to BookMyShow / District. Seated never sells tickets.

## Run it

Requires Node 20+.

```bash
npm install
npm run dev
```

Open http://localhost:5173. The API runs on http://localhost:8787.

```bash
npm test          # scoring-engine unit tests
npm run typecheck
```

## How it is built

```
packages/core    Scoring engine, shared by server and browser (TypeScript, no dependencies)
  geometry.ts    seat grid → hall in metres
  scoring.ts     three angles → 0–100 score with a reason
  blocks.ts      best run of N adjacent seats, with filters
apps/server      Hono API: cities, films, showtimes, /best ranking, seat maps
  providers/     ShowtimeProvider interface + the demo data provider
apps/web         React + Vite; three.js via React Three Fiber for the hall
apps/extension   Chrome extension: the same scoring and 3D view on BookMyShow's own seat page
```

The scoring engine is one package used on both sides: the server uses it to rank a film's shows, the browser uses it to score and re-fit a selection instantly as you tap seats.

### The score

| Factor | Weight | Measures | Comfortable range |
| --- | --- | --- | --- |
| Screen fill | 42% | Horizontal angle the screen subtends | 36–55°, best near 44°; over 60° is too close |
| Centring | 38% | Angle off the screen's centre line | under 13° |
| Neck angle | 20% | Upward tilt to the screen centre | under 6° |

Each angle maps to a 0–100 sub-score on a piecewise-linear curve that peaks in the comfortable range. The weights and thresholds follow seats.movie's published method page; the sub-score curves are my own, since that page does not publish them.

Halls are rebuilt from the seat grid with typical multiplex dimensions (56 cm seat pitch, 1.05 m row depth, 30 cm rise per row, screen 85% of seating width at 2.39:1, front row 0.45 screen-widths back, eye height 1.15 m). `HallSpec` accepts measured overrides, so an exhibitor's real dimensions replace the estimate without code changes.

## Chrome extension for BookMyShow

On a BookMyShow seat-layout page the extension adds a "Best seats" button. Its panel lists the best blocks of seats still free, scores them, and shows the 3D view from them, using the live seat map on the page.

```bash
npm run build:extension
```

Then in Chrome: open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**, and select `apps/extension/dist`. Open any show's seat map on in.bookmyshow.com.

How it reads the seats: BookMyShow draws its seat map on a canvas (with the Konva library), so there are no seat elements in the page to read. Konva keeps each drawn seat as an object in memory, carrying its row, number, price and status. A small page-world script (`src/reader.ts`) reads those objects and passes a plain copy to the panel. It makes no network requests of its own, changes nothing on the page, and sends nothing anywhere: scoring happens in the browser. You still pick and pay for the seats on BookMyShow yourself.

It depends on BookMyShow's page internals, so a redesign on their side can break it; when the seat map cannot be read, the button simply does not appear. Check BookMyShow's terms before distributing it beyond personal use.

`apps/extension/harness.html` is a local test page that feeds the panel a seat map without Chrome's extension loader.

## What I learned from studying seats.movie

Observed from the public site with browser dev tools (page structure, network requests, rendering context), following the website workflow of the [REA](https://github.com/morluto/rea) reverse-engineering toolkit. Nothing was decompiled or bypassed.

- It is a Nuxt app with its own JSON API: cities, films per city, showtimes per film, and a `best` endpoint that takes ticket count, centre/not-too-close flags, a price cap and batches of venue codes.
- Its identifiers are BookMyShow's (event codes like `ET…`, four-letter venue codes, session ids), so its server reads BookMyShow's listings and seat layouts and re-serves them, refreshed every couple of minutes.
- The 3D hall is three.js (WebGL2) with a "seat" mode and a "hall" mode. No per-cinema 3D models: the room is generated from the seat grid.
- **Booking is a deep link, not an integration.** The "Book on BookMyShow" button opens BookMyShow's own seat-layout URL built from event, venue, session and date. Payment and seat locking stay on BookMyShow.
- On BookMyShow and District themselves, it works through a Chrome extension that draws its panel over the seat map already loaded in the user's browser.

## Data: what is real and what is simulated

BookMyShow and District have no public API, and reading their internal endpoints from a server means working around their bot protection and terms. Seated does not do that. Instead:

- Everything talks to a `ShowtimeProvider` interface (`apps/server/src/providers/types.ts`).
- The shipped provider generates cities' cinemas, halls, showtimes and availability from seeded random numbers. It is deterministic, needs no database, and availability moves with the clock (shows fill as they approach, best seats first), so the app behaves as it would on a live feed.
- Cinema chains and films in demo mode are invented, and the UI carries a "Demo data" banner, so generated availability is never presented as a real cinema's.
- Booking buttons open the platforms' listing pages. `links.ts` also holds the exact seat-layout deep-link builder, ready for a provider that carries real platform identifiers (a licensed feed or an exhibitor's own system).

## Where it could go next

- Extend the extension to District, and highlight the recommended seats on the site's own map.
- An exhibitor console: enter measured hall dimensions, see which rows sell first and where seats go unsold.
- Accessibility-aware picks: aisle seats, fewest steps, companion seating.
- Real film metadata from TMDB.

## Disclaimer

Independent project for learning. Not affiliated with seats.movie, BookMyShow, District or any cinema chain.
