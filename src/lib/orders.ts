import { lineItems } from "./cart";
import { formatBakeDay, isUpcomingBakeDay } from "./dates";
import { formatRs } from "./format";
import type { Draft, Order } from "../types";

const ORDERS_KEY = "cinora.orders";
const LAST_ORDER_KEY = "cinora.lastOrder";
const DRAFT_KEY = "cinora.draft";
const DRAFT_SHOT_KEY = "cinora.draft.shot";
const DRAFT_SHOT_NAME_KEY = "cinora.draft.shotName";
const HOLD_KEY = "cinora.payhold";

export const PAY_WINDOW_MS = 10 * 60 * 1000;

export type PayHold = {
  reference: string;
  expiresAt: number;
};

export function emptyDraft(): Draft {
  return {
    date: null,
    quantities: {},
    fulfillment: "delivery",
    area: "",
    address: "",
    withinCity: false,
    name: "",
    phone: "",
    note: "",
  };
}

export function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Order[]) : [];
  } catch {
    return [];
  }
}

export function getOrder(id: string): Order | undefined {
  const stored = loadOrders().find((order) => order.id === id);
  if (stored) return stored;
  try {
    const raw = sessionStorage.getItem(LAST_ORDER_KEY);
    if (!raw) return undefined;
    const order = JSON.parse(raw) as Order;
    return order.id === id ? order : undefined;
  } catch {
    return undefined;
  }
}

function createReference(): string {
  return `CN-${Math.floor(1000 + Math.random() * 9000)}`;
}

function isReference(value: string): boolean {
  return /^CN-\d{4}$/.test(value);
}

export function readPayHold(): PayHold | null {
  try {
    const raw = sessionStorage.getItem(HOLD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PayHold>;
    if (typeof parsed.reference !== "string" || !isReference(parsed.reference)) return null;
    if (typeof parsed.expiresAt !== "number" || !Number.isFinite(parsed.expiresAt)) return null;
    return { reference: parsed.reference, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

function writePayHold(hold: PayHold): PayHold {
  try {
    sessionStorage.setItem(HOLD_KEY, JSON.stringify(hold));
  } catch {
    // The in-memory hold still runs for this visit.
  }
  return hold;
}

/** Starts the 10-minute payment window the first time the payment step opens. */
export function ensurePayHold(now = Date.now()): PayHold {
  const current = readPayHold();
  if (current) return current;
  return writePayHold({ reference: createReference(), expiresAt: now + PAY_WINDOW_MS });
}

export function restartPayHold(now = Date.now()): PayHold {
  return writePayHold({ reference: createReference(), expiresAt: now + PAY_WINDOW_MS });
}

export function clearPayHold(): void {
  try {
    sessionStorage.removeItem(HOLD_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function buildOrder(draft: Draft, hasScreenshot: boolean, reference: string): Order {
  const items = lineItems(draft.quantities).map((item) => ({
    id: item.id,
    name: item.name,
    qty: item.qty,
    price: item.price,
  }));
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return {
    id: isReference(reference) ? reference : createReference(),
    createdAt: new Date().toISOString(),
    date: draft.date ?? "",
    items,
    fulfillment: "delivery",
    area: draft.area.trim(),
    address: draft.address.trim(),
    name: draft.name.trim(),
    phone: draft.phone.trim(),
    note: draft.note.trim(),
    total,
    hasScreenshot,
    status: "new",
  };
}

function remember(order: Order): void {
  try {
    const orders = loadOrders().filter((item) => item.id !== order.id);
    orders.unshift(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders.slice(0, 30)));
  } catch {
    // The session copy below still lets the confirmation page open.
  }
  try {
    sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
  } catch {
    // Confirmation can still use the navigation state.
  }
}

/** Saves the pre-order on Cinora's desk, then keeps a copy on this device. */
export async function submitOrder(order: Order, screenshot: string): Promise<Order> {
  let response: Response;
  try {
    response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: order.date,
        items: order.items,
        area: order.area,
        address: order.address,
        name: order.name,
        phone: order.phone,
        note: order.note,
        id: order.id,
        screenshot,
      }),
    });
  } catch {
    throw new Error("The order could not be saved. Please try again.");
  }

  const payload = (await response.json().catch(() => null)) as (Order & { error?: string }) | null;
  if (!response.ok || !payload || typeof payload.id !== "string") {
    throw new Error(payload?.error || "The order could not be saved. Please try again.");
  }

  const saved: Order = { ...order, ...payload, hasScreenshot: true, status: payload.status ?? "new" };
  remember(saved);
  return saved;
}

export function formatOrderSummary(order: Order): string {
  const lines = [
    `Cinora reference ${order.id}`,
    "",
    `Bake day: ${formatBakeDay(order.date)}`,
    "",
    ...order.items.map((item) => `${item.qty} × ${item.name} — ${formatRs(item.price * item.qty)}`),
    "",
    "Pre-order. Confirmed when payment is received.",
    "Delivery in Sheikhupura",
    `Area: ${order.area}`,
    `Address: ${order.address}`,
  ];

  lines.push("", `Name: ${order.name}`, `Phone: ${order.phone}`);
  if (order.note) lines.push(`Note: ${order.note}`);
  if (order.hasScreenshot) lines.push("Payment screenshot: attached");
  lines.push("", `Total: ${formatRs(order.total)}`);
  return lines.join("\n");
}

export function readDraft(): Draft {
  const base = emptyDraft();
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    const quantities: Record<string, number> = {};
    if (parsed.quantities && typeof parsed.quantities === "object") {
      for (const [id, value] of Object.entries(parsed.quantities)) {
        const qty = Number(value);
        if (Number.isFinite(qty) && qty > 0) quantities[id] = Math.min(12, Math.floor(qty));
      }
    }
    return {
      date: typeof parsed.date === "string" && isUpcomingBakeDay(parsed.date) ? parsed.date : null,
      quantities,
      fulfillment: "delivery",
      area: typeof parsed.area === "string" ? parsed.area : "",
      address: typeof parsed.address === "string" ? parsed.address : "",
      withinCity: Boolean(parsed.withinCity),
      name: typeof parsed.name === "string" ? parsed.name : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      note: typeof parsed.note === "string" ? parsed.note : "",
    };
  } catch {
    return base;
  }
}

export function writeDraft(draft: Draft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // The in-memory draft still works for this visit.
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function readDraftShot(): { url: string | null; name: string | null } {
  try {
    return {
      url: sessionStorage.getItem(DRAFT_SHOT_KEY),
      name: sessionStorage.getItem(DRAFT_SHOT_NAME_KEY),
    };
  } catch {
    return { url: null, name: null };
  }
}

export function writeDraftShot(url: string, name: string): void {
  try {
    if (url.length > 4_000_000) return;
    sessionStorage.setItem(DRAFT_SHOT_KEY, url);
    sessionStorage.setItem(DRAFT_SHOT_NAME_KEY, name);
  } catch {
    // The preview can stay in memory for this step.
  }
}

export function clearDraftShot(): void {
  try {
    sessionStorage.removeItem(DRAFT_SHOT_KEY);
    sessionStorage.removeItem(DRAFT_SHOT_NAME_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function saveShot(id: string, dataUrl: string): void {
  try {
    if (dataUrl.length > 4_000_000) return;
    sessionStorage.setItem(`cinora.shot.${id}`, dataUrl);
  } catch {
    // The order is still placed without a stored image.
  }
}

export function readShot(id: string): string | null {
  try {
    return sessionStorage.getItem(`cinora.shot.${id}`);
  } catch {
    return null;
  }
}

export function dataUrlToFile(dataUrl: string, name: string): File | null {
  try {
    const [header, data] = dataUrl.split(",");
    if (!header || !data) return null;
    const mime = /data:(.*?);/.exec(header)?.[1] ?? "image/jpeg";
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new File([bytes], name, { type: mime });
  } catch {
    return null;
  }
}
