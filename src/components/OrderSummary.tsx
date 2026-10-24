import { formatBakeDay } from "../lib/dates";
import { formatRs } from "../lib/format";
import { useOrder } from "../context/OrderContext";

type OrderSummaryProps = {
  showCustomer?: boolean;
};

export function OrderSummary({ showCustomer = false }: OrderSummaryProps) {
  const { draft, items, total } = useOrder();

  return (
    <div className="summary">
      <div className="summary-head">
        <p className="eyebrow">Your order</p>
      </div>

      <div className="summary-block">
        <p className="summary-label">Bake day</p>
        <p>{draft.date ? formatBakeDay(draft.date) : "Choose a date"}</p>
      </div>

      <div className="summary-block">
        <p className="summary-label">Treats</p>
        {items.length === 0 ? (
          <p className="hint">Your treats will appear here.</p>
        ) : (
          <ul className="summary-items">
            {items.map((item) => (
              <li key={item.id}>
                <span>
                  {item.qty} × {item.name}
                </span>
                <span>{formatRs(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="summary-block">
        <p className="summary-label">Delivery</p>
        <p>Delivery in Sheikhupura</p>
        {draft.area ? <p>{draft.area}</p> : <p className="hint">Add a Sheikhupura address</p>}
        {draft.address ? <p>{draft.address}</p> : null}
      </div>

      {showCustomer ? (
        <div className="summary-block">
          <p className="summary-label">Details</p>
          <p>{draft.name || "Name"}</p>
          <p>{draft.phone || "Mobile number"}</p>
          {draft.note ? <p>{draft.note}</p> : null}
        </div>
      ) : null}

      <div className="summary-total">
        <span>Total</span>
        <strong>{formatRs(total)}</strong>
      </div>
    </div>
  );
}
