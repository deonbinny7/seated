import {
  allSeats, bestBlock, blockAround, buildGeometry, scoreAll, WEIGHTS,
  type ShowDetail,
} from '@seated/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Hall3D, type HallMode } from '../components/Hall3D';
import { ScoreRing } from '../components/ScoreRing';
import { SeatMap2D } from '../components/SeatMap2D';
import { Stepper } from '../components/Stepper';
import { dateParts, fmtTime, rupees, useApi } from '../lib';
import { posterUrl } from '../poster';

export default function ShowPage() {
  const { showId } = useParams();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === '3d' ? '3d' : '2d';
  const n = Math.min(8, Math.max(1, Number(params.get('n')) || 2));

  // Seat maps go stale quickly, so re-read every two minutes.
  const detail = useApi<ShowDetail>(`/api/shows/${encodeURIComponent(showId!)}`, 120_000);
  const data = detail.data;

  const [selected, setSelected] = useState<string[]>([]);
  const [viewSeat, setViewSeat] = useState<string | null>(null);
  const [mode, setMode] = useState<HallMode>('seat');
  const [faceKey, setFaceKey] = useState(0);
  const [heat, setHeat] = useState(false);
  const [notice, setNotice] = useState('');

  const hall = useMemo(() => data && buildGeometry(data.layout, data.hallSpec), [data]);
  const scores = useMemo(() => (hall ? scoreAll(hall) : {}), [hall]);
  const seatById = useMemo(() => new Map(data ? allSeats(data.layout).map((s) => [s.id, s]) : []), [data]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };

  const choose = (ids: string[]) => {
    setSelected(ids);
    setViewSeat(ids[Math.floor((ids.length - 1) / 2)] ?? null);
    setNotice('');
  };

  const chooseBest = () => {
    if (!data) return;
    const block = bestBlock(data.layout, scores, n, { notTooClose: true }) ?? bestBlock(data.layout, scores, n);
    if (block) choose(block.seatIds);
    else {
      choose([]);
      setNotice(`No ${n} seats are free together in this show.`);
    }
  };

  // First load of a show: honour seats passed in the link if they are still free, else pick the best.
  const initialised = useRef<string>();
  useEffect(() => {
    if (!data || initialised.current === data.show.id) return;
    initialised.current = data.show.id;
    const wanted = (params.get('seats') ?? '').split(',').filter((id) => seatById.get(id)?.status === 'available');
    if (wanted.length) choose(wanted);
    else chooseBest();
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // A refresh can reveal that someone else took a selected seat.
  useEffect(() => {
    if (!data || !selected.length) return;
    const still = selected.filter((id) => seatById.get(id)?.status === 'available');
    if (still.length !== selected.length) {
      choose(still);
      setNotice('A seat you picked was just sold. Pick again or tap Best seats.');
    }
  }, [seatById]); // eslint-disable-line react-hooks/exhaustive-deps

  if (detail.error) return <p className="notice error">{detail.error} <Link to="/">Back to films</Link></p>;
  if (!data || !hall) return <p className="notice">Loading the seat map…</p>;

  const { show, movie, cinema, city, layout } = data;
  const seats = allSeats(layout);
  const free = seats.filter((s) => s.status === 'available').length;
  const picked = selected.map((id) => seatById.get(id)!).filter(Boolean);
  const total = picked.reduce((sum, s) => sum + s.price, 0);
  const focus = viewSeat && scores[viewSeat] ? viewSeat : selected[0];
  const score = focus ? scores[focus] : undefined;
  const avg = picked.length ? Math.round(picked.reduce((a, s) => a + scores[s.id].score, 0) / picked.length) : 0;
  const category = (id: string) => layout.categories.find((c) => c.id === id)?.name ?? id;

  const onSeat = (id: string) => {
    if (selected.includes(id)) {
      setViewSeat(id);
      return;
    }
    const block = blockAround(layout, scores, id, n);
    choose(block);
    setViewSeat(id);
    if (block.length < n) setNotice(`Only ${block.length} free ${block.length === 1 ? 'seat' : 'seats'} together there.`);
  };

  const changeN = (value: number) => {
    setParam('n', String(value));
    // Re-fit the selection around the same spot.
    const anchor = viewSeat ?? selected[0];
    if (anchor) choose(blockAround(layout, scores, anchor, value));
  };

  return (
    <div className="page show-page">
      <Link to={`/${city.slug}/movies/${movie.id}?date=${data.date}`} className="back">← All shows</Link>

      <header className="show-head">
        <img className="poster small" src={posterUrl(movie)} alt="" />
        <div>
          <h1 className="page-title">{movie.title}</h1>
          <p>{cinema.name}</p>
          <p className="dim">
            {dateParts(data.date).label}, {fmtTime(show.time)} · {show.language} · {show.format} · {show.screen}
          </p>
        </div>
        <button className="live" onClick={detail.reload} title="Refresh seats">
          <span className="dot" /> Updated {new Date(data.fetchedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} ↻
        </button>
      </header>

      <div className="chips show-times">
        {data.siblings.map((s) => (
          <Link key={s.id} to={`/show/${encodeURIComponent(s.id)}?n=${n}&view=${view}`} className={`chip ${s.id === show.id ? 'on' : ''}`}>
            {fmtTime(s.time)} <small>{s.format}</small>
          </Link>
        ))}
      </div>

      <div className="toolbar">
        <div className="segmented">
          <button className={view === '2d' ? 'on' : ''} onClick={() => setParam('view', '2d')}>2D map</button>
          <button className={view === '3d' ? 'on' : ''} onClick={() => setParam('view', '3d')}>3D view</button>
        </div>
        <span className="dim">Tickets</span>
        <Stepper value={n} min={1} max={8} onChange={changeN} label="tickets" />
        <button className="btn" onClick={chooseBest}>✦ Best seats</button>
        {view === '2d' && (
          <label className="heat-toggle">
            <input type="checkbox" className="switch" checked={heat} onChange={(e) => setHeat(e.target.checked)} /> Score heat map
          </label>
        )}
        <span className="dim free-count">{free} of {seats.length} seats free</span>
      </div>

      <div className="legend">
        <span><i className="swatch best" /> Best seats</span>
        <span><i className="swatch" /> Available</span>
        <span><i className="swatch sold">×</i> Occupied</span>
        <span><i className="swatch selected" /> Selected</span>
      </div>

      {notice && <p className="notice warn" role="status">{notice}</p>}

      <div className="show-layout">
        <section className="stage">
          {view === '2d' ? (
            <SeatMap2D layout={layout} scores={scores} selected={selected} heat={heat} onSeat={onSeat} />
          ) : (
            <div className="hall3d">
              <Hall3D
                layout={layout} hall={hall} scores={scores} selected={selected}
                viewSeat={focus ?? null} mode={focus ? mode : 'hall'} movie={movie} faceKey={faceKey} onSeat={onSeat}
              />
              <div className="hall-controls">
                <div className="segmented dark">
                  <button className={mode === 'seat' ? 'on' : ''} disabled={!focus} onClick={() => setMode('seat')}>From seat</button>
                  <button className={mode === 'hall' ? 'on' : ''} onClick={() => setMode('hall')}>Whole hall</button>
                </div>
                {mode === 'seat' && focus && <button className="btn dark" onClick={() => setFaceKey((k) => k + 1)}>Face the screen</button>}
              </div>
              <div className="hall-seats">
                {selected.map((id) => (
                  <button key={id} className={`chip ${id === focus ? 'on' : ''}`} onClick={() => { setViewSeat(id); setMode('seat'); }}>{id}</button>
                ))}
              </div>
              <p className="hall-hint">
                {mode === 'seat' ? 'Drag to look around · tap a seat to sit in it' : 'Drag to orbit · scroll to zoom · tap a seat to pick it'}
              </p>
            </div>
          )}
        </section>

        <aside className="score-card">
          {score && focus ? (
            <>
              <div className="score-top">
                <ScoreRing score={score.score} />
                <div>
                  <p className="eyebrow">Your seat</p>
                  <h2>{focus}</h2>
                  <p className="dim">{category(seatById.get(focus)!.category)} · {rupees(seatById.get(focus)!.price)}</p>
                </div>
              </div>
              <h3>{score.verdict}</h3>
              <p>{score.reason}</p>

              <dl className="metrics">
                <div><dt>To screen</dt><dd>≈{Math.round(score.distance)} m</dd></div>
                <div><dt>Fills view</dt><dd>{Math.round(score.fillAngle)}°</dd></div>
                <div><dt>Off-centre</dt><dd>{Math.round(score.centreAngle)}°</dd></div>
                <div><dt>{score.neckAngle >= 0 ? 'Look up' : 'Look down'}</dt><dd>{Math.abs(Math.round(score.neckAngle))}°</dd></div>
              </dl>

              <div className="parts">
                {([['Screen fill', score.parts.fill, WEIGHTS.fill], ['Centring', score.parts.centre, WEIGHTS.centre], ['Neck angle', score.parts.neck, WEIGHTS.neck]] as const).map(
                  ([label, value, weight]) => (
                    <div key={label} className="part">
                      <span>{label} <small>{Math.round(weight * 100)}% of score</small></span>
                      <div className="bar"><i style={{ width: `${value}%` }} /></div>
                      <b>{Math.round(value)}</b>
                    </div>
                  ),
                )}
              </div>

              {view === '2d' && <button className="btn wide" onClick={() => setParam('view', '3d')}>See the view from {focus}</button>}
              <Link to="/how-it-works" className="dim small-link">How is this worked out?</Link>
              <p className="dim estimate">
                {hall.spec.measured ? 'Based on this hall’s measured dimensions.' : 'Hall size is estimated from the seat grid, so treat distances as approximate.'}
              </p>
            </>
          ) : (
            <p className="dim">Tap a seat to see its score and the view from it.</p>
          )}
        </aside>
      </div>

      <div className="book-bar">
        <div>
          {picked.length ? (
            <>
              <strong>{selected.join(', ')}</strong>
              <p className="dim">
                {picked.length} × {category(picked[0].category)} · {rupees(total)} · score {avg}
              </p>
            </>
          ) : (
            <strong>No seats selected</strong>
          )}
        </div>
        <div className="book-actions">
          {data.booking.map((b, i) => (
            <a key={b.platform} className={`btn ${i === 0 ? 'primary' : ''}`} href={b.url} target="_blank" rel="noopener noreferrer">
              {b.exact ? 'Book on' : 'Find on'} {b.platform} ↗
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
