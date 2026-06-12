import { LIMITS } from './scoring';
import type { BlockFilters, Seat, SeatBlock, SeatLayout, SeatScore } from './types';

function passes(seat: Seat, score: SeatScore, f: BlockFilters): boolean {
  if (seat.status !== 'available') return false;
  if (f.maxPrice != null && seat.price > f.maxPrice) return false;
  if (f.centreOnly && score.centreAngle > LIMITS.centreMax) return false;
  if (f.notTooClose && score.fillAngle > LIMITS.fillTooClose) return false;
  return true;
}

/**
 * Split a row into runs of seats that can be booked together: physically
 * adjacent (no aisle between), all free, all in the same category.
 * Seats that fail the filters still break a run only if they are not free;
 * filtered-out free seats are kept so orphan checks see the real row.
 */
function freeRuns(cells: (Seat | null)[]): Seat[][] {
  const runs: Seat[][] = [];
  let run: Seat[] = [];
  for (const c of cells) {
    const prev = run[run.length - 1];
    if (c && c.status === 'available' && (!prev || prev.category === c.category)) {
      run.push(c);
    } else {
      if (run.length) runs.push(run);
      run = c && c.status === 'available' ? [c] : [];
    }
  }
  if (run.length) runs.push(run);
  return runs;
}

/**
 * Every block of `n` side-by-side seats that passes the filters, best first.
 * Ranked by average score, then by the weakest seat. A block that would strand
 * a single free seat beside it ranks just below an equal one that would not.
 */
export function findBlocks(
  layout: SeatLayout,
  scores: Record<string, SeatScore>,
  n: number,
  filters: BlockFilters = {},
): SeatBlock[] {
  const found: (SeatBlock & { key: number })[] = [];
  for (const row of layout.rows) {
    for (const run of freeRuns(row.cells)) {
      for (let i = 0; i + n <= run.length; i++) {
        const seats = run.slice(i, i + n);
        if (!seats.every((s) => passes(s, scores[s.id], filters))) continue;
        const vals = seats.map((s) => scores[s.id].score);
        const avg = vals.reduce((a, b) => a + b, 0) / n;
        const min = Math.min(...vals);
        const orphanLeft = i === 1;
        const orphanRight = run.length - (i + n) === 1;
        found.push({
          seatIds: seats.map((s) => s.id),
          rowLabel: row.label,
          category: seats[0].category,
          pricePerSeat: seats[0].price,
          avg,
          min,
          key: avg - (orphanLeft || orphanRight ? 0.5 : 0),
        });
      }
    }
  }
  found.sort((a, b) => b.key - a.key || b.min - a.min || a.pricePerSeat - b.pricePerSeat);
  return found.map(({ key: _key, ...block }) => block);
}

export function bestBlock(
  layout: SeatLayout,
  scores: Record<string, SeatScore>,
  n: number,
  filters: BlockFilters = {},
): SeatBlock | null {
  return findBlocks(layout, scores, n, filters)[0] ?? null;
}

/** The best block from each row, for showing a few genuinely different options. */
export function topBlocksByRow(blocks: SeatBlock[], limit: number): SeatBlock[] {
  const seen = new Set<string>();
  const out: SeatBlock[] = [];
  for (const b of blocks) {
    if (seen.has(b.rowLabel)) continue;
    seen.add(b.rowLabel);
    out.push(b);
    if (out.length === limit) break;
  }
  return out;
}

/**
 * The block of `n` seats to select when someone taps one seat: the best-scoring
 * window in that seat's run that contains it. Falls back to the seat alone.
 */
export function blockAround(
  layout: SeatLayout,
  scores: Record<string, SeatScore>,
  seatId: string,
  n: number,
): string[] {
  for (const row of layout.rows) {
    for (const run of freeRuns(row.cells)) {
      const at = run.findIndex((s) => s.id === seatId);
      if (at < 0) continue;
      if (run.length < n) return run.map((s) => s.id);
      let best: Seat[] = [];
      let bestAvg = -1;
      for (let i = Math.max(0, at - n + 1); i <= Math.min(at, run.length - n); i++) {
        const seats = run.slice(i, i + n);
        const avg = seats.reduce((a, s) => a + scores[s.id].score, 0) / n;
        if (avg > bestAvg) {
          bestAvg = avg;
          best = seats;
        }
      }
      return best.map((s) => s.id);
    }
  }
  return [];
}
