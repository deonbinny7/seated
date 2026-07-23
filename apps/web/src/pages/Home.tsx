import type { City } from '@seated/core';
import { Link } from 'react-router-dom';
import { saveCity } from '../lib';

const FEATURES = [
  { title: 'The best block, found for you', body: 'Every show’s seat map is scored seat by seat, then ranked by the best group of seats still free together.' },
  { title: 'Sit in it first', body: 'Flip any hall into 3D and look at the screen from your exact seat. Or stay on the classic 2D map.' },
  { title: 'A score you can check', body: 'Three measurable things: how much of your view the screen fills, how centred you are, how far you tilt your head.' },
];

export function Home({ cities }: { cities: City[] }) {
  return (
    <div className="home">
      <section className="hero">
        <p className="eyebrow">Seat finder · 3D seat view</p>
        <h1>
          The best seat,<br />
          <em>seen before you book.</em>
        </h1>
        <p className="lede">
          Pick a film. Seated checks every show in your city, finds the centre seats still free, and lets you sit in them in 3D.
        </p>
        <div className="city-grid">
          {cities.map((c) => (
            <Link key={c.slug} to={`/${c.slug}`} className="city-chip" onClick={() => saveCity(c.slug)}>
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="features">
        {FEATURES.map((f) => (
          <article key={f.title}>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
