/** Colour for a 0–100 seat score: red through amber to green. */
export function scoreColor(score: number): string {
  const hue = Math.max(0, Math.min(1, (score - 35) / 55)) * 135;
  return `hsl(${hue} 72% 52%)`;
}

export function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  return (
    <svg className="score-ring" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`Seat score ${score} out of 100`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r} fill="none" stroke={scoreColor(score)} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${(score / 100) * circumference} ${circumference}`} transform="rotate(-90 50 50)"
      />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontSize="34" fontWeight="700" fill="currentColor">{score}</text>
    </svg>
  );
}
