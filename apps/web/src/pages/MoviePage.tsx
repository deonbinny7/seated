import type { BestPick, DayPart, MovieShowtimes } from '@seated/core';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ScoreRing } from '../components/ScoreRing';
import { Stepper } from '../components/Stepper';
import { dateParts, fmtLikes, fmtRuntime, fmtTime, rupees, seatRange, useApi } from '../lib';
import { posterUrl } from '../poster';

const PARTS: { id: DayPart; label: string }[] = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
  { id: 'night', label: 'Night' },
];
const PRICE_CAPS = [150, 250, 400];

export function MoviePage() {
  const { city, movieId } = useParams();
  const [params, setParams] = useSearchParams();
  const date = params.get('date') ?? '';

  const [tab, setTab] = useState<'best' | 'all'>('best');
  const [n, setN] = useState(2);
  const [centre, setCentre] = useState(true);
  const [notClose, setNotClose] = useState(true);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [part, setPart] = useState<DayPart | null>(null);

  const base = `/api/movies/${movieId}/showtimes?city=${city}${date ? `&date=${date}` : ''}`;
  const showtimes = useApi<MovieShowtimes>(base, 120_000);
  const best = useApi<BestPick[]>(
    `/api/best/${movieId}?city=${city}${date ? `&date=${date}` : ''}&n=${n}&centre=${centre ? 1 : 0}&notClose=${notClose ? 1 : 0}${maxPrice ? `&maxPrice=${maxPrice}` : ''}`,
    120_000,
  );

  if (showtimes.error) return <p className="notice error">{showtimes.error}</p>;
  if (!showtimes.data) return <p className="notice">Loading showtimes…</p>;

  const { movie, cinemas, dates } = showtimes.data;
  const activeDate = showtimes.data.date;
  const allShows = cinemas.flatMap((c) => c.shows);
  const inPart = <T extends { part: DayPart }>(s: T) => !part || s.part === part;
  const picks = (best.data ?? []).filter((p) => inPart(p.show));
  const fillingFast = allShows.filter((s) => s.free < 0.25).length;

  return (
    <div className="page">
      <Link to={`/${city}`} className="back">← All films</Link>

      <header className="movie-head">
        <img className="poster" src={posterUrl(movie)} alt="" />
        <div>
          <h1 className="page-title">{movie.title}</h1>
          <p className="tagline">{movie.tagline}</p>
          <p className="dim">
            <span className="cert">{movie.cert}</span> {fmtRuntime(movie.runtimeMin)} · {movie.genres.join(', ')} · {fmtLikes(movie.likes)} likes
          </p>
        </div>
        <dl className="stats">
          <div><dt>Shows</dt><dd>{allShows.length}</dd></div>
          <div><dt>Cinemas</dt><dd>{cinemas.length}</dd></div>
          <div><dt>From</dt><dd>{allShows.length ? rupees(Math.min(...allShows.map((s) => s.priceFrom))) : '–'}</dd></div>
          {fillingFast > 0 && <p className="warn">{fillingFast} {fillingFast === 1 ? 'show is' : 'shows are'} filling fast</p>}
        </dl>
      </header>

      <div className="date-strip" role="group" aria-label="Date">
        <span className="month">{dateParts(activeDate).mon}</span>
        {dates.map((d, i) => {
          const p = dateParts(d);
          return (
            <button key={d} className={`date ${d === activeDate ? 'on' : ''}`} onClick={() => setParams({ date: d }, { replace: true })}>
              <span>{i === 0 ? 'Today' : p.dow}</span>
              <strong>{p.day}</strong>
              <span>{p.mon}</span>
            </button>
          );
        })}
      </div>

      <div className="toolbar">
        <div className="segmented">
          <button className={tab === 'best' ? 'on' : ''} onClick={() => setTab('best')}>Best seats</button>
          <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>All shows</button>
        </div>
        <div className="chips">
          <button className={`chip ${!part ? 'on' : ''}`} onClick={() => setPart(null)}>Any time</button>
          {PARTS.map((p) => (
            <button key={p.id} className={`chip ${part === p.id ? 'on' : ''}`} onClick={() => setPart(p.id)}>
              {p.label} <small>{allShows.filter((s) => s.part === p.id).length}</small>
            </button>
          ))}
        </div>
      </div>

      {tab === 'best' ? (
        <div className="best-layout">
          <aside className="filters">
            <div className="filter-row">
              <div>
                <strong>Seats together</strong>
                <p className="dim">Side by side, no aisle between</p>
              </div>
              <Stepper value={n} min={1} max={8} onChange={setN} label="tickets" />
            </div>
            <label className="filter-row">
              <div>
                <strong>Centre seats only</strong>
                <p className="dim">Within the middle of the hall</p>
              </div>
              <input type="checkbox" className="switch" checked={centre} onChange={(e) => setCentre(e.target.checked)} />
            </label>
            <label className="filter-row">
              <div>
                <strong>Not too close</strong>
                <p className="dim">Skip rows where the screen overflows your view</p>
              </div>
              <input type="checkbox" className="switch" checked={notClose} onChange={(e) => setNotClose(e.target.checked)} />
            </label>
            <div>
              <strong>Price per ticket</strong>
              <div className="chips">
                <button className={`chip ${!maxPrice ? 'on' : ''}`} onClick={() => setMaxPrice(null)}>Any</button>
                {PRICE_CAPS.map((p) => (
                  <button key={p} className={`chip ${maxPrice === p ? 'on' : ''}`} onClick={() => setMaxPrice(p)}>≤ {rupees(p)}</button>
                ))}
              </div>
            </div>
          </aside>

          <section className="picks">
            {best.error && <p className="notice error">{best.error}</p>}
            {best.loading && !best.data && <p className="notice">Scoring every free seat in {allShows.length} shows…</p>}
            {best.data && picks.length === 0 && (
              <p className="notice">No show has {n} {n === 1 ? 'seat' : 'seats together'} that fit these filters. Try loosening one.</p>
            )}
            {picks.slice(0, 30).map((p, i) => (
              <Link
                key={p.show.id}
                className="pick"
                to={`/show/${encodeURIComponent(p.show.id)}?n=${n}&seats=${p.block.seatIds.join(',')}`}
              >
                <span className="rank">{i + 1}</span>
                <ScoreRing score={Math.round(p.block.avg)} size={52} />
                <div className="pick-main">
                  <h3>{p.cinema.name}</h3>
                  <p>
                    {fmtTime(p.show.time)} · {p.show.screen} · {p.show.format} · {p.show.language}
                  </p>
                  <p className="dim">
                    Row {p.block.rowLabel}, seats {seatRange(p.block.seatIds)} · {Math.round(p.show.free * 100)}% of the hall free
                  </p>
                </div>
                <div className="pick-price">
                  <strong>{rupees(p.total)}</strong>
                  <span className="dim">{n} × {rupees(p.block.pricePerSeat)}</span>
                </div>
              </Link>
            ))}
          </section>
        </div>
      ) : (
        <section className="cinema-list">
          {cinemas.length === 0 && <p className="notice">No shows left on this date.</p>}
          {cinemas.length > 0 && (
            <p className="availability">
              <span>Available</span>
              <span className="fast">Filling fast</span>
              <span className="almost">Almost full</span>
            </p>
          )}
          {cinemas.map(({ cinema, shows }) => {
            const visible = shows.filter(inPart);
            if (!visible.length) return null;
            return (
              <article key={cinema.code} className="cinema">
                <div>
                  <h3>{cinema.name}</h3>
                  <p className="dim">{visible.length} {visible.length === 1 ? 'show' : 'shows'} · from {rupees(Math.min(...visible.map((s) => s.priceFrom)))}</p>
                </div>
                <div className="times">
                  {visible.map((s) => (
                    <Link key={s.id} to={`/show/${encodeURIComponent(s.id)}?n=${n}`} className={`time ${s.free < 0.1 ? 'almost' : s.free < 0.25 ? 'fast' : ''}`}>
                      <strong>{fmtTime(s.time)}</strong>
                      <span>{s.format} · {s.language}</span>
                    </Link>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
