import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Logo } from "../components/Logo";
import {
  adminLogin,
  adminLogout,
  adminSession,
  loadAdminOrder,
  loadAdminOrders,
  loadVisitStats,
  statusFilters,
  statusLabel,
  updateOrderStatus,
} from "../lib/adminApi";
import { formatBakeDay, karachiDateISO } from "../lib/dates";
import { formatRs } from "../lib/format";
import { formatOrderSummary } from "../lib/orders";
import type { VisitStats } from "../lib/adminApi";
import type { Order, OrderStatus } from "../types";

const nextStep: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  new: { status: "confirmed", label: "Payment received" },
  confirmed: { status: "baking", label: "Start baking" },
  baking: { status: "delivering", label: "Out for delivery" },
  delivering: { status: "delivered", label: "Mark delivered" },
};

function filterLabel(filter: OrderStatus | "all"): string {
  return filter === "all" ? "All" : statusLabel[filter];
}

function useAccess() {
  const [access, setAccess] = useState<"loading" | "in" | "out">("loading");

  useEffect(() => {
    let live = true;
    adminSession()
      .then((ok) => {
        if (live) setAccess(ok ? "in" : "out");
      })
      .catch(() => {
        if (live) setAccess("out");
      });
    return () => {
      live = false;
    };
  }, []);

  return { access, setAccess };
}

function DeskFrame({ children, onLogout }: { children: ReactNode; onLogout?: () => void }) {
  return (
    <div className="desk">
      <a className="skip" href="#desk-title">
        Skip to orders
      </a>
      <header className="desk-bar">
        <Logo size="bar" to="/" ariaLabel="Cinora, go to homepage" />
        {onLogout ? (
          <button type="button" className="text-btn" onClick={onLogout}>
            Log out
          </button>
        ) : (
          <span />
        )}
      </header>
      <main className="desk-main">{children}</main>
    </div>
  );
}

function AdminLogin({ onIn }: { onIn: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Admin — Cinora";
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const message = await adminLogin(password);
    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    onIn();
  }

  return (
    <DeskFrame>
      <form className="desk-login" onSubmit={onSubmit}>
        <h1 id="desk-title" className="step-title">
          Orders
        </h1>
        <p className="step-sub">Sign in to see pre-orders, payment screenshots, and deliveries.</p>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Checking" : "Open the desk"}
        </button>
      </form>
    </DeskFrame>
  );
}

function Audience({ onSignedOut }: { onSignedOut: () => void }) {
  const [stats, setStats] = useState<VisitStats | null>(null);

  useEffect(() => {
    let current = true;
    const load = () => {
      loadVisitStats()
        .then((next) => {
          if (current) setStats(next);
        })
        .catch((error: unknown) => {
          if (current && error instanceof Error && error.message === "signed-out") onSignedOut();
        });
    };
    load();
    const timer = window.setInterval(load, 15_000);
    return () => {
      current = false;
      window.clearInterval(timer);
    };
  }, [onSignedOut]);

  if (!stats) return null;

  return (
    <section className="audience" aria-label="Website visitors">
      <div className="audience-stats">
        <p>
          <strong>{stats.today}</strong>
          <span>{stats.today === 1 ? "person today" : "people today"}</span>
        </p>
        <p>
          <strong>{stats.live}</strong>
          <span>{stats.live === 1 ? "person watching now" : "people watching now"}</span>
        </p>
      </div>
      <h2>Where they're watching from</h2>
      {stats.places.length === 0 ? (
        <p className="desk-empty">No one has opened the site today.</p>
      ) : (
        <ul>
          {stats.places.map((place) => (
            <li key={place.place}>
              <span>{place.place}</span>
              <span>
                {place.people} {place.people === 1 ? "person" : "people"}
                {place.live > 0 ? ` · ${place.live} now` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      {stats.watching.length > 0 ? (
        <ul className="audience-live">
          {stats.watching.map((person, index) => (
            <li key={`${person.place}-${person.page}-${index}`}>
              {person.place} · {person.page}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="hint">The city comes from the connection, so it is approximate.</p>
    </section>
  );
}

function StatusMark({ status }: { status: OrderStatus }) {
  return <span className={`status status-${status}`}>{statusLabel[status]}</span>;
}

export function AdminDesk() {
  const { access, setAccess } = useAccess();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (access !== "in") return;
    document.title = "Orders — Cinora";
    let live = true;
    loadAdminOrders()
      .then((list) => {
        if (live) setOrders(list);
      })
      .catch((error: unknown) => {
        if (!live) return;
        if (error instanceof Error && error.message === "signed-out") setAccess("out");
        else setProblem("Orders could not be loaded. Refresh the page.");
      });
    return () => {
      live = false;
    };
  }, [access, setAccess]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (filter !== "all" && order.status !== filter) return false;
      if (!query) return true;
      const haystack = [order.id, order.name, order.phone, order.area, order.address, ...order.items.map((item) => item.name)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [filter, orders, search]);

  const groups = useMemo(() => {
    const today = karachiDateISO(new Date());
    const byDay = new Map<string, Order[]>();
    for (const order of visible) {
      const list = byDay.get(order.date) ?? [];
      list.push(order);
      byDay.set(order.date, list);
    }
    return [...byDay.entries()].sort(([a], [b]) => {
      const aPast = a < today;
      const bPast = b < today;
      if (aPast !== bPast) return aPast ? 1 : -1;
      return a.localeCompare(b);
    });
  }, [visible]);

  const signOut = useCallback(() => setAccess("out"), [setAccess]);

  async function logout() {
    await adminLogout();
    setAccess("out");
  }

  if (access === "loading") {
    return (
      <DeskFrame>
        <p className="step-sub">Opening the desk…</p>
      </DeskFrame>
    );
  }

  if (access === "out") return <AdminLogin onIn={() => setAccess("in")} />;

  const openTotal = orders.filter((order) => order.status !== "cancelled" && order.status !== "delivered").reduce((sum, order) => sum + order.total, 0);

  return (
    <DeskFrame onLogout={() => void logout()}>
      <h1 id="desk-title" className="step-title">
        Orders
      </h1>
      <p className="step-sub">A pre-order is confirmed when you mark the payment as received.</p>
      <Audience onSignedOut={signOut} />
      <p className="desk-count">
        {orders.length === 0
          ? "No pre-orders yet."
          : `${orders.filter((order) => order.status !== "cancelled" && order.status !== "delivered").length} open · ${formatRs(openTotal)}`}
      </p>

      <div className="desk-filters" role="group" aria-label="Filter orders">
        {statusFilters.map((item) => {
          const count = item === "all" ? orders.length : orders.filter((order) => order.status === item).length;
          return (
            <button
              key={item}
              type="button"
              className={filter === item ? "is-on" : undefined}
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {filterLabel(item)}
              <span>{count}</span>
            </button>
          );
        })}
      </div>

      <label className="field desk-search">
        <span className="sr-only">Search orders</span>
        <input
          type="search"
          placeholder="Search name, phone, or reference"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      {problem ? (
        <p className="form-error" role="alert">
          {problem}
        </p>
      ) : null}

      {orders.length === 0 ? (
        <p className="desk-empty">New pre-orders will appear here, with the payment screenshot attached.</p>
      ) : visible.length === 0 ? (
        <p className="desk-empty">Nothing matches this list.</p>
      ) : (
        groups.map(([day, list]) => (
          <section key={day} className="desk-day" aria-labelledby={`day-${day}`}>
            <h2 id={`day-${day}`}>{formatBakeDay(day)}</h2>
            <ul>
              {list.map((order) => (
                <li key={order.id}>
                  <Link to={`/admin/${order.id}`}>
                    <span className="desk-row">
                      <strong>{order.name}</strong>
                      <StatusMark status={order.status} />
                    </span>
                    <span className="desk-meta">
                      Reference {order.id} · {order.area}
                    </span>
                    <span className="desk-meta">
                      {order.items.map((item) => `${item.qty} × ${item.name}`).join(", ")}
                    </span>
                    <span className="desk-total">{formatRs(order.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </DeskFrame>
  );
}

export function AdminOrder() {
  const { orderId = "" } = useParams();
  const { access, setAccess } = useAccess();
  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);
  const [problem, setProblem] = useState("");
  const [copied, setCopied] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (access !== "in") return;
    document.title = `Order ${orderId} — Cinora`;
    let live = true;
    loadAdminOrder(orderId)
      .then((found) => {
        if (!live) return;
        setOrder(found);
        setMissing(!found);
      })
      .catch((error: unknown) => {
        if (!live) return;
        if (error instanceof Error && error.message === "signed-out") setAccess("out");
        else setProblem("This order could not be loaded.");
      });
    return () => {
      live = false;
    };
  }, [access, orderId, setAccess]);

  async function logout() {
    await adminLogout();
    setAccess("out");
  }

  async function setStatus(status: OrderStatus) {
    if (!order || saving || order.status === status) return;
    setSaving(true);
    setProblem("");
    try {
      const saved = await updateOrderStatus(order.id, status);
      setOrder(saved);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "signed-out") setAccess("out");
      else setProblem("The status could not be saved. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function copySummary() {
    if (!order) return;
    const text = `${formatOrderSummary(order)}\nStatus: ${statusLabel[order.status]}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied("Copied. Paste it into your message.");
    } catch {
      setCopied("Select the order details and copy them by hand.");
    }
  }

  if (access === "loading") {
    return (
      <DeskFrame>
        <p className="step-sub">Opening the order…</p>
      </DeskFrame>
    );
  }

  if (access === "out") return <AdminLogin onIn={() => setAccess("in")} />;

  const upcoming = nextStep[order?.status ?? "new"];

  return (
    <DeskFrame onLogout={() => void logout()}>
      <Link className="desk-back" to="/admin">
        All orders
      </Link>
      {missing ? (
        <>
          <h1 id="desk-title" className="step-title">
            Order not found
          </h1>
          <p className="step-sub">This pre-order is not on the desk.</p>
        </>
      ) : !order ? (
        <p className="step-sub">Opening the order…</p>
      ) : (
        <>
          <p className="ref-label">Reference</p>
          <p className="desk-reference" id="desk-title" tabIndex={-1}>
            {order.id}
          </p>
          <div className="desk-row">
            <h1 className="step-title">{order.name}</h1>
            <StatusMark status={order.status} />
          </div>
          <p className="step-sub">Match this reference with the number the customer sends. {formatBakeDay(order.date)}</p>

          {upcoming ? (
            <button type="button" className="btn btn-primary desk-next" disabled={saving} onClick={() => void setStatus(upcoming.status)}>
              {upcoming.label}
            </button>
          ) : null}

          <div className="status-switch" role="group" aria-label="Order status">
            {statusFilters
              .filter((item): item is OrderStatus => item !== "all")
              .map((status) => (
                <button
                  key={status}
                  type="button"
                  className={order.status === status ? "is-on" : undefined}
                  aria-pressed={order.status === status}
                  disabled={saving}
                  onClick={() => void setStatus(status)}
                >
                  {statusLabel[status]}
                </button>
              ))}
          </div>
          {problem ? (
            <p className="form-error" role="alert">
              {problem}
            </p>
          ) : null}

          <section className="card desk-card">
            <h2>Delivery</h2>
            <p>{order.area}</p>
            <p>{order.address}</p>
            <p>Sheikhupura</p>
            <p>
              <a href={`tel:${order.phone.replace(/[^\d+]/g, "")}`}>{order.phone}</a>
            </p>
            {order.note ? <p>Note: {order.note}</p> : null}
          </section>

          <section className="card desk-card">
            <h2>Treats</h2>
            <ul className="desk-items">
              {order.items.map((item) => (
                <li key={item.id}>
                  <span>
                    {item.qty} × {item.name}
                  </span>
                  <span>{formatRs(item.price * item.qty)}</span>
                </li>
              ))}
            </ul>
            <p className="desk-total">{formatRs(order.total)}</p>
          </section>

          <section className="card desk-card">
            <h2>Payment</h2>
            <p>Check this screenshot against the Meezan transfer, then mark the payment as received.</p>
            {order.hasScreenshot ? (
              <img className="desk-shot" src={`/api/admin/orders/${order.id}/shot`} alt={`Payment screenshot for ${order.id}`} />
            ) : (
              <p>No screenshot was attached.</p>
            )}
          </section>

          <button type="button" className="btn btn-secondary" onClick={() => void copySummary()}>
            Copy order summary
          </button>
          {copied ? <p className="hint">{copied}</p> : null}
        </>
      )}
    </DeskFrame>
  );
}
