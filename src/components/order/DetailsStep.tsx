import type { Draft, FieldErrors } from "../../types";

type DetailsStepProps = {
  draft: Draft;
  errors: FieldErrors;
  onChange: (patch: Partial<Draft>) => void;
};

export function DetailsStep({ draft, errors, onChange }: DetailsStepProps) {
  return (
    <div className="step-body">
      <div className="panel">
        <label className="field">
          <span>Name</span>
          <input
            name="name"
            autoComplete="name"
            maxLength={80}
            placeholder="Your name"
            value={draft.name}
            aria-invalid={Boolean(errors.name)}
            onChange={(event) => onChange({ name: event.target.value })}
          />
          {errors.name ? (
            <small className="form-error" role="alert">
              {errors.name}
            </small>
          ) : null}
        </label>
        <label className="field">
          <span>Mobile number</span>
          <input
            name="tel"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={16}
            placeholder="03XX XXXXXXX"
            spellCheck={false}
            value={draft.phone}
            aria-invalid={Boolean(errors.phone)}
            onChange={(event) => onChange({ phone: event.target.value })}
          />
          {errors.phone ? (
            <small className="form-error" role="alert">
              {errors.phone}
            </small>
          ) : (
            <small className="hint">So the order can be confirmed with you.</small>
          )}
        </label>
        <label className="field">
          <span>Area in Sheikhupura</span>
          <input
            name="area"
            autoComplete="address-level3"
            maxLength={80}
            placeholder="Which part of the city?"
            value={draft.area}
            aria-invalid={Boolean(errors.area)}
            onChange={(event) => onChange({ area: event.target.value })}
          />
          {errors.area ? (
            <small className="form-error" role="alert">
              {errors.area}
            </small>
          ) : null}
        </label>
        <label className="field">
          <span>Address</span>
          <textarea
            name="street-address"
            autoComplete="street-address"
            maxLength={180}
            placeholder="House and street"
            value={draft.address}
            aria-invalid={Boolean(errors.address)}
            onChange={(event) => onChange({ address: event.target.value })}
          />
          {errors.address ? (
            <small className="form-error" role="alert">
              {errors.address}
            </small>
          ) : null}
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.withinCity}
            onChange={(event) => onChange({ withinCity: event.target.checked })}
          />
          <span>I confirm this address is within Sheikhupura city.</span>
        </label>
        {errors.withinCity ? (
          <p className="form-error" role="alert">
            {errors.withinCity}
          </p>
        ) : (
          <p className="hint">Cinora delivers within Sheikhupura city only.</p>
        )}
        <label className="field">
          <span>Note</span>
          <textarea
            name="note"
            maxLength={400}
            placeholder="Anything we should know? Optional."
            value={draft.note}
            onChange={(event) => onChange({ note: event.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
