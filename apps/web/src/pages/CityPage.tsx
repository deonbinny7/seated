import type { City, Movie } from '@seated/core';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fmtLikes, fmtRuntime, saveCity, useApi } from '../lib';
import { posterUrl } from '../poster';

export function CityPage({ cities }: { cities?: City[] }) {
  const { city: slug } = useParams();
  const city = cities?.find((c) => c.slug === slug);
  const movies = useApi<Movie[]>(city ? `/api/movies?city=${city.slug}` : null);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    if (city) saveCity(city.slug);
  }, [city]);

  // Filter chips: the languages and genres that actually occur in this city's listings.
  const chips = useMemo(() => {
    const langs = new Set<string>();
    const genres = new Set<string>();
    for (const m of movies.data ?? []) {
      m.languages.filter((l) => city?.languages.includes(l)).forEach((l) => langs.add(l));
      m.genres.forEach((g) => genres.add(g));
    }
    return ['All', ...langs, ...genres];
  }, [movies.data, city]);

  if (cities && !city) return <p className="notice error">We don’t cover that city yet. <Link to="/">Pick another</Link>.</p>;
  if (!city) return <p className="notice">Loading…</p>;

  const shown = (movies.data ?? []).filter((m) => filter === 'All' || m.languages.includes(filter) || m.genres.includes(filter));

  return (
    <div className="page">
      <p className="eyebrow">Pick a film, we’ll find the seats</p>
      <h1 className="page-title">Now showing in {city.name}</h1>

      <div className="chips" role="group" aria-label="Filter films">
        {chips.map((c) => (
          <button key={c} className={`chip ${filter === c ? 'on' : ''}`} onClick={() => setFilter(c)}>{c}</button>
        ))}
      </div>

      {movies.error && <p className="notice error">{movies.error}</p>}
      {movies.loading && !movies.data && <p className="notice">Loading films…</p>}
      {movies.data && shown.length === 0 && <p className="notice">No films match that filter.</p>}

      <div className="movie-grid">
        {shown.map((m) => (
          <Link key={m.id} to={`/${city.slug}/movies/${m.id}`} className="movie-card">
            <img src={posterUrl(m)} alt="" loading="lazy" />
            <div className="movie-card-body">
              <h3>{m.title}</h3>
              <p>{m.cert} | {m.languages.filter((l) => city.languages.includes(l)).join(', ')}</p>
              <p className="dim">{m.genres.join(', ')} · {fmtRuntime(m.runtimeMin)} · {fmtLikes(m.likes)} likes</p>
              <span className="cta">Find best seats →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
