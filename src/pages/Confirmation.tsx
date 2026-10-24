import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Logo } from "../components/Logo";
import { ArrowIcon } from "../components/Icons";
import { useOrder } from "../context/OrderContext";
import { formatBakeDay } from "../lib/dates";
import { formatRs } from "../lib/format";
import { dataUrlToFile, formatOrderSummary, getOrder, readShot } from "../lib/orders";
import type { Order } from "../types";

type LocationState = {
  screenshot?: string | null;
  order?: Order;
};

export function Confirmation() {
  const { orderId = "" } = useParams();
  const location = useLocation();
  const state = (location.state as LocationState | null) ?? null;
  const order = getOrder(orderId) ?? (state?.order?.id === orderId ? state.order : undefined);
  const screenshot = state?.screenshot || readShot(orderId);
  const canShare = typeof navigator.share === "function";
  const [status, setStatus] = useState("");
  const { reset } = useOrder();
  const found = Boolean(order);

  useEffect(() => {
    document.title = found ? `Order ${orderId} — Cinora` : "Order — Cinora";
  }, [found, orderId]);

  useEffect(() => {
    if (order) reset();
  }, [order?.id, reset]);

  async function onShare() {
    if (!order) return;
    const text = formatOrderSummary(order);
    const file = screenshot ? dataUrlToFile(screenshot, `${order.id}.jpg`) : null;

    if (canShare) {
      try {
        const payload: ShareData = { title: `Cinora ${order.id}`, text };
        if (file && navigator.canShare?.({ files: [file] })) payload.files = [file];
        await navigator.share(payload);
        setStatus("Shared. The order is confirmed once the payment reaches the account.");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied. Paste the summary into your message to Cinora.");
    } catch {
      setStatus("Copy the order number and summary into your message to Cinora.");
    }
  }

  if (!order) {
    return (
      <div className="page">
        <main className="sheet">
          <Logo size="mid" to="/" ariaLabel="Cinora, go to homepage" />
          <div className="rule" aria-hidden="true" />
          <h1 className="step-title center">Order not found</h1>
          <p className="lede">This order is not saved on this device.</p>
          <div className="actions">
            <Link className="btn btn-primary" to="/order">
              Place an Order
              <ArrowIcon />
            </Link>
          </div>
        </main>
        <footer className="site-footer">Made fresh in Sheikhupura · Cinora</footer>
      </div>
    );
  }

  return (
    <div className="page">
      <main className="sheet rise">
        <Logo size="mid" to="/" ariaLabel="Cinora, go to homepage" />
        <div className="rule" aria-hidden="true" />
        <h1 className="step-title center">Pre-order placed.</h1>
        <p className="ref-label">Reference</p>
        <p className="order-id">{order.id}</p>
        <p className="lede">
          Share this reference with Cinora. Payment is attached for {formatBakeDay(order.date)}. The order is confirmed
          once it reaches the account.
        </p>

        <SavedSummary order={order} />

        {screenshot ? (
          <div className="shot shot-confirm">
            <img src={screenshot} alt="Attached payment screenshot" />
            <div>
              <strong>Payment screenshot</strong>
              <p className="hint">Attached to this order.</p>
            </div>
          </div>
        ) : null}

        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={() => void onShare()}>
            {canShare ? "Share this order" : "Copy order summary"}
            <ArrowIcon />
          </button>
          {status ? (
            <p className="instagram-note" role="status">
              {status}
            </p>
          ) : null}
          <Link className="btn btn-secondary" to="/">
            Back to Cinora
          </Link>
          <Link className="text-btn center-link" to="/order">
            Place another order
          </Link>
        </div>
      </main>
      <footer className="site-footer">Made fresh in Sheikhupura · Cinora</footer>
    </div>
  );
}

function SavedSummary({ order }: { order: Order }) {
  return (
    <div className="summary confirm-summary">
      <div className="summary-block">
        <p className="summary-label">Bake day</p>
        <p>{formatBakeDay(order.date)}</p>
      </div>
      <ul className="summary-items">
        {order.items.map((item) => (
          <li key={item.id}>
            <span>
              {item.qty} × {item.name}
            </span>
            <span>{formatRs(item.price * item.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="summary-block">
        <p>Delivery in Sheikhupura</p>
        {order.area ? <p>{order.area}</p> : null}
        {order.address ? <p>{order.address}</p> : null}
        <p>{order.name}</p>
        <p>{order.phone}</p>
        {order.note ? <p>{order.note}</p> : null}
      </div>
      <div className="summary-total">
        <span>Total</span>
        <strong>{formatRs(order.total)}</strong>
      </div>
    </div>
  );
}
