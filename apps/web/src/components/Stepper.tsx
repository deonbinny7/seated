export function Stepper({ value, min, max, onChange, label }: {
  value: number; min: number; max: number; onChange: (v: number) => void; label: string;
}) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Fewer ${label}`}>−</button>
      <output aria-label={label}>{value}</output>
      <button onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`More ${label}`}>+</button>
    </div>
  );
}
