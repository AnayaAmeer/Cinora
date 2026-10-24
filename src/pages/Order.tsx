import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "../components/Logo";
import { ArrowIcon, BackIcon } from "../components/Icons";
import { DateStep } from "../components/order/DateStep";
import { DetailsStep } from "../components/order/DetailsStep";
import { MenuStep } from "../components/order/MenuStep";
import { ReviewStep } from "../components/order/ReviewStep";
import { useOrder } from "../context/OrderContext";
import { formatBakeDay } from "../lib/dates";
import { formatRs } from "../lib/format";
import {
  buildOrder,
  clearDraftShot,
  clearPayHold,
  ensurePayHold,
  readDraftShot,
  restartPayHold,
  saveShot,
  submitOrder,
  writeDraftShot,
  type PayHold,
} from "../lib/orders";
import { firstIncompleteStep, validateStep } from "../lib/validate";
import type { FieldErrors } from "../types";

const STEP_COUNT = 4;

const STEPS = [
  {
    title: "Choose a bake day",
    sub: "Everything is mixed and baked on the morning you choose.",
  },
  {
    title: "Choose your treats",
    sub: "The classic cinnamon roll, baked for your day. Cookies are coming soon.",
  },
  {
    title: "Your details",
    sub: "Your name, mobile number, and a Sheikhupura address.",
  },
  {
    title: "Review your order",
    sub: "Pay and add your screenshot within 10 minutes. Share the reference with Cinora.",
  },
];

export function Order() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { draft, update, setQty, total, count } = useOrder();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [screenshot, setScreenshot] = useState<string | null>(() => readDraftShot().url);
  const [shotName, setShotName] = useState<string | null>(() => readDraftShot().name);
  const [submitting, setSubmitting] = useState(false);
  const [hold, setHold] = useState<PayHold | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const skipFocus = useRef(true);
  const leaving = useRef(false);

  const raw = Number(searchParams.get("step") ?? "1");
  const step = raw >= 1 && raw <= STEP_COUNT ? raw : raw > STEP_COUNT ? STEP_COUNT : 1;
  const current = STEPS[step - 1];
  if (step === STEP_COUNT && hold === null) setHold(ensurePayHold());
  const remainingMs = hold ? Math.max(0, hold.expiresAt - now) : 0;
  const expired = step === STEP_COUNT && hold !== null && remainingMs === 0;

  useEffect(() => {
    if (leaving.current) return;
    const needed = firstIncompleteStep(draft);
    if (step > needed) {
      setSearchParams({ step: String(needed) }, { replace: true });
    }
  }, [draft, setSearchParams, step]);

  useEffect(() => {
    setErrors((current) => (Object.keys(current).length > 0 ? {} : current));
  }, [draft]);

  useEffect(() => {
    if (step !== STEP_COUNT) return;
    setHold(ensurePayHold());
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  useEffect(() => {
    document.title = step === STEP_COUNT ? "Review your order — Cinora" : "Place an order — Cinora";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    if (skipFocus.current) {
      skipFocus.current = false;
      return;
    }
    document.getElementById("step-title")?.focus({ preventScroll: true });
  }, [step]);

  function back() {
    setErrors({});
    if (step === 1) navigate("/");
    else setSearchParams({ step: String(step - 1) });
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((currentErrors) => ({ ...currentErrors, screenshot: "Please choose an image file." }));
      return;
    }
    if (file.size > 2_500_000) {
      setErrors((currentErrors) => ({ ...currentErrors, screenshot: "Please use an image smaller than 2.5 MB." }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setScreenshot(reader.result);
      setShotName(file.name);
      writeDraftShot(reader.result, file.name);
      setErrors((currentErrors) => {
        const next = { ...currentErrors };
        delete next.screenshot;
        return next;
      });
    };
    reader.readAsDataURL(file);
  }

  function clearShot() {
    setScreenshot(null);
    setShotName(null);
    clearDraftShot();
  }

  function restartWindow() {
    clearShot();
    setErrors({});
    setHold(restartPayHold());
    setNow(Date.now());
  }

  function place() {
    const needed = firstIncompleteStep(draft);
    if (needed < STEP_COUNT) {
      setErrors(validateStep(needed, draft));
      setSearchParams({ step: String(needed) });
      return;
    }

    if (!hold || expired) {
      setErrors({ screenshot: "The 10 minutes are over. Start again for a new reference." });
      return;
    }

    if (!screenshot) {
      setErrors({ screenshot: "Add your payment screenshot. The order is confirmed when payment is received." });
      requestAnimationFrame(() => {
        document.querySelector(".form-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    setSubmitting(true);
    const order = buildOrder(draft, true, hold.reference);
    void submitOrder(order, screenshot)
      .then((saved) => {
        saveShot(saved.id, screenshot);
        clearDraftShot();
        clearPayHold();
        leaving.current = true;
        navigate(`/order/confirmed/${saved.id}`, { state: { screenshot, order: saved } });
      })
      .catch((error: unknown) => {
        setSubmitting(false);
        const message = error instanceof Error ? error.message : "The order could not be saved. Please try again.";
        setErrors({ screenshot: message });
        requestAnimationFrame(() => {
          document.querySelector(".form-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      });
  }

  function forward() {
    if (step === STEP_COUNT) {
      place();
      return;
    }
    const nextErrors = validateStep(step, draft);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      requestAnimationFrame(() => {
        document.querySelector(".form-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    setErrors({});
    setSearchParams({ step: String(step + 1) });
  }

  return (
    <div className="order-shell">
      <a className="skip" href="#step-title">
        Skip to the order step
      </a>
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={back} aria-label={step === 1 ? "Back to home" : "Previous step"}>
          <BackIcon />
        </button>
        <Logo size="bar" to="/" ariaLabel="Cinora, go to homepage" />
        <p className="step-count" aria-label={`Step ${step} of ${STEP_COUNT}`}>
          {step} / {STEP_COUNT}
        </p>
      </header>
      <div
        className="progress"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEP_COUNT}
        aria-valuenow={step}
        aria-label="Order progress"
      >
        <span style={{ width: `${(step / STEP_COUNT) * 100}%` }} />
      </div>

      <form
        className="order-layout"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!submitting) forward();
        }}
      >
        <div className="order-main rise">
          <h1 id="step-title" className="step-title" tabIndex={-1}>
            {current.title}
          </h1>
          <p className="step-sub">{current.sub}</p>
          {draft.date && step > 1 ? <p className="chosen-date">{formatBakeDay(draft.date)}</p> : null}

          {step === 1 ? <DateStep date={draft.date} error={errors.date} onSelect={(date) => update({ date })} /> : null}
          {step === 2 ? <MenuStep quantities={draft.quantities} error={errors.items} onQty={setQty} /> : null}
          {step === 3 ? <DetailsStep draft={draft} errors={errors} onChange={update} /> : null}
          {step === STEP_COUNT ? (
            <ReviewStep
              reference={hold?.reference ?? ""}
              remainingMs={remainingMs}
              expired={expired}
              onRestart={restartWindow}
              screenshot={screenshot}
              shotName={shotName}
              shotError={errors.screenshot}
              onFile={onFile}
              onClearShot={clearShot}
            />
          ) : null}

          <div className="dock">
            {count > 0 && step > 1 ? (
              <p className="dock-meta">
                <strong>{formatRs(total)}</strong>
                <span aria-hidden="true">·</span>
                <span>
                  {count} {count === 1 ? "treat" : "treats"}
                </span>
              </p>
            ) : null}
            <button
              type={expired ? "button" : "submit"}
              className="btn btn-primary"
              disabled={submitting}
              onClick={expired ? restartWindow : undefined}
            >
              {submitting ? "Placing order" : expired ? "Start another 10 minutes" : step === STEP_COUNT ? "Place an Order" : "Continue"}
              {submitting ? null : <ArrowIcon />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
