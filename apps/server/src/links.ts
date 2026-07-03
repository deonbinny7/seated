import type { BookingLink, City } from '@seated/core';

/**
 * Booking hand-off. Seated never sells tickets; it sends the user to the
 * booking platform to pay, the same way seats.movie does.
 *
 * Observed on seats.movie: its "Book on BookMyShow" button is a plain link to
 * BookMyShow's public seat-layout page, built from four BookMyShow identifiers
 * (event code, venue code, session id, date). No booking API is involved.
 */

/** BookMyShow's city slugs differ from ours in a few places. */
const BMS_CITY: Record<string, string> = {
  'delhi-ncr': 'national-capital-region-ncr',
};

/** Exact seat-map deep link, for providers that carry BookMyShow's own identifiers. */
export function bmsSeatLayoutUrl(city: string, eventCode: string, venueCode: string, sessionId: string, date: string): string {
  return `https://in.bookmyshow.com/movies/${BMS_CITY[city] ?? city}/seat-layout/${eventCode}/${venueCode}/${sessionId}/${date}`;
}

/** Listing-page links, used when a show has no platform identifiers (demo data). */
export function listingLinks(city: City): BookingLink[] {
  return [
    { platform: 'BookMyShow', url: `https://in.bookmyshow.com/explore/movies-${BMS_CITY[city.slug] ?? city.slug}`, exact: false },
    { platform: 'District', url: 'https://www.district.in/movies/', exact: false },
  ];
}
