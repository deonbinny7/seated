import type { HallGeometry, HallSpec, Seat, SeatLayout, SeatPosition } from './types';

/** Typical multiplex dimensions, used when a hall has no measured spec. */
export const DEFAULT_SPEC: HallSpec = {
  seatPitch: 0.56,
  rowDepth: 1.05,
  rake: 0.3,
  screenWidthRatio: 0.85,
  screenAspect: 2.39,
  frontRowRatio: 0.45,
  eyeHeight: 1.15,
  screenBottom: 1.0,
};

export function allSeats(layout: SeatLayout): Seat[] {
  const out: Seat[] = [];
  for (const row of layout.rows) for (const c of row.cells) if (c) out.push(c);
  return out;
}

/** Rebuild the hall in metres from its seat grid. */
export function buildGeometry(layout: SeatLayout, overrides: Partial<HallSpec> = {}): HallGeometry {
  const spec: HallSpec = { ...DEFAULT_SPEC, ...overrides };
  const seatingWidth = layout.cols * spec.seatPitch;
  const screenWidth = spec.screenWidth ?? seatingWidth * spec.screenWidthRatio;
  const screenHeight = screenWidth / spec.screenAspect;
  const frontRowDistance = spec.frontRowDistance ?? screenWidth * spec.frontRowRatio;
  const mid = (layout.cols - 1) / 2;

  const positions: Record<string, SeatPosition> = {};
  layout.rows.forEach((row, r) => {
    const floorY = r * spec.rake;
    const z = frontRowDistance + r * spec.rowDepth;
    for (const seat of row.cells) {
      if (!seat) continue;
      positions[seat.id] = {
        x: (seat.col - mid) * spec.seatPitch,
        floorY,
        eyeY: floorY + spec.eyeHeight,
        z,
      };
    }
  });

  return {
    spec,
    seatingWidth,
    screenWidth,
    screenHeight,
    screenCentreY: spec.screenBottom + screenHeight / 2,
    frontRowDistance,
    depth: frontRowDistance + layout.rows.length * spec.rowDepth,
    positions,
  };
}
