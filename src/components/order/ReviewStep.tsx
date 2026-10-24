import { useState } from "react";
import { hasPaymentDetails, site } from "../../config/site";
import { OrderSummary } from "../OrderSummary";

type ReviewStepProps = {
  reference: string;
  remainingMs: number;
  expired: boolean;
  onRestart: () => void;
  screenshot: string | null;
  shotName: string | null;
  shotError?: string;
  onFile: (file: File | undefined) => void;
  onClearShot: () => void;
};

function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function ReviewStep({
  reference,
  remainingMs,
  expired,
  onRestart,
  screenshot,
  shotName,
  shotError,
  onFile,
  onClearShot,
}: ReviewStepProps) {
  const paymentReady = hasPaymentDetails();
  const [copied, setCopied] = useState("");
  const clock = formatClock(remainingMs);
  const late = !expired && remainingMs <= 60_000;
  const minutesLeft = Math.floor(Math.ceil(remainingMs / 1000) / 60);
  const secondsLeft = Math.ceil(remainingMs / 1000) % 60;

  async function copyText(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
    } catch {
      setCopied("failed");
    }
  }

  return (
    <div className="step-body">
      <section className="card pay-card" aria-labelledby="payment-title">
        <div className="pay-window">
          <p className="ref-label">Reference</p>
          <div className="pay-ref-row">
            <p className="pay-ref">{reference}</p>
            <button type="button" className="text-btn" onClick={() => void copyText(reference, "reference")}>
              {copied === "reference" ? "Copied" : "Copy"}
            </button>
          </div>
          <p>Write this in the bank transfer and share it with Cinora.</p>
          <p
            className={expired ? "pay-clock is-over" : late ? "pay-clock is-late" : "pay-clock"}
            role="timer"
            aria-label={
              expired
                ? "The 10 minutes are over"
                : `${minutesLeft} minutes and ${secondsLeft} seconds left to pay`
            }
          >
            {clock}
          </p>
          <p>{expired ? "These 10 minutes are over." : "Pay and add your screenshot before this reaches zero."}</p>
          {copied === "reference" ? <p className="hint">Copied. Share it with Cinora.</p> : null}
          {copied === "failed" ? <p className="hint">Select the text and copy it by hand.</p> : null}
        </div>

        <h2 id="payment-title">Payment</h2>
        {paymentReady ? (
          <>
            <p>{site.payment.note}</p>
            <dl className="pay-details">
              <div>
                <dt>Bank</dt>
                <dd>{site.payment.method}</dd>
              </div>
              <div>
                <dt>Account title</dt>
                <dd>{site.payment.accountTitle}</dd>
              </div>
              <div>
                <dt>Account number</dt>
                <dd className="pay-copy">
                  <span className="pay-number">{site.payment.accountNumber}</span>
                  <button
                    type="button"
                    className="text-btn"
                    aria-label="Copy account number"
                    onClick={() => void copyText(site.payment.accountNumber, "account")}
                  >
                    {copied === "account" ? "Copied" : "Copy"}
                  </button>
                </dd>
              </div>
              <div>
                <dt>IBAN</dt>
                <dd className="pay-copy">
                  <span className="pay-number">{site.payment.iban}</span>
                  <button
                    type="button"
                    className="text-btn"
                    aria-label="Copy IBAN"
                    onClick={() => void copyText(site.payment.iban, "iban")}
                  >
                    {copied === "iban" ? "Copied" : "Copy"}
                  </button>
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <p>Payment details will be shared when we confirm your order.</p>
        )}

        {expired ? (
          <button type="button" className="btn btn-primary" onClick={onRestart}>
            Start another 10 minutes
          </button>
        ) : screenshot ? (
          <div className="shot">
            <img src={screenshot} alt="Payment screenshot preview" />
            <div>
              <strong>{shotName || "Screenshot"}</strong>
              <p className="hint">Attached to this order.</p>
            </div>
            <button type="button" className="text-btn" onClick={onClearShot}>
              Remove
            </button>
          </div>
        ) : (
          <label className="upload">
            <input
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                onFile(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <strong>Add a payment screenshot</strong>
            <small>Required within 10 minutes. JPG, PNG, or WebP under 2.5 MB.</small>
          </label>
        )}
        {shotError ? (
          <p className="form-error" role="alert">
            {shotError}
          </p>
        ) : null}
      </section>

      <OrderSummary showCustomer />
    </div>
  );
}
