/** Message the page-world reader posts to the panel. Plain data only. */
export const SOURCE = 'seated-reader';
/** Posted by the panel once it is listening, so the reader sends the current seat map again. */
export const PANEL_READY = 'seated-panel-ready';

export interface RawSeat {
  row: string;
  num: string;
  /** Position on the booking site's seat map, in its own pixels. */
  x: number;
  y: number;
  price: number;
  /** The site's price-area code; seats in one area share a category. */
  area: string;
  free: boolean;
}

export interface RawSeatMap {
  title: string;
  seats: RawSeat[];
  /** Where the site draws the screen relative to the seats, if it could be found. */
  screenY: number | null;
  /** Category names read from the map's price headers, e.g. "₹160 GoldStar". */
  categories: { price: number; name: string }[];
}

export interface ReaderMessage {
  source: typeof SOURCE;
  map: RawSeatMap | null;
}
