import type { HallGeometry, SeatPosition, SeatScore } from './types';

/** How much each factor counts toward the final score. */
export const WEIGHTS = { fill: 0.42, centre: 0.38, neck: 0.2 } as const;

/** Thresholds the filters and explanations are built on, in degrees. */
export const LIMITS = {
  fillIdealMin: 36,
  fillBest: 44,
  fillIdealMax: 55,
  fillTooClose: 60,
  centreMax: 13,
  neckComfort: 6,
  bestZoneScore: 85,
} as const;

const deg = (rad: number) => (rad * 180) / Math.PI;

/** Piecewise-linear curve through [x, y] points sorted by x; clamped at both ends. */
export function curve(points: readonly (readonly [number, number])[], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    if (x <= x1) {
      const [x0, y0] = points[i - 1];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return points[points.length - 1][1];
}

// Sub-score curves. Each peaks in the comfortable range and falls away outside it,
// faster on the side that hurts more (too close is worse than slightly far).
const FILL_CURVE = [[10, 0], [25, 35], [36, 82], [44, 100], [55, 84], [60, 62], [75, 20], [95, 0]] as const;
const CENTRE_CURVE = [[0, 100], [5, 96], [13, 78], [25, 40], [40, 0]] as const;
const NECK_CURVE = [[0, 100], [6, 90], [15, 60], [25, 25], [35, 0]] as const;

/** Horizontal angle subtended by the screen from a seat, degrees. */
export function fillAngle(x: number, z: number, screenWidth: number): number {
  const half = screenWidth / 2;
  return deg(Math.atan((half - x) / z) - Math.atan((-half - x) / z));
}

export function scoreSeat(pos: SeatPosition, hall: HallGeometry): SeatScore {
  const fill = fillAngle(pos.x, pos.z, hall.screenWidth);
  const centre = deg(Math.atan(Math.abs(pos.x) / pos.z));
  const dy = hall.screenCentreY - pos.eyeY;
  const neck = deg(Math.atan(dy / pos.z));
  // Looking slightly down from the back is far more comfortable than looking up.
  const neckStrain = neck >= 0 ? neck : -neck * 0.5;

  const parts = {
    fill: curve(FILL_CURVE, fill),
    centre: curve(CENTRE_CURVE, centre),
    neck: curve(NECK_CURVE, neckStrain),
  };
  const score = Math.round(
    parts.fill * WEIGHTS.fill + parts.centre * WEIGHTS.centre + parts.neck * WEIGHTS.neck,
  );

  return {
    score,
    fillAngle: fill,
    centreAngle: centre,
    neckAngle: neck,
    distance: Math.hypot(pos.x, dy, pos.z),
    parts,
    verdict:
      score >= LIMITS.bestZoneScore ? 'Excellent view'
      : score >= 70 ? 'Good view'
      : score >= 55 ? 'Fair view'
      : 'Compromised view',
    reason: explain(fill, centre, neck),
  };
}

/** One plain sentence saying why the seat scored the way it did. */
function explain(fill: number, centre: number, neck: number): string {
  const issues: string[] = [];
  if (fill > LIMITS.fillTooClose) issues.push('too close, the screen overflows your view');
  else if (fill > LIMITS.fillIdealMax) issues.push('a little close to the screen');
  else if (fill < 28) issues.push('far back, the screen looks small');
  else if (fill < LIMITS.fillIdealMin) issues.push('a little far from the screen');
  if (centre > 22) issues.push('well off to the side');
  else if (centre > LIMITS.centreMax) issues.push('off-centre');
  if (neck > 15) issues.push('you look up steeply');
  else if (neck > LIMITS.neckComfort) issues.push('you look up a little');

  if (issues.length === 0) return 'Sweet spot: centred, and the screen fills your view';
  const text = issues.join('; ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function scoreAll(hall: HallGeometry): Record<string, SeatScore> {
  const out: Record<string, SeatScore> = {};
  for (const id in hall.positions) out[id] = scoreSeat(hall.positions[id], hall);
  return out;
}
