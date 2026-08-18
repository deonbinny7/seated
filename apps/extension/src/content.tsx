import {
  allSeats, blockAround, buildGeometry, findBlocks, scoreAll, topBlocksByRow,
  type Movie, type SeatBlock,
} from '@seated/core';
import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Hall3D, type HallMode } from '../../web/src/components/Hall3D';
import { ScoreRing } from '../../web/src/components/ScoreRing';
import { toLayout } from './convert';
import css from './panel.css';
import { PANEL_READY, SOURCE, type RawSeatMap, type ReaderMessage } from './protocol';

/** Colours for the generated screen art, picked from the film title so each film looks different. */
function paletteFor(title: string): Movie['palette'] {
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return [hex(h, 0.55, 0.14), hex(h, 0.6, 0.34), hex((h + 40) % 360, 0.85, 0.66)];
}

/** HSL to "#rrggbb". The poster drawing code appends alpha digits, so it needs hex colours. */
function hex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

function Panel() {
  const [map, setMap] = useState<RawSeatMap | null>(null);
  const [open, setOpen] = useState(false);
  const [n, setN] = useState(2);
  const [centreOnly, setCentreOnly] = useState(false);
  const [notTooClose, setNotTooClose] = useState(true);
  const [focus, setFocus] = useState<string[]>([]);
  const [viewSeat, setViewSeat] = useState<string | null>(null);
  const [mode, setMode] = useState<HallMode>('seat');
  const [faceKey, setFaceKey] = useState(0);

  // The page-world reader posts the seat map whenever it changes.
  useEffect(() => {
    const onMessage = (e: MessageEvent<ReaderMessage>) => {
      if (e.source !== window || e.data?.source !== SOURCE) return;
      setMap(e.data.map);
    };
    window.addEventListener('message', onMessage);
    window.postMessage({ source: PANEL_READY }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const layout = useMemo(() => (map ? toLayout(map) : null), [map]);
  const hall = useMemo(() => layout && buildGeometry(layout), [layout]);
  const scores = useMemo(() => (hall ? scoreAll(hall) : {}), [hall]);
  const seatById = useMemo(() => new Map(layout ? allSeats(layout).map((s) => [s.id, s]) : []), [layout]);
  const blocks = useMemo(
    () => (layout ? topBlocksByRow(findBlocks(layout, scores, n, { centreOnly, notTooClose }), 4) : []),
    [layout, scores, n, centreOnly, notTooClose],
  );
  const movie = useMemo<Movie>(() => {
    const title = map?.title || 'Now showing';
    return { id: title, title, tagline: '', genres: [], languages: [], runtimeMin: 0, cert: '', popularity: 0, likes: 0, palette: paletteFor(title) };
  }, [map?.title]);

  const show = (ids: string[], seat?: string) => {
    setFocus(ids);
    setViewSeat(seat ?? ids[Math.floor((ids.length - 1) / 2)] ?? null);
  };

  // Keep the previewed seats valid: default to the best block, and move on if they get sold.
  useEffect(() => {
    const stillFree = focus.length > 0 && focus.every((id) => seatById.get(id)?.status === 'available');
    if (!stillFree || focus.length !== n) show(blocks[0]?.seatIds ?? []);
  }, [blocks, seatById]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!layout || !hall) return null;

  const seats = allSeats(layout);
  const free = seats.filter((s) => s.status === 'available').length;
  const seat = viewSeat && scores[viewSeat] ? viewSeat : focus[0];
  const score = seat ? scores[seat] : undefined;
  const describe = (ids: string[]) => {
    const picked = ids.map((id) => seatById.get(id)!).sort((a, b) => a.num - b.num);
    return `Row ${picked[0].rowLabel} · ${picked.length === 1 ? 'seat' : 'seats'} ${picked.map((s) => s.num).join(', ')}`;
  };
  const sameBlock = (b: SeatBlock) => b.seatIds.join() === focus.join();

  if (!open) {
    return (
      <button className="launcher" onClick={() => setOpen(true)}>
        <span className="mark" aria-hidden="true" />
        Best seats{blocks[0] ? ` · score ${Math.round(blocks[0].avg)}` : ''}
      </button>
    );
  }

  return (
    <aside className="drawer" aria-label="Seated seat finder">
      <header>
        <span className="brand"><span className="mark" aria-hidden="true" /> Seated</span>
        <button className="icon" onClick={() => setOpen(false)} aria-label="Close panel">✕</button>
      </header>

      <div className="scroll">
        <p className="dim">{free} of {seats.length} seats free · read from this page’s seat map</p>

        <div className="row">
          <strong>Seats together</strong>
          <div className="stepper">
            <button onClick={() => setN(n - 1)} disabled={n <= 1} aria-label="Fewer seats">−</button>
            <output>{n}</output>
            <button onClick={() => setN(n + 1)} disabled={n >= 10} aria-label="More seats">+</button>
          </div>
        </div>
        <label className="row">
          <span>Centre seats only</span>
          <input type="checkbox" checked={centreOnly} onChange={(e) => setCentreOnly(e.target.checked)} />
        </label>
        <label className="row">
          <span>Not too close</span>
          <input type="checkbox" checked={notTooClose} onChange={(e) => setNotTooClose(e.target.checked)} />
        </label>

        <h3>Best seats still free</h3>
        {blocks.length === 0 && <p className="dim">No {n} free seats together match these filters.</p>}
        <div className="blocks">
          {blocks.map((b, i) => (
            <button key={b.seatIds.join()} className={`block ${sameBlock(b) ? 'on' : ''}`} onClick={() => show(b.seatIds)}>
              <ScoreRing score={Math.round(b.avg)} size={40} />
              <span>
                <strong>{describe(b.seatIds)}</strong>
                <small>{i === 0 ? 'Best pick · ' : ''}{layout.categories.find((c) => c.id === b.category)?.name} · ₹{b.pricePerSeat * n}</small>
              </span>
            </button>
          ))}
        </div>

        {score && seat && (
          <>
            <h3>View from {describe([seat])}</h3>
            <div className="hall">
              <Hall3D
                layout={layout} hall={hall} scores={scores} selected={focus} viewSeat={seat} mode={mode} movie={movie} faceKey={faceKey}
                onSeat={(id) => show(blockAround(layout, scores, id, n), id)}
              />
              <div className="hall-controls">
                <button className={mode === 'seat' ? 'on' : ''} onClick={() => setMode('seat')}>From seat</button>
                <button className={mode === 'hall' ? 'on' : ''} onClick={() => setMode('hall')}>Whole hall</button>
                {mode === 'seat' && <button onClick={() => setFaceKey((k) => k + 1)}>Face screen</button>}
              </div>
            </div>

            <div className="verdict">
              <ScoreRing score={score.score} size={56} />
              <span>
                <strong>{score.verdict}</strong>
                <small>{score.reason}</small>
              </span>
            </div>
            <dl className="metrics">
              <div><dt>To screen</dt><dd>≈{Math.round(score.distance)} m</dd></div>
              <div><dt>Fills view</dt><dd>{Math.round(score.fillAngle)}°</dd></div>
              <div><dt>Off-centre</dt><dd>{Math.round(score.centreAngle)}°</dd></div>
              <div><dt>{score.neckAngle >= 0 ? 'Look up' : 'Look down'}</dt><dd>{Math.abs(Math.round(score.neckAngle))}°</dd></div>
            </dl>
          </>
        )}

        <p className="dim foot">
          To book, pick these seats on the seat map yourself. Hall size is estimated from the seat grid, so distances are approximate.
          Seated is independent and not affiliated with BookMyShow.
        </p>
      </div>
    </aside>
  );
}

// Mount inside a shadow root so the page's styles and ours cannot affect each other.
const host = document.createElement('div');
host.id = 'seated-extension';
const shadow = host.attachShadow({ mode: 'open' });
const style = document.createElement('style');
style.textContent = css;
const mount = document.createElement('div');
shadow.append(style, mount);
document.documentElement.append(host);
createRoot(mount).render(<Panel />);
