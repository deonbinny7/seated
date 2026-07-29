import { LIMITS, type SeatLayout, type SeatScore } from '@seated/core';
import { Fragment, type CSSProperties } from 'react';
import { rupees } from '../lib';
import { scoreColor } from './ScoreRing';

interface Props {
  layout: SeatLayout;
  scores: Record<string, SeatScore>;
  selected: string[];
  /** Colour every free seat by its score instead of by state. */
  heat: boolean;
  onSeat: (id: string) => void;
}

/** Classic top-down seat map. The screen is at the top, so left on the map is left in the hall. */
export function SeatMap2D({ layout, scores, selected, heat, onSeat }: Props) {
  let lastCategory = '';
  return (
    <div className="seatmap" style={{ '--cols': layout.cols } as CSSProperties}>
      <div className="screen-arc" aria-hidden="true">Screen this way</div>
      <div className="seat-rows">
        {layout.rows.map((row) => {
          const first = row.cells.find((c) => c);
          const category = first && first.category !== lastCategory ? layout.categories.find((c) => c.id === first.category) : undefined;
          if (first) lastCategory = first.category;
          return (
            <Fragment key={row.label}>
              {category && (
                <div className="category-label">
                  {category.name}: {rupees(category.price)}
                </div>
              )}
              <div className="seat-row">
                <span className="row-label">{row.label}</span>
                {row.cells.map((seat, i) => {
                  if (!seat) return <span key={i} className="gap" />;
                  const s = scores[seat.id];
                  const sold = seat.status !== 'available';
                  const isSelected = selected.includes(seat.id);
                  const cls = sold ? 'sold' : isSelected ? 'selected' : s.score >= LIMITS.bestZoneScore ? 'best' : '';
                  return (
                    <button
                      key={seat.id}
                      className={`seat ${cls}`}
                      disabled={sold}
                      style={heat && !sold && !isSelected ? { background: scoreColor(s.score), borderColor: 'transparent', color: '#0b0b10' } : undefined}
                      title={sold ? `${seat.id} · sold` : `${seat.id} · score ${s.score} · ${rupees(seat.price)}`}
                      aria-label={sold ? `${seat.id}, sold` : `${seat.id}, score ${s.score}${isSelected ? ', selected' : ''}`}
                      aria-pressed={isSelected}
                      onClick={() => onSeat(seat.id)}
                    >
                      {sold ? '×' : seat.num}
                    </button>
                  );
                })}
                <span className="row-label">{row.label}</span>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
