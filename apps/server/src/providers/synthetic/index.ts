import {
  allSeats, buildGeometry, scoreAll,
  type BookingLink, type Cinema, type City, type Movie, type Seat, type SeatLayout, type ShowSummary,
} from '@seated/core';
import { listingLinks } from '../../links';
import { between, clamp, dayPart, hash, isWeekend, minutesUntil, pick, rng, upcomingDates } from '../../util';
import type { ShowRecord, ShowtimeProvider } from '../types';
import { CHAINS, CITIES, DEMO_MOVIES } from './data';
import { generateHall, type HallKind, type HallTemplate } from './halls';

interface CinemaModel extends Cinema {
  premium: number;
  halls: HallTemplate[];
}

const SLOTS = ['09:15', '10:30', '11:45', '13:00', '14:15', '15:30', '16:45', '18:00', '19:15', '20:30', '21:45', '22:50'];
const SEP = '~';

/**
 * Demo data source. Cities, cinemas, halls, showtimes and seat availability are
 * generated from seeded random numbers, so the whole dataset is stable between
 * requests yet needs no database. Availability is a function of the clock:
 * shows fill up as their start time approaches, best seats first, so the app
 * behaves like one reading a live booking feed.
 */
export class SyntheticProvider implements ShowtimeProvider {
  readonly name = 'synthetic';
  readonly demo = true;
  readonly movieSource = 'demo catalogue';

  private cinemaCache = new Map<string, CinemaModel[]>();
  private sellOrderCache = new Map<string, Map<string, number>>();

  async cities(): Promise<City[]> {
    return CITIES.map(({ slug, name, languages }) => ({ slug, name, languages }));
  }

  async movies(city: City): Promise<Movie[]> {
    return DEMO_MOVIES
      .filter((m) => m.languages.some((l) => city.languages.includes(l)))
      .sort((a, b) => b.popularity - a.popularity);
  }

  async showtimes(city: City, movie: Movie, date: string) {
    const out: { cinema: Cinema; shows: ShowSummary[] }[] = [];
    for (const cinema of this.cinemas(city)) {
      const shows = this.showsAt(city, cinema, movie, date).filter((s) => minutesUntil(date, s.time) > -10);
      if (shows.length) out.push({ cinema: toCinema(cinema), shows });
    }
    return out;
  }

  async show(showId: string): Promise<ShowRecord | null> {
    const [citySlug, cinemaCode, , movieId, date] = showId.split(SEP);
    const city = CITIES.find((c) => c.slug === citySlug);
    const movie = DEMO_MOVIES.find((m) => m.id === movieId);
    if (!city || !movie || !upcomingDates().includes(date)) return null;
    const cinema = this.cinemas(city).find((c) => c.code === cinemaCode);
    const show = cinema && this.showsAt(city, cinema, movie, date).find((s) => s.id === showId);
    if (!cinema || !show) return null;
    return { show, date, movie, cinema: toCinema(cinema), city: { slug: city.slug, name: city.name, languages: city.languages } };
  }

  async seatLayout(record: ShowRecord): Promise<{ layout: SeatLayout }> {
    const hall = this.hallOf(record);
    const occupancy = this.occupancy(record.show.id, record.movie, record.date, record.show.time);
    const order = this.sellOrder(record.show.id, hall);
    const factor = showPriceFactor(record.date, record.show.time);

    const layout: SeatLayout = {
      cols: hall.layout.cols,
      categories: hall.layout.categories.map((c) => ({ ...c, price: round10(c.price * factor) })),
      rows: hall.layout.rows.map((row) => ({
        label: row.label,
        cells: row.cells.map((seat): Seat | null =>
          seat && {
            ...seat,
            price: round10(seat.price * factor),
            status: order.get(seat.id)! < occupancy ? 'sold' : 'available',
          },
        ),
      })),
    };
    return { layout };
  }

  bookingLinks(record: ShowRecord): BookingLink[] {
    return listingLinks(record.city);
  }

  // --- generation ---

  private cinemas(city: City): CinemaModel[] {
    const cached = this.cinemaCache.get(city.slug);
    if (cached) return cached;

    const model = CITIES.find((c) => c.slug === city.slug)!;
    const r = rng(`cinemas:${city.slug}`);
    const areas = [...model.areas].sort(() => r() - 0.5);
    const count = areas.length;
    const used = new Set<string>();

    const cinemas = Array.from({ length: count }, (_, i): CinemaModel => {
      const chain = pick(r, CHAINS);
      const area = areas[i];
      let code = `${chain.short}${area.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase()}`;
      while (used.has(code)) code = `${chain.short}${String.fromCharCode(65 + between(r, 0, 25))}${String.fromCharCode(65 + between(r, 0, 25))}`;
      used.add(code);

      const basePrice = (170 + chain.premium * 120) * model.priceFactor;
      const hallCount = chain.premium < 0.25 ? between(r, 1, 2) : between(r, 3, 6);
      const halls = Array.from({ length: hallCount }, (_, h) => {
        const roll = r();
        const kind: HallKind =
          chain.premium < 0.25 ? 'single'
          : h === 0 && roll < chain.premium ? 'wide'
          : h === hallCount - 1 && roll < chain.premium * 0.7 ? 'boutique'
          : 'standard';
        const name = kind === 'wide' ? 'XL Screen' : kind === 'boutique' ? 'Gold Lounge' : `Screen ${h + 1}`;
        return generateHall(`${code}:${h}`, kind, name, basePrice);
      });

      return { code, name: `${chain.name}: ${area}`, area, city: city.slug, premium: chain.premium, halls };
    });

    this.cinemaCache.set(city.slug, cinemas);
    return cinemas;
  }

  /** Every show of a film at a cinema on a date. Deterministic, so ids stay valid. */
  private showsAt(city: City, cinema: CinemaModel, movie: Movie, date: string): ShowSummary[] {
    const r = rng(`shows:${cinema.code}:${movie.id}`);
    if (r() > 0.3 + movie.popularity * 0.65) return [];

    const daily = rng(`shows:${cinema.code}:${movie.id}:${date}`);
    const want = clamp(Math.round(movie.popularity * 4 + daily() * 2 - 0.5), 1, Math.min(5, cinema.halls.length * 3));
    const slots = [...SLOTS].sort(() => daily() - 0.5).slice(0, want).sort();
    const languages = movie.languages.filter((l) => city.languages.includes(l));

    return slots.map((slot): ShowSummary => {
      const hallIndex = between(daily, 0, cinema.halls.length - 1);
      const hall = cinema.halls[hallIndex];
      const minute = +slot.slice(3) + between(daily, 0, 2) * 5;
      const time = `${slot.slice(0, 2)}:${String(minute).padStart(2, '0')}`;
      const id = [city.slug, cinema.code, hallIndex, movie.id, date, time.replace(':', '')].join(SEP);
      const factor = showPriceFactor(date, time);
      return {
        id,
        cinemaCode: cinema.code,
        time,
        part: dayPart(time),
        format: hall.format,
        language: languages.length ? pick(daily, languages) : movie.languages[0],
        screen: hall.name,
        priceFrom: Math.min(...hall.layout.categories.map((c) => round10(c.price * factor))),
        free: 1 - this.occupancy(id, movie, date, time),
      };
    });
  }

  private hallOf(record: ShowRecord): HallTemplate {
    const [, cinemaCode, hallIndex] = record.show.id.split(SEP);
    return this.cinemas(record.city).find((c) => c.code === cinemaCode)!.halls[+hallIndex];
  }

  /**
   * Share of seats sold right now. Each show has a seeded sell-out level it is
   * heading for (popular films, evenings and weekends sell more), and gets
   * there along a curve that steepens as the show approaches.
   */
  private occupancy(showId: string, movie: Movie, date: string, time: string): number {
    const jitter = (hash(`occ:${showId}`) / 4294967296 - 0.5) * 0.3;
    const part = dayPart(time);
    const boost = (part === 'evening' || part === 'night' ? 0.12 : 0) + (isWeekend(date) ? 0.1 : 0);
    const atShowtime = clamp(0.2 + movie.popularity * 0.55 + boost + jitter, 0.05, 0.96);
    const daysOut = Math.max(0, minutesUntil(date, time)) / (7 * 1440);
    const progress = clamp(1 - daysOut ** 0.35, 0.06, 1);
    return atShowtime * progress;
  }

  /**
   * The order seats sell in, as a 0–1 rank per seat. Better-scoring seats go
   * earlier, and neighbours share a random draw so seats sell in pairs, which
   * leaves the realistic patchwork of couples and gaps.
   */
  private sellOrder(showId: string, hall: HallTemplate): Map<string, number> {
    const cached = this.sellOrderCache.get(showId);
    if (cached) return cached;

    const scores = scoreAll(buildGeometry(hall.layout));
    const seats = allSeats(hall.layout);
    const keyed = seats.map((seat) => {
      const pair = `${showId}:${seat.rowLabel}:${Math.floor(seat.num / 2)}`;
      const luck = hash(pair) / 4294967296;
      return { id: seat.id, key: (1 - scores[seat.id].score / 100) * 0.7 + luck * 0.3 };
    });
    keyed.sort((a, b) => a.key - b.key);

    const order = new Map(keyed.map((s, i) => [s.id, i / keyed.length]));
    if (this.sellOrderCache.size > 400) this.sellOrderCache.clear();
    this.sellOrderCache.set(showId, order);
    return order;
  }
}

const round10 = (n: number) => Math.round(n / 10) * 10;

/** Evening and weekend shows cost a little more. */
function showPriceFactor(date: string, time: string): number {
  const part = dayPart(time);
  return (part === 'morning' ? 0.85 : part === 'afternoon' ? 1 : 1.1) * (isWeekend(date) ? 1.1 : 1);
}

function toCinema({ code, name, area, city }: CinemaModel): Cinema {
  return { code, name, area, city };
}
