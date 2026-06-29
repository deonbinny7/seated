import type { Seat, SeatCategory, SeatLayout } from '@seated/core';
import { between, rng } from '../../util';

export type HallKind = 'standard' | 'wide' | 'boutique' | 'single';

export interface HallTemplate {
  kind: HallKind;
  name: string;
  format: string;
  /** Seat grid with every seat free; prices are base prices before show adjustments. */
  layout: SeatLayout;
}

interface Band {
  name: string;
  /** Share of rows, front to back. */
  share: number;
  /** Price relative to the hall's base ticket. */
  tier: number;
}

const BANDS: Record<HallKind, Band[]> = {
  standard: [
    { name: 'Classic', share: 0.22, tier: 0.75 },
    { name: 'Prime', share: 0.62, tier: 1 },
    { name: 'Prime Plus', share: 0.16, tier: 1.35 },
  ],
  wide: [
    { name: 'Classic', share: 0.2, tier: 0.8 },
    { name: 'Prime', share: 0.55, tier: 1.1 },
    { name: 'Recliner', share: 0.25, tier: 1.9 },
  ],
  boutique: [{ name: 'Gold Recliner', share: 1, tier: 2.4 }],
  single: [
    { name: 'Front Stalls', share: 0.25, tier: 0.5 },
    { name: 'Dress Circle', share: 0.45, tier: 0.8 },
    { name: 'Balcony', share: 0.3, tier: 1.1 },
  ],
};

const SHAPE: Record<HallKind, { rows: [number, number]; seats: [number, number]; aisles: 1 | 2 | 'either' }> = {
  standard: { rows: [11, 15], seats: [16, 22], aisles: 'either' },
  wide: { rows: [15, 19], seats: [26, 32], aisles: 2 },
  boutique: { rows: [5, 8], seats: [8, 12], aisles: 1 },
  single: { rows: [19, 24], seats: [22, 28], aisles: 1 },
};

const round10 = (n: number) => Math.max(50, Math.round(n / 10) * 10);

/**
 * Generate a hall's seat grid. The same seed always produces the same hall,
 * so a screen keeps its shape across shows and days.
 */
export function generateHall(seed: string, kind: HallKind, name: string, basePrice: number): HallTemplate {
  const r = rng(`hall:${seed}`);
  const shape = SHAPE[kind];
  const rowCount = between(r, ...shape.rows);
  const seatsPerRow = between(r, ...shape.seats) & ~1; // even, so the hall is symmetric
  const aisleCount = shape.aisles === 'either' ? (r() < 0.55 ? 2 : 1) : shape.aisles;

  // Grid columns that are aisles rather than seats.
  const aisles = new Set<number>();
  if (aisleCount === 1) {
    aisles.add(seatsPerRow / 2);
  } else {
    const side = between(r, 4, Math.max(4, Math.floor(seatsPerRow / 5)));
    aisles.add(side);
    aisles.add(seatsPerRow + 1 - side);
  }
  const cols = seatsPerRow + aisles.size;

  // Front rows are often shorter where the walls angle in toward the screen.
  // The front row loses up to two seats at each end, the next row one fewer.
  const maxTrim = kind === 'boutique' ? 0 : between(r, 1, 2);

  const bands = BANDS[kind];
  const categories: SeatCategory[] = bands.map((b) => ({
    id: b.name.toLowerCase().replace(/\s+/g, '-'),
    name: b.name,
    price: round10(basePrice * b.tier),
  }));
  const bandOfRow = (row: number): number => {
    let edge = 0;
    for (let i = 0; i < bands.length; i++) {
      edge += bands[i].share * rowCount;
      if (row < Math.round(edge)) return i;
    }
    return bands.length - 1;
  };

  const layout: SeatLayout = { cols, rows: [], categories };
  for (let row = 0; row < rowCount; row++) {
    const label = String.fromCharCode(65 + row);
    const trim = Math.max(0, maxTrim - row);
    const cat = categories[bandOfRow(row)];
    const cells: (Seat | null)[] = [];
    let num = 0;
    for (let col = 0; col < cols; col++) {
      if (aisles.has(col) || col < trim || col >= cols - trim) {
        cells.push(null);
        continue;
      }
      num++;
      cells.push({ id: `${label}${num}`, rowLabel: label, num, row, col, category: cat.id, price: cat.price, status: 'available' });
    }
    layout.rows.push({ label, cells });
  }

  return { kind, name, format: kind === 'wide' ? 'XL' : kind === 'boutique' ? 'GOLD' : '2D', layout };
}
