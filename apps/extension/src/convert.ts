import type { Seat, SeatCategory, SeatLayout } from '@seated/core';
import type { RawSeatMap } from './protocol';

/**
 * Turn seats positioned in the booking site's pixels into Seated's grid:
 * rows ordered from the screen backwards, columns left to right as seen
 * when facing the screen, aisles as empty columns.
 */
export function toLayout(map: RawSeatMap): SeatLayout {
  const xs = [...new Set(map.seats.map((s) => Math.round(s.x)))].sort((a, b) => a - b);
  // Seat pitch: the smallest gap between neighbouring seat positions. Wider gaps are aisles.
  let pitch = Infinity;
  for (let i = 1; i < xs.length; i++) pitch = Math.min(pitch, xs[i] - xs[i - 1]);
  if (!Number.isFinite(pitch) || pitch < 4) pitch = 28;
  const minX = xs[0];
  const maxCol = Math.round((xs[xs.length - 1] - minX) / pitch);

  // Group seats into rows by their vertical position (row labels can repeat across sections).
  const rowYs = [...new Set(map.seats.map((s) => Math.round(s.y)))].sort((a, b) => a - b);
  const meanY = rowYs.reduce((a, b) => a + b, 0) / rowYs.length;
  // BookMyShow draws the screen below the seats. Assume that unless the map says otherwise.
  const screenBelow = map.screenY == null || map.screenY > meanY;
  if (screenBelow) rowYs.reverse();

  const categories: SeatCategory[] = [];
  const categoryFor = (area: string, price: number): SeatCategory => {
    const id = `${area}-${price}`;
    let cat = categories.find((c) => c.id === id);
    if (!cat) {
      const name = map.categories.find((c) => c.price === price)?.name ?? `₹${price}`;
      cat = { id, name, price };
      categories.push(cat);
    }
    return cat;
  };

  const used = new Set<string>();
  const rows = rowYs.map((y, row) => {
    const cells: (Seat | null)[] = Array(maxCol + 1).fill(null);
    let label = '';
    for (const raw of map.seats) {
      if (Math.round(raw.y) !== y) continue;
      label ||= raw.row;
      const drawnCol = Math.round((raw.x - minX) / pitch);
      // With the screen drawn below, the map is seen from the screen's side, so left and right swap.
      const col = screenBelow ? maxCol - drawnCol : drawnCol;
      let id = `${raw.row}${raw.num}`;
      while (used.has(id)) id += "'";
      used.add(id);
      const cat = categoryFor(raw.area, raw.price);
      cells[col] = {
        id, rowLabel: raw.row, num: Number(raw.num) || 0, row, col,
        category: cat.id, price: raw.price, status: raw.free ? 'available' : 'sold',
      };
    }
    return { label, cells };
  });

  return { cols: maxCol + 1, rows, categories };
}
