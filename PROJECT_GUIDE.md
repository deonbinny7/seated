# Seated: complete project guide

This document explains the whole project from top to bottom: what it is, every feature, how the parts fit together, the maths behind the seat score, and what every file does.

Contents

1. [What Seated is](#1-what-seated-is)
2. [Where the idea came from](#2-where-the-idea-came-from)
3. [Features](#3-features)
4. [How to run it](#4-how-to-run-it)
5. [Architecture](#5-architecture)
6. [The scoring engine in depth](#6-the-scoring-engine-in-depth)
7. [The API server in depth](#7-the-api-server-in-depth)
8. [The demo data generator in depth](#8-the-demo-data-generator-in-depth)
9. [The web app in depth](#9-the-web-app-in-depth)
10. [The 3D hall in depth](#10-the-3d-hall-in-depth)
11. [The Chrome extension in depth](#11-the-chrome-extension-in-depth)
12. [Every file, one by one](#12-every-file-one-by-one)
13. [What is tested and what is not](#13-what-is-tested-and-what-is-not)
14. [Known limits and honest caveats](#14-known-limits-and-honest-caveats)
15. [Where it could go next](#15-where-it-could-go-next)
16. [Talking about it in an interview](#16-talking-about-it-in-an-interview)

---

## 1. What Seated is

Ticket-booking sites show you which seats are free. They do not tell you which of the free seats are good.

Seated answers that. It gives every seat in a cinema hall a score from 0 to 100 based on measurable viewing geometry, finds the best group of seats still free together, and lets you look at the screen from that seat in 3D before you book.

It comes in two forms that share one scoring engine:

| Form | What it is | Data it works on |
| --- | --- | --- |
| **Web app** | A full site: pick a city, a film, a show, then a 2D seat map and 3D hall | Generated demo data (see section 8) |
| **Chrome extension** | A panel that appears on BookMyShow's own seat page | The real seat map already on that page |

Seated never sells tickets. The web app links out to booking sites; the extension tells you which seats to click on BookMyShow yourself.

Size: about 3,600 lines of TypeScript, CSS and config across 50 files, in one repository.

---

## 2. Where the idea came from

The project is a study and rebuild of the product idea behind [seats.movie](https://seats.movie). The research was done by observing the public site with browser developer tools (page structure, network requests, what it renders with), following the website workflow of the [REA](https://github.com/morluto/rea) reverse-engineering toolkit. Nothing was decompiled and no protection was bypassed.

What that research found:

- **It is a web app with its own JSON API.** Endpoints for cities, films in a city, showtimes for a film, and a "best" endpoint that takes the ticket count, centre / not-too-close flags, a price cap and batches of venue codes.
- **Its identifiers are BookMyShow's.** Event codes like `ET00517348`, four-letter venue codes, session ids. So its server reads BookMyShow's listings and seat layouts and re-serves them, refreshed every couple of minutes.
- **The 3D hall is three.js on WebGL2,** with a "seat" mode and a "hall" mode. There are no per-cinema 3D models; the room is generated from the seat grid.
- **Booking is a deep link, not an integration.** "Book on BookMyShow" opens BookMyShow's own seat-layout URL: `in.bookmyshow.com/movies/{city}/seat-layout/{event}/{venue}/{session}/{date}`. Payment and seat locking stay on BookMyShow.
- **On BookMyShow and District pages it works through a Chrome extension** that draws its panel over the seat map already loaded in the user's browser.
- **Its scoring method is published** on its "how it works" page: three angles, weighted 42% / 38% / 20%, with stated thresholds and hall-size assumptions. The page does not publish the curves that turn each angle into a sub-score, so those are original to this project.

A second finding came later, from looking at BookMyShow's own seat page: the seat map there is drawn on a canvas, not built from page elements. Section 11 explains how the extension reads it anyway.

---

## 3. Features

### Web app

| Feature | Detail |
| --- | --- |
| City picker | 10 cities. The choice is remembered in the browser. |
| Film list | Films showing in the city, filterable by language and genre. Posters are drawn in code. |
| Film page | Poster, certificate, runtime, counts of shows and cinemas, lowest price, "filling fast" warning. |
| Date strip | Today plus the next six days. |
| Best seats tab | Every show ranked by its best block of N seats together. Each row shows the cinema, time, row and seat numbers, score, and total price. |
| Filters | Seats together (1 to 8), centre seats only, not too close, price cap per ticket, time of day. |
| All shows tab | Cinemas with their showtimes as buttons, coloured for available / filling fast / almost full. |
| Show page | Seat map for one show, with other showtimes at the same cinema one click away. |
| 2D seat map | Outlined free seats, blue "best seats" zone (score 85+), crossed-out occupied seats, purple selection, price-category headers. |
| Score heat map | A toggle that colours every free seat from red to green by its score. |
| Smart selection | Tapping one seat selects the best block of N around it. Changing N re-fits the block. |
| Best seats button | Jumps the selection to the best block in the hall. |
| 3D hall | First-person view from the seat (drag to look around) and whole-hall orbit view. Tap a seat in 3D to select it. |
| 2D / 3D sync | One shared selection. Pick in either view and the other follows. |
| Score card | Score ring, verdict, one-line reason, distance to screen, three angles, three sub-score bars with their weights. |
| Live refresh | The seat map re-reads every two minutes. If a seat you picked gets sold, it is dropped and you are told. |
| Booking bar | Selected seats, category, total, and links to BookMyShow and District. |
| How it works page | The method, with every number read from the scoring code so the page cannot drift from it. |
| Demo-data banner | Always visible, so generated availability is never mistaken for real. |
| Responsive | Seat size adapts to the width available; layouts collapse to one column on narrow screens. |

### Chrome extension

| Feature | Detail |
| --- | --- |
| Best seats button | Appears at the bottom right of a BookMyShow seat page once a seat map is on screen, showing the best score available. |
| Panel | Slides in from the right. Lists the four best blocks from different rows, with score, category and price. |
| Filters | Seats together (1 to 10), centre seats only, not too close. |
| 3D view | The view from the chosen seats, with the film's title on the screen. Same two modes as the web app. |
| Score detail | Verdict, reason, distance, and the three angles. |
| Live updates | Re-reads the page's seat map every 1.5 seconds. If seats sell, the list re-ranks. |
| Isolation | Lives in a shadow root, so BookMyShow's styles and the panel's styles cannot affect each other. |

---

## 4. How to run it

Requires Node.js 20 or later.

```bash
npm install
```

```bash
npm run dev
```

That starts the API on http://localhost:8787 and the web app on http://localhost:5173. Open the second address.

Other commands:

| Command | What it does |
| --- | --- |
| `npm test` | Runs the scoring engine's unit tests |
| `npm run typecheck` | Type-checks all four packages |
| `npm run build` | Production build of the web app |
| `npm run build:extension` | Builds the extension into `apps/extension/dist` |

To install the extension: open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and choose `apps/extension/dist`. Then open any show's seat map on in.bookmyshow.com and choose a ticket count.

---

## 5. Architecture

The repository is an npm-workspaces monorepo with one shared package and three apps.

```
seated/
├─ packages/
│  └─ core/          Scoring engine + shared types. No dependencies. Runs anywhere.
└─ apps/
   ├─ server/        API. Imports core. Talks to a data provider.
   ├─ web/           React site. Imports core. Calls the API.
   └─ extension/     Chrome extension. Imports core and two web components.
```

How data flows in the web app:

```
            ┌─────────────────────────── browser ───────────────────────────┐
            │  React pages ──fetch /api/...──┐                              │
            │       │                        │                              │
            │       ▼                        │                              │
            │  @seated/core                  │                              │
            │  (score seats, fit blocks      │                              │
            │   instantly on every tap)      │                              │
            └────────────────────────────────┼──────────────────────────────┘
                                             ▼
            ┌─────────────────────────── server ────────────────────────────┐
            │  Hono routes ──► ShowtimeProvider (interface)                 │
            │       │                 ▲                                     │
            │       ▼                 │ implemented by                      │
            │  @seated/core      SyntheticProvider (demo data)              │
            │  (rank every show)   …or a real feed later                    │
            └───────────────────────────────────────────────────────────────┘
```

How data flows in the extension:

```
   BookMyShow page (its own JavaScript world)
        │  seat objects held in memory by its canvas library
        ▼
   reader.js  ── window.postMessage ──►  content.js (extension's isolated world)
   (page world, read-only)                    │
                                              ▼
                                   convert pixels → seat grid
                                              ▼
                                   @seated/core scores and ranks
                                              ▼
                                   React panel + 3D view in a shadow root
```

Three design decisions shape everything else:

**1. One scoring engine, used in three places.** `packages/core` is plain TypeScript with no dependencies. The server uses it to rank a film's shows. The web app uses it to score the seat map and re-fit a selection the instant you tap, with no round trip. The extension uses it on BookMyShow's page. One implementation means the three can never disagree about a score.

**2. The data source is behind an interface.** Routes, scoring and UI only ever talk to `ShowtimeProvider`. Today it is implemented by a generator. A licensed feed or a cinema's own system would be a second implementation, with no change to anything else.

**3. Geometry is separate from availability.** A hall's shape is fixed; which seats are sold changes by the minute. The generator builds each hall once and layers per-show availability on top. The scoring engine likewise scores positions, and only the block finder looks at status.

Technology choices:

| Layer | Choice | Why |
| --- | --- | --- |
| Language | TypeScript everywhere | One language lets the scoring engine be shared, not re-implemented |
| Server | Hono on Node | Small, fast, typed JSON responses |
| Web | React 18 + Vite + React Router | Standard, quick dev loop |
| 3D | three.js via React Three Fiber and Drei | 3D scene as React components sharing React state with the 2D map |
| Styling | One plain CSS file with custom properties | No build-time styling dependency |
| Tests | Vitest | Fast, TypeScript-native |
| Extension build | esbuild | Bundles each script into one self-contained file, as Chrome requires |
| Database | None | The demo data is generated deterministically, so nothing needs storing |

---

## 6. The scoring engine in depth

Location: `packages/core/src`. This is the heart of the project.

### Step 1: rebuild the hall in metres (`geometry.ts`)

Booking sites publish a hall's seat grid (rows, columns, aisles) but not its dimensions. `buildGeometry` turns the grid into a room using typical multiplex sizes:

| Assumption | Default |
| --- | --- |
| Seat spacing (centre to centre) | 0.56 m |
| Row depth | 1.05 m |
| Rise per row | 0.30 m |
| Screen width | 85% of the seating width |
| Screen aspect ratio | 2.39 : 1 |
| Front row distance | 0.45 screen-widths from the screen |
| Seated eye height | 1.15 m above the row's floor |
| Screen bottom edge | 1.0 m above the front row's floor |

For each seat it computes a position:

- `x`: metres right of the screen's centre line (negative is left), `(column − middle column) × seat spacing`
- `z`: distance from the screen plane, `front row distance + row index × row depth`
- `floorY`: `row index × rise per row`
- `eyeY`: `floorY + eye height`

Every default can be overridden through `HallSpec`, including a directly measured `screenWidth` and `frontRowDistance`. A spec flagged `measured: true` makes the UI say the hall is measured, not estimated. That is the hook for real cinema data.

### Step 2: measure three angles from each seat (`scoring.ts`)

**Screen fill.** The horizontal angle the screen takes up in your view:

```
fill = atan((W/2 − x) / z) − atan((−W/2 − x) / z)
```

where `W` is screen width. Best near 44°, comfortable from 36° to 55°, and past 60° the picture overflows your view.

**Centring.** How far off the screen's centre line you sit:

```
centre = atan(|x| / z)
```

Under 13° counts as a centre seat.

**Neck angle.** How far you tilt your head up to the middle of the screen:

```
neck = atan((screen centre height − eye height) / z)
```

Under 6° is comfortable. From the back rows the angle goes negative (you look slightly down), which is far more comfortable than looking up, so a downward angle counts at half strength.

### Step 3: turn each angle into a 0–100 sub-score

Each angle runs through a piecewise-linear curve (the `curve` function interpolates between listed points and clamps at the ends):

| Curve | Points (angle → score) |
| --- | --- |
| Fill | 10°→0, 25°→35, 36°→82, 44°→100, 55°→84, 60°→62, 75°→20, 95°→0 |
| Centring | 0°→100, 5°→96, 13°→78, 25°→40, 40°→0 |
| Neck | 0°→100, 6°→90, 15°→60, 25°→25, 35°→0 |

The fill curve is deliberately lopsided: it falls faster on the too-close side than the too-far side, because an overflowing screen is worse than a slightly small one.

### Step 4: blend

```
score = 0.42 × fill + 0.38 × centring + 0.20 × neck      (rounded)
```

Worked example for a centred seat two-thirds of the way back: fill 87, centring 99, neck 97 gives `0.42×87 + 0.38×99 + 0.20×97 = 93.6`, shown as 94.

The result also carries a **verdict** (85+ Excellent, 70+ Good, 55+ Fair, otherwise Compromised) and a **reason** built from whichever thresholds the seat breaks, for example "A little close to the screen; off-centre", or "Sweet spot: centred, and the screen fills your view" when it breaks none.

### Step 5: find seats together (`blocks.ts`)

People book groups, so the real question is the best *block* of N seats.

- `freeRuns` splits a row into runs of seats that can be booked together: physically adjacent (an aisle ends a run), all free, all in one price category.
- `findBlocks` slides a window of N across each run. Each window is scored by its **average**, then by its **weakest seat**, then by price. A window that would strand exactly one free seat beside it is nudged down by half a point, so equal options prefer not leaving an orphan.
- Filters are applied per seat: centre only (centring ≤ 13°), not too close (fill ≤ 60°), and a price cap.
- `bestBlock` returns the top one. `topBlocksByRow` returns the best block from each of several different rows, so a list of options is genuinely varied.
- `blockAround` powers tap-to-select: given the seat you tapped, it returns the best window of N in that seat's run that contains it.

---

## 7. The API server in depth

Location: `apps/server/src`. Built on Hono, runs on port 8787.

| Route | Returns |
| --- | --- |
| `GET /api/meta` | Provider name, whether data is demo, and the film source |
| `GET /api/cities` | The city list |
| `GET /api/movies?city=` | Films showing in a city, most popular first |
| `GET /api/movies/:id/showtimes?city=&date=` | The film, the date, the seven available dates, and each cinema with its shows |
| `GET /api/best/:id?city=&date=&n=&centre=&notClose=&maxPrice=` | The best block of N seats in every show, best show first |
| `GET /api/shows/:id` | One show: film, cinema, city, full seat layout, sibling showtimes, booking links, fetch time |

`/api/best` is the expensive one. For each show of the film it loads the seat layout, builds the geometry, scores every seat and finds the best block. Shows are then ordered by rounded average score, then total price, then start time. Results are cached for two minutes per combination of city, film, date and filters.

Unknown cities, films or shows return a 404 with a short JSON error.

The provider is chosen on one line (`const provider: ShowtimeProvider = new SyntheticProvider()`); nothing else in the file knows which provider it is.

---

## 8. The demo data generator in depth

Location: `apps/server/src/providers/synthetic`.

### Why the data is generated

BookMyShow and District offer no public API. Reading their internal endpoints from a server means working around their bot protection and terms of use, which this project does not do. So the web app runs on generated data that behaves like a live feed, and the real-data path is the extension, which reads the page the user has already opened.

### Why it looks real anyway

Everything comes from **seeded random numbers** (`rng` in `util.ts`): a given seed string always yields the same sequence. So `Aurora Cinemas: Adyar, Screen 3` has the same shape on every request and every day, with no database.

- **Cinemas.** Each city has a list of neighbourhoods. One cinema is placed in each, from seven invented chains. A chain's "premium" level sets its prices and its odds of having a large-format or recliner hall.
- **Halls** (`halls.ts`). Four kinds: `standard`, `wide` (large format), `boutique` (recliner lounge) and `single` (old single-screen with stalls, dress circle and balcony). Each kind has its own range of rows and seats per row, one or two aisles, and price bands from front to back. Front rows lose a seat or two at each end, as real halls do where the walls angle in.
- **Showtimes.** Whether a cinema shows a film, and how many times a day, depends on the film's popularity. Times are drawn from a fixed set of slots. A show's id encodes everything needed to rebuild it: `city~cinema~hall~film~date~time`. That makes ids stateless: the server can resolve any id without storing anything.
- **Prices.** Category base price × city factor × chain factor, then +10% for evening/night, −15% for morning, +10% on weekends, rounded to ₹10.

### How availability moves with the clock

Two functions make shows fill up realistically.

**`occupancy`** gives the share of seats sold right now. Each show has a level it is heading for at start time (popular films, evenings and weekends sell more, plus a seeded jitter). It gets there along a curve that steepens as the show approaches: a show a week out is nearly empty, one starting in an hour is near its final level.

**`sellOrder`** decides *which* seats are sold. Each seat gets a rank from 0 to 1. The rank is 70% "how good the seat is" (better seats sell first) and 30% luck, where neighbours share one luck draw so seats sell in pairs. A seat is sold when its rank is below the current occupancy. Because occupancy only rises with time, a sold seat never comes back.

The result is the pattern you see in a real hall: the centre-back fills first, pairs of sold seats, a scatter of gaps, and the front corners left over.

### Why the cinemas and films are invented

Showing made-up availability against a real cinema's name would misstate that cinema. So chains and film titles in demo mode are fictional, and the UI carries a permanent demo-data banner.

---

## 9. The web app in depth

Location: `apps/web/src`.

### Routing (`App.tsx`)

| Path | Page |
| --- | --- |
| `/` | Home |
| `/how-it-works` | Method page |
| `/:city` | Films in a city |
| `/:city/movies/:movieId` | One film: best seats and all shows |
| `/show/:showId` | One show: seat map and 3D hall |

The show page is loaded lazily, because it pulls in three.js; nobody downloads the 3D code until they open a show.

### Data fetching (`lib.ts`)

`useApi(url, refreshMs)` is the only data-fetching code. It handles loading and error states, ignores responses from a request that has since been replaced, and can re-fetch on an interval. On a background refresh that fails, it keeps showing the last good data instead of flashing an error.

### State on the show page (`ShowPage.tsx`)

The view (`2d` / `3d`) and ticket count live in the URL, so a link reproduces the page. The selection lives in React state:

- `selected`: the seat ids currently chosen
- `viewSeat`: the one seat the 3D camera sits in

Both the 2D map and the 3D hall receive `selected` and report taps through one `onSeat` handler. That single shared state is what keeps the two views in sync.

On first load the page honours seats passed in the link (from the best-seats list) if they are still free, and otherwise picks the best block itself. Every refresh re-checks that the selection is still free.

### Posters (`poster.ts`)

The demo catalogue has no image files. `drawArt` paints a poster onto a canvas from the film's three palette colours and title: a gradient, a glowing disc, a few horizon bands, a dark fade and the title. A seeded random generator keyed on the film id makes each film's composition different but stable. The same function draws the wide image on the 3D cinema screen.

### Look and feel (`styles.css`)

A light, flat ticketing-app style modelled on District's design language: white surfaces, near-black type, the Be Vietnam Pro typeface, one purple accent, bordered chips, rounded-rectangle showtime buttons. The name, logo and all artwork are Seated's own. All colours are custom properties at the top of the file.

---

## 10. The 3D hall in depth

Location: `apps/web/src/components/Hall3D.tsx`.

The hall is built entirely in code from the same `HallGeometry` the scores come from, so what you see and what is scored cannot disagree. Units are metres. The screen is at `z = 0`; seats step up and back from it.

| Part | How it is built |
| --- | --- |
| **Seats** | Two instanced meshes (cushions and backrests). Instancing draws hundreds of seats in two draw calls. Each instance gets a colour: red for free, lighter red for the best zone, dark for sold, purple for selected. |
| **Floor** | One box per row, each 30 cm higher than the last, forming the stepped rake. |
| **Walls and ceiling** | Flat planes that face inward only, so in the whole-hall view you can look in from outside. |
| **Wall lights** | Small glowing boxes along the side walls, following the slope. |
| **Screen** | A plane textured with the film's generated art, self-lit so it glows. |
| **Lighting** | Ambient and sky light, a cool light coming off the screen onto the audience, and dim warm house lights from above and behind so seat tops read clearly. |

**Seat mode** places the camera at the chosen seat's eye point, facing the screen's centre. Dragging turns your head (clamped so you cannot spin unnaturally); "Face the screen" resets it. Moving between seats eases the camera across. The direction you look is computed from the seat's position, so an off-centre seat really does look at the screen at an angle.

**Hall mode** hands the camera to orbit controls: drag to rotate around the room, scroll to zoom.

Tapping a seat works in both modes through raycasting on the instanced meshes. A drag also ends in a click event, so only a tap with almost no pointer movement selects a seat.

---

## 11. The Chrome extension in depth

Location: `apps/extension`.

### The problem

On BookMyShow's seat page, the seat map is not made of page elements. It is drawn on a `<canvas>` with a drawing library called Konva. So there is nothing in the page's HTML to read.

### The solution

Konva keeps every shape it has drawn as an object in memory. On BookMyShow, each seat is a group whose attributes include a `seatObj` with the seat's row letter, display number, price, price-area code and status (1 means available). The extension reads those objects.

It needs two scripts because of how Chrome isolates extensions:

| Script | World | Job |
| --- | --- | --- |
| `reader.js` | The **page's own** JavaScript world | Can see the page's `Konva` object. Reads the seats and posts a plain copy. |
| `content.js` | The extension's **isolated** world | Cannot see page variables, but can draw UI safely. Receives the copy, scores it, draws the panel. |

They talk through `window.postMessage`. The shapes of the messages are defined once in `protocol.ts`.

### Startup handshake

The reader is tiny and starts first; the panel is a large script and starts listening a moment later. Originally the reader sent the seat map once and the panel missed it, so the button never appeared. Now the panel posts a "ready" message when it starts listening, and the reader responds by sending the current map again. This bug was found by testing the extension installed in real Chrome.

### From pixels to a seat grid (`convert.ts`)

The reader reports each seat's position in BookMyShow's own pixels. `toLayout` converts that into Seated's grid:

1. **Seat pitch** is the smallest gap between neighbouring seat x-positions. Any wider gap is an aisle, which becomes empty columns.
2. **Rows** are grouped by y-position, not by row letter, since letters can repeat across sections.
3. **Which end is the screen.** BookMyShow draws the screen below the seats. The reader finds the "All eyes this way" label to confirm. Rows are then ordered from the screen backwards.
4. **Left and right.** With the screen drawn at the bottom, the map is seen from the screen's side, so left and right are swapped relative to someone sitting in the hall. The converter mirrors the columns so the 3D view is physically correct.
5. **Categories** are named from the map's price headers, such as "₹160 GoldStar".

From there it is the same pipeline as the web app: `buildGeometry`, `scoreAll`, `findBlocks`.

### What the extension does not do

- It makes **no network requests** of its own.
- It **changes nothing** on BookMyShow's page and does not click or select seats.
- It **sends nothing anywhere**. All scoring happens in the browser.
- It requests **no special permissions**; it only runs on `in.bookmyshow.com`.

If the seat map cannot be read (because BookMyShow changed its page), the reader reports "no map" and the button simply does not appear.

---

## 12. Every file, one by one

### Root

| File | Purpose |
| --- | --- |
| `package.json` | Declares the workspaces (`packages/*`, `apps/*`) and the top-level scripts: `dev`, `build`, `build:extension`, `test`, `typecheck`. |
| `tsconfig.base.json` | TypeScript settings every package extends: strict mode, modern target, bundler-style module resolution. |
| `.gitignore` | Ignores `node_modules`, build output, `.env`, logs, and the `reference/` folder. |
| `README.md` | Short overview for someone landing on the repository. |
| `PROJECT_GUIDE.md` | This document. |
| `reference/rea/` | A clone of the REA toolkit, kept for study only and git-ignored. Not part of the product; safe to delete. |

### `packages/core` — the scoring engine

| File | Purpose |
| --- | --- |
| `package.json` | Names the package `@seated/core` and points its entry at the TypeScript source, so other packages import it directly with no build step. |
| `tsconfig.json` | Type-check settings for the source and tests. |
| `src/index.ts` | Re-exports everything, so consumers import from `@seated/core`. |
| `src/types.ts` | The engine's data shapes: `Seat`, `SeatLayout`, `SeatCategory`, `HallSpec`, `SeatPosition`, `HallGeometry`, `SeatScore`, `BlockFilters`, `SeatBlock`. |
| `src/geometry.ts` | `DEFAULT_SPEC` (the hall-size assumptions), `allSeats` (flatten a layout), and `buildGeometry` (grid → positions in metres). |
| `src/scoring.ts` | `WEIGHTS`, `LIMITS`, the three sub-score curves, `curve`, `fillAngle`, `scoreSeat`, the reason-sentence builder, and `scoreAll`. |
| `src/blocks.ts` | `findBlocks`, `bestBlock`, `topBlocksByRow`, `blockAround`, and the run-splitting and filter helpers behind them. |
| `src/api.ts` | The shapes the server and web app exchange: `City`, `Movie`, `Cinema`, `ShowSummary`, `MovieShowtimes`, `BestPick`, `BookingLink`, `ShowDetail`, `ApiMeta`. Shared so both sides are checked against the same contract. |
| `test/core.test.ts` | Ten unit tests. See section 13. |

### `apps/server` — the API

| File | Purpose |
| --- | --- |
| `package.json` | Dependencies (Hono, its Node adapter, the core package) and scripts. `tsx` runs TypeScript directly and restarts on change. |
| `tsconfig.json` | Type-check settings with Node types. |
| `src/index.ts` | Creates the app, picks the provider, defines the six routes, holds the two-minute cache for `/api/best`, and starts the server. |
| `src/util.ts` | `hash` and `rng` (seeded randomness), small helpers (`clamp`, `pick`, `between`), time helpers that work in Indian Standard Time (`istNow`, `dateKey`, `upcomingDates`, `minutesUntil`, `isWeekend`, `dayPart`), and `TtlCache`. |
| `src/links.ts` | Booking hand-off. `bmsSeatLayoutUrl` builds BookMyShow's exact seat-page link from its four identifiers. `listingLinks` returns listing-page links for shows that have no such identifiers, which is the case for demo data. |
| `src/providers/types.ts` | The `ShowtimeProvider` interface and `ShowRecord`. The contract any data source must meet. |
| `src/providers/synthetic/data.ts` | The static seed data: 10 cities with neighbourhoods, languages and price factor; 7 invented chains; 16 invented films with palette, genres, languages and popularity. |
| `src/providers/synthetic/halls.ts` | `generateHall`: builds a hall's seat grid from a seed and a hall kind, including aisles, trimmed front rows and price bands. |
| `src/providers/synthetic/index.ts` | `SyntheticProvider`: implements the interface. Generates cinemas, showtimes and ids, and computes occupancy and sell order. |

### `apps/web` — the site

| File | Purpose |
| --- | --- |
| `package.json` | Dependencies: React, React Router, three.js, React Three Fiber, Drei, the core package; Vite for dev and build. |
| `tsconfig.json` | Type-check settings with JSX and browser types. |
| `vite.config.ts` | Dev server on port 5173; forwards `/api` requests to the API on 8787 so the browser sees one origin. |
| `index.html` | The single HTML page: title, description, icon, font link, and the mount point. |
| `src/main.tsx` | Starts React and the router, and loads the stylesheet. |
| `src/App.tsx` | The frame around every page: demo banner, top bar with city selector, the route table, the footer disclaimer. Works out the current city from the URL or the last one chosen. |
| `src/lib.ts` | `useApi`, plus formatting helpers (`dateParts`, `fmtTime`, `rupees`, `fmtRuntime`, `fmtLikes`, `seatRange`) and saved-city helpers that tolerate blocked browser storage. |
| `src/poster.ts` | `drawArt` (paint a poster or wide still on a canvas) and `posterUrl` (cached image for a film). |
| `src/styles.css` | Every style in the web app, organised by section, with colours as custom properties. |
| `src/pages/Home.tsx` | Landing page: headline, city chips, three feature cards. |
| `src/pages/CityPage.tsx` | Film grid for a city with language and genre chips. |
| `src/pages/MoviePage.tsx` | Film header and stats, date strip, best-seats tab with filters and ranked picks, all-shows tab with cinemas and showtime buttons. |
| `src/pages/ShowPage.tsx` | The seat page: toolbar, legend, 2D map or 3D hall, score card, booking bar, and all selection logic. |
| `src/pages/HowItWorks.tsx` | The method, with numbers imported from the scoring engine. |
| `src/components/SeatMap2D.tsx` | The top-down seat map: rows, aisles, category headers, seat states, optional heat-map colouring, accessible labels. |
| `src/components/Hall3D.tsx` | The 3D hall: shell, screen, instanced seats, camera rig for both modes. Also used by the extension. |
| `src/components/ScoreRing.tsx` | The circular score badge and the red-to-green `scoreColor` function. Also used by the extension. |
| `src/components/Stepper.tsx` | The minus / number / plus control. |

### `apps/extension` — the Chrome extension

| File | Purpose |
| --- | --- |
| `package.json` | Dependencies and the `build` script. |
| `tsconfig.json` | Type-check settings. |
| `manifest.json` | Chrome's description of the extension (Manifest V3): name, version, and the two scripts with the site they run on. `reader.js` is marked `"world": "MAIN"` so it runs in the page's world. |
| `build.mjs` | Bundles `reader.ts` and `content.tsx` into single files with esbuild and copies the manifest and test page into `dist/`. |
| `src/protocol.ts` | The message names and data shapes the two scripts exchange: `RawSeat`, `RawSeatMap`, `ReaderMessage`, `SOURCE`, `PANEL_READY`. |
| `src/reader.ts` | Page-world script. Reads seats, price headers, screen position and film title; posts the map when it changes or when the panel says it is ready; re-checks every 1.5 seconds. |
| `src/convert.ts` | `toLayout`: pixel positions → Seated's seat grid. |
| `src/content.tsx` | The panel: launcher button, drawer, filters, block list, 3D view, score detail. Mounts inside a shadow root. |
| `src/panel.css` | The panel's styles, bundled into `content.js` as text and injected into the shadow root. |
| `src/css.d.ts` | Tells TypeScript that importing a `.css` file yields a string. |
| `harness.html` | A local test page that feeds the panel a seat map without Chrome's extension loader. It can also replay a seat map captured from a real page, passed in the URL. |
| `dist/` | Build output. This is the folder Chrome loads. |

---

## 13. What is tested and what is not

### Automated

`npm test` runs ten unit tests on the scoring engine:

- The curve function interpolates and clamps correctly.
- Geometry applies the documented defaults, and measured values override them.
- The fill angle matches the closed-form answer on the centre line.
- A centred mid-hall seat scores above 85, a front corner below 50.
- Scores are left-right symmetric.
- Blocks never span an aisle or a sold seat.
- Blocks come out ranked by average, then weakest seat.
- Filters are respected, and an impossible price cap returns nothing.
- Tap-to-select picks the right block around a seat.

`npm run typecheck` type-checks all four packages.

### Checked by hand in a browser

- Web app: film list, film page, best-seats ranking, all shows, 2D seat map, 3D first-person and whole-hall views, picking a seat in 3D, on a narrow screen.
- Extension panel on a local test page.
- Extension **seat reader on a live BookMyShow seat page**: it read all 272 seats with 234 free, matching the count seats.movie showed for the same show.
- Extension **panel fed that real seat map**: best pick Row T seats 5 and 6, the same two seats seats.movie picked.
- Extension **installed in real Chrome** against a stand-in page served at a BookMyShow address: button appeared, panel listed ranked blocks, 3D view drew, the list re-ranked when seats were marked sold, and changing the seat count worked.

### Not yet verified

- **The installed extension on the real BookMyShow page, both together.** The reader and the installed pipeline were each tested, but in the automated test browser BookMyShow would not load its seat map, so the final combined check has to happen in a normal Chrome with the extension loaded.
- The web app on a wide desktop window after the light restyle (it was checked narrow).
- No automated tests cover the server, the web UI or the extension.

---

## 14. Known limits and honest caveats

- **The web app's data is simulated.** Cinemas, films, showtimes, prices and availability are generated. Only the scoring and the 3D view are real.
- **Hall dimensions are estimates.** Real halls differ in screen size and slope. Distances are approximate; the *ranking between seats in one hall* is the reliable part.
- **The score is a model, not a measurement of preference.** The weights and thresholds follow one published method. People differ: some like the front.
- **Sound, legroom, and seat type are not scored.** A recliner and a standard seat at the same position score the same.
- **The booking links from the web app go to listing pages,** not the exact show, because demo shows have no real identifiers.
- **The extension depends on BookMyShow's page internals.** A redesign there can break it. It only covers BookMyShow, not District.
- **The extension does not highlight seats on BookMyShow's map.** It tells you the row and numbers; you click them.
- **Terms of use.** Check BookMyShow's terms before distributing the extension beyond personal use.
- **Not affiliated** with seats.movie, BookMyShow, District or any cinema chain.

---

## 15. Where it could go next

- Confirm and harden the extension on live pages; add District.
- Highlight the recommended seats directly on the booking site's map.
- Real film titles and posters from TMDB.
- A cinema-operator console: enter measured hall dimensions, see which rows sell first and where seats go unsold.
- Accessibility-aware picks: aisle seats, fewest steps, wheelchair and companion spaces.
- Personal preferences: let a user weight closeness, centring and price themselves.
- Automated tests for the server routes and the extension's converter.

---

## 16. Talking about it in an interview

**One line.** "Seated scores every seat in a cinema by viewing geometry, finds the best seats still free together, and shows the view from them in 3D, as a web app and as a Chrome extension on BookMyShow."

**Why geometry and not machine learning.** There was no labelled data on which seats people prefer, and seat quality is largely measurable: how much of your view the screen fills, how centred you are, how far you tilt your head. A weighted geometric score is explainable, testable, and needs no training data. The engine is structured so the weights could later be learned or personalised.

**The hardest technical problem.** BookMyShow draws its seat map on a canvas, so there was nothing in the page to read. The fix was to read the drawing library's in-memory seat objects from a script in the page's own world, pass a plain copy to the extension's isolated world, and convert pixel positions back into a seat grid, including working out which end the screen is at and mirroring left and right.

**A bug worth telling.** The extension's button never appeared when first installed. The reader sent the seat map before the panel had started listening, and never resent it. It only showed up when testing the installed extension in real Chrome, not on the local test page. The fix was a ready handshake.

**The decision to be proud of.** Not scraping. The web app sits behind a provider interface and runs on generated data that behaves like a live feed; real data comes only from the page the user has already opened. That keeps the project on the right side of the booking sites' terms, and it is the honest answer to "where does your data come from?"

**Two audiences.** Moviegoers want the best seat. Cinema operators want to know which seats sell and which do not. The measured-hall override in the engine and the sell-order model in the generator are the first steps toward the second.
