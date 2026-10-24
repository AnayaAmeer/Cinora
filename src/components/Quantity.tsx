type QuantityProps = {
  name: string;
  value: number;
  onChange: (qty: number) => void;
};

export function Quantity({ name, value, onChange }: QuantityProps) {
  if (value === 0) {
    return (
      <button type="button" className="add" onClick={() => onChange(1)}>
        Add
        <span className="sr-only"> {name}</span>
      </button>
    );
  }

  return (
    <div className="qty" role="group" aria-label={`Quantity for ${name}`}>
      <button type="button" onClick={() => onChange(value - 1)} aria-label={`Remove one ${name}`}>
        −
      </button>
      <span aria-live="polite">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= 12}
        aria-label={`Add another ${name}`}
        title={value >= 12 ? "Maximum 12 of each treat" : undefined}
      >
        +
      </button>
    </div>
  );
}
