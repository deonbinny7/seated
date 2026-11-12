import type { ApiMeta, City } from '@seated/core';
import { lazy, Suspense } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { saveCity, savedCity, useApi } from './lib';
import { CityPage } from './pages/CityPage';
import { Home } from './pages/Home';
import { HowItWorks } from './pages/HowItWorks';
import { MoviePage } from './pages/MoviePage';

// The show page pulls in three.js, so it loads only when someone opens a show.
const ShowPage = lazy(() => import('./pages/ShowPage'));

export function App() {
  const cities = useApi<City[]>('/api/cities');
  const meta = useApi<ApiMeta>('/api/meta');
  const location = useLocation();
  const navigate = useNavigate();

  // The city is the first path segment on city and movie pages; elsewhere, the last one chosen.
  const first = location.pathname.split('/')[1];
  const slug = cities.data?.some((c) => c.slug === first) ? first : savedCity();
  const city = cities.data?.find((c) => c.slug === slug);

  return (
    <>
      {meta.data?.demo && (
        <div className="demo-bar">
          <strong>Demo data</strong> Cinemas, showtimes and seat availability are simulated. Scoring and the 3D view are real.
        </div>
      )}
      <header className="topbar">
        <Link to={city ? `/${city.slug}` : '/'} className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Seated
        </Link>
        <nav>
          <Link to="/how-it-works">How it works</Link>
          {cities.data && (
            <select
              aria-label="City"
              value={city?.slug ?? ''}
              onChange={(e) => {
                saveCity(e.target.value);
                navigate(`/${e.target.value}`);
              }}
            >
              {!city && <option value="">Choose city</option>}
              {cities.data.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          )}
        </nav>
      </header>

      <main>
        {cities.error ? (
          <p className="notice error">{cities.error}</p>
        ) : !cities.data ? (
          <p className="notice">
            {cities.slow ? 'Waking the server up. The first visit after a quiet spell can take up to a minute.' : 'Loading…'}
          </p>
        ) : (
          <Suspense fallback={<p className="notice">Loading…</p>}>
            <Routes>
              <Route path="/" element={<Home cities={cities.data ?? []} />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/show/:showId" element={<ShowPage />} />
              <Route path="/:city" element={<CityPage cities={cities.data} />} />
              <Route path="/:city/movies/:movieId" element={<MoviePage />} />
            </Routes>
          </Suspense>
        )}
      </main>

      <footer className="footer">
        Seated is an independent project. It does not sell tickets and is not affiliated with BookMyShow, District or any cinema chain.
        Distances are estimates rebuilt from the seat grid; the ranking between seats is what matters.
      </footer>
    </>
  );
}
