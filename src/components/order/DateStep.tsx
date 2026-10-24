import { useMemo } from "react";
import { upcomingBakeDays } from "../../lib/dates";

type DateStepProps = {
  date: string | null;
  error?: string;
  onSelect: (iso: string) => void;
};

export function DateStep({ date, error, onSelect }: DateStepProps) {
  const days = useMemo(() => upcomingBakeDays(12), []);

  return (
    <div className="step-body">
      <div className="dates" role="group" aria-label="Bake dates" aria-describedby={error ? "date-error" : undefined}>
        {days.map((day, index) => {
          const selected = date === day.iso;
          const label = index === 0 ? "Tomorrow" : day.weekday;
          return (
            <button
              key={day.iso}
              type="button"
              className={selected ? "date-card is-selected" : "date-card"}
              aria-pressed={selected}
              onClick={() => onSelect(day.iso)}
            >
              <span className="dow">{label}</span>
              <span className="num">{day.dayNum}</span>
              <span className="mon">{day.month}</span>
            </button>
          );
        })}
      </div>
      {error ? (
        <p id="date-error" className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
