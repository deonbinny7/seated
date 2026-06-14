import type { HallSpec, SeatBlock, SeatLayout } from './types';

/** Shapes exchanged between the API server and the web app. */

export interface City {
  slug: string;
  name: string;
  languages: string[];
}

export interface Movie {
  id: string;
  title: string;
  tagline: string;
  genres: string[];
  languages: string[];
  runtimeMin: number;
  cert: string;
  /** 0–1, drives how many shows a film gets and how fast they fill. */
  popularity: number;
  likes: number;
  /** Three colours used to draw generated poster art. */
  palette: [string, string, string];
  posterUrl?: string;
  backdropUrl?: string;
}

export interface Cinema {
  code: string;
  name: string;
  area: string;
  city: string;
}

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

export interface ShowSummary {
  id: string;
  cinemaCode: string;
  /** 24-hour "HH:MM", local cinema time (IST). */
  time: string;
  part: DayPart;
  format: string;
  language: string;
  screen: string;
  priceFrom: number;
  /** Share of seats still free, 0–1. */
  free: number;
}

export interface MovieShowtimes {
  movie: Movie;
  /** YYYYMMDD */
  date: string;
  dates: string[];
  cinemas: { cinema: Cinema; shows: ShowSummary[] }[];
}

export interface BestPick {
  show: ShowSummary;
  cinema: Cinema;
  block: SeatBlock;
  total: number;
}

export interface BookingLink {
  platform: 'BookMyShow' | 'District';
  url: string;
  /** True when the link opens this exact show's seat map, false for a listing page. */
  exact: boolean;
}

export interface ShowDetail {
  show: ShowSummary;
  date: string;
  movie: Movie;
  cinema: Cinema;
  city: City;
  layout: SeatLayout;
  /** Present when the hall has measured dimensions; otherwise defaults apply. */
  hallSpec?: Partial<HallSpec>;
  /** Other showtimes of this film at this cinema on this date. */
  siblings: ShowSummary[];
  booking: BookingLink[];
  fetchedAt: string;
}

export interface ApiMeta {
  provider: string;
  /** True when shows and availability are generated rather than read from a booking platform. */
  demo: boolean;
  movieSource: string;
}
