import { describe, expect, it } from 'vitest';
import {
  bestBlock, blockAround, buildGeometry, curve, fillAngle, findBlocks, scoreAll,
  type Seat, type SeatLayout,
} from '../src';

/** rows × cols hall with an aisle gap at the given columns. */
function hall(rows: number, cols: number, aisles: number[] = [], sold: string[] = []): SeatLayout {
  const layout: SeatLayout = { cols, rows: [], categories: [{ id: 'std', name: 'Standard', price: 200 }] };
  for (let r = 0; r < rows; r++) {
    const label = String.fromCharCode(65 + r);
    let num = 0;
    const cells: (Seat | null)[] = [];
    for (let c = 0; c < cols; c++) {
      if (aisles.includes(c)) { cells.push(null); continue; }
      num++;
      const id = `${label}${num}`;
      cells.push({ id, rowLabel: label, num, row: r, col: c, category: 'std', price: 200, status: sold.includes(id) ? 'sold' : 'available' });
    }
    layout.rows.push({ label, cells });
  }
  return layout;
}

describe('curve', () => {
  it('interpolates and clamps', () => {
    const pts = [[0, 0], [10, 100]] as const;
    expect(curve(pts, -5)).toBe(0);
    expect(curve(pts, 5)).toBe(50);
    expect(curve(pts, 50)).toBe(100);
  });
});

describe('geometry', () => {
  it('applies the documented defaults', () => {
    const g = buildGeometry(hall(10, 20));
    expect(g.seatingWidth).toBeCloseTo(11.2);
    expect(g.screenWidth).toBeCloseTo(11.2 * 0.85);
    expect(g.frontRowDistance).toBeCloseTo(g.screenWidth * 0.45);
    expect(g.positions.B1.z - g.positions.A1.z).toBeCloseTo(1.05);
    expect(g.positions.B1.eyeY - g.positions.A1.eyeY).toBeCloseTo(0.3);
  });

  it('lets measured values override the estimate', () => {
    const g = buildGeometry(hall(10, 20), { screenWidth: 14, frontRowDistance: 5, measured: true });
    expect(g.screenWidth).toBe(14);
    expect(g.positions.A1.z).toBe(5);
  });
});

describe('scoring', () => {
  it('fill angle matches the closed form on the centre line', () => {
    // On the centre line the screen subtends 2·atan(W / 2z).
    expect(fillAngle(0, 10, 10)).toBeCloseTo((2 * Math.atan(0.5) * 180) / Math.PI);
  });

  it('prefers centred mid-hall seats to front corners', () => {
    const layout = hall(14, 22);
    const scores = scoreAll(buildGeometry(layout));
    expect(scores.I11.score).toBeGreaterThan(85);
    expect(scores.A1.score).toBeLessThan(50);
    expect(scores.I11.score).toBeGreaterThan(scores.I1.score);
    expect(scores.I11.score).toBeGreaterThan(scores.A11.score);
  });

  it('is left-right symmetric', () => {
    const layout = hall(10, 20);
    const scores = scoreAll(buildGeometry(layout));
    expect(scores.F1.score).toBe(scores.F20.score);
  });
});

describe('blocks', () => {
  it('never spans an aisle or a sold seat', () => {
    const layout = hall(10, 21, [10], ['G9']);
    const scores = scoreAll(buildGeometry(layout));
    for (const b of findBlocks(layout, scores, 3)) {
      const cols = b.seatIds.map((id) => layout.rows.flatMap((r) => r.cells).find((s) => s?.id === id)!.col);
      expect(cols[2] - cols[0]).toBe(2);
      expect(b.seatIds).not.toContain('G9');
    }
  });

  it('ranks by average then weakest seat', () => {
    const layout = hall(12, 20);
    const scores = scoreAll(buildGeometry(layout));
    const blocks = findBlocks(layout, scores, 2);
    for (let i = 1; i < 10; i++) expect(blocks[i - 1].avg).toBeGreaterThanOrEqual(blocks[i].avg - 0.5);
    expect(blocks[0].avg).toBeGreaterThan(85);
  });

  it('respects the filters', () => {
    const layout = hall(12, 20);
    const scores = scoreAll(buildGeometry(layout));
    for (const b of findBlocks(layout, scores, 2, { centreOnly: true, notTooClose: true })) {
      for (const id of b.seatIds) {
        expect(scores[id].centreAngle).toBeLessThanOrEqual(13);
        expect(scores[id].fillAngle).toBeLessThanOrEqual(60);
      }
    }
    expect(bestBlock(layout, scores, 2, { maxPrice: 100 })).toBeNull();
  });

  it('picks a block around a tapped seat', () => {
    const layout = hall(10, 20, [], ['F9']);
    const scores = scoreAll(buildGeometry(layout));
    const ids = blockAround(layout, scores, 'F10', 3);
    expect(ids).toEqual(['F10', 'F11', 'F12']);
    expect(blockAround(layout, scores, 'F1', 1)).toEqual(['F1']);
  });
});
