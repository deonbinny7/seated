import { DEFAULT_SPEC, LIMITS, WEIGHTS } from '@seated/core';

/** Every number on this page is read from the scoring engine, so the page cannot drift from the code. */
export function HowItWorks() {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return (
    <article className="page prose">
      <p className="eyebrow">Method</p>
      <h1 className="page-title">How Seated picks the best seat</h1>
      <p className="lede">
        A seat’s score comes from geometry you could measure with a tape and a protractor. No ratings, no black box.
      </p>

      <h2>1. Rebuild the hall</h2>
      <p>
        Booking platforms publish a hall’s seat grid (rows, columns, aisles) but not its dimensions. Seated turns the grid
        into a room in metres using typical multiplex sizes. When a cinema supplies real measurements, they replace these defaults.
      </p>
      <table>
        <tbody>
          <tr><th>Seat spacing</th><td>{DEFAULT_SPEC.seatPitch * 100} cm centre to centre</td></tr>
          <tr><th>Row depth</th><td>{DEFAULT_SPEC.rowDepth} m</td></tr>
          <tr><th>Rise per row</th><td>{DEFAULT_SPEC.rake * 100} cm</td></tr>
          <tr><th>Screen width</th><td>{pct(DEFAULT_SPEC.screenWidthRatio)} of the seating width, at {DEFAULT_SPEC.screenAspect}:1</td></tr>
          <tr><th>Front row</th><td>{DEFAULT_SPEC.frontRowRatio} screen-widths from the screen</td></tr>
          <tr><th>Eye height</th><td>{DEFAULT_SPEC.eyeHeight} m above the row’s floor</td></tr>
        </tbody>
      </table>

      <h2>2. Measure three angles from every seat</h2>
      <dl className="angles">
        <div>
          <dt>Screen fill · {pct(WEIGHTS.fill)} of the score</dt>
          <dd>
            How wide the screen looks from the seat. Best near {LIMITS.fillBest}°, comfortable from {LIMITS.fillIdealMin}° to {LIMITS.fillIdealMax}°.
            Past {LIMITS.fillTooClose}° the picture overflows your view and you start turning your head to follow it.
          </dd>
        </div>
        <div>
          <dt>Centring · {pct(WEIGHTS.centre)}</dt>
          <dd>How far the seat sits off the screen’s centre line. Under {LIMITS.centreMax}° counts as a centre seat.</dd>
        </div>
        <div>
          <dt>Neck angle · {pct(WEIGHTS.neck)}</dt>
          <dd>How far you tilt your head up to the middle of the screen. Under {LIMITS.neckComfort}° is comfortable; front rows are far steeper.</dd>
        </div>
      </dl>
      <p>
        Each angle becomes a 0–100 sub-score on a curve that peaks in the comfortable range and falls away outside it.
        The three are blended with the weights above into one score. Seats at {LIMITS.bestZoneScore} or more form the best view zone.
      </p>

      <h2>3. Rank seats together, not seats alone</h2>
      <p>
        For a group, Seated looks for runs of free seats side by side in one price category, with no aisle or sold seat between them.
        Runs rank by their average score, then by their weakest seat. Shows rank by their best run, then price, then time.
      </p>

      <h2>What to trust</h2>
      <p>
        Real halls differ in screen size and slope, so distances are estimates. The ranking between seats in the same hall is the
        reliable part: a centred seat two-thirds of the way back beats a front corner in any hall. Availability changes by the minute,
        so the final check is always on the booking platform, where you pay.
      </p>
    </article>
  );
}
