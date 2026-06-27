import type { BookingLink, Cinema, City, HallSpec, Movie, SeatLayout, ShowSummary } from '@seated/core';

export interface ShowRecord {
  show: ShowSummary;
  date: string;
  movie: Movie;
  cinema: Cinema;
  city: City;
}

/**
 * Everything the app needs from a source of cinema data. The scoring engine,
 * API routes and UI only ever talk to this interface, so the data source can
 * be swapped without touching them: generated demo data today, an exhibitor
 * or ticketing-partner feed when one is licensed.
 */
export interface ShowtimeProvider {
  readonly name: string;
  /** True when shows and availability are generated rather than live. */
  readonly demo: boolean;
  readonly movieSource: string;

  cities(): Promise<City[]>;
  movies(city: City): Promise<Movie[]>;
  /** Cinemas showing the film on the date, each with its shows. */
  showtimes(city: City, movie: Movie, date: string): Promise<{ cinema: Cinema; shows: ShowSummary[] }[]>;
  /** Resolve a show id back to its full record, or null if it does not exist. */
  show(showId: string): Promise<ShowRecord | null>;
  /** The hall's seat grid with current availability. */
  seatLayout(record: ShowRecord): Promise<{ layout: SeatLayout; hallSpec?: Partial<HallSpec> }>;
  /** Where to send the user to actually buy the tickets. */
  bookingLinks(record: ShowRecord): BookingLink[];
}
