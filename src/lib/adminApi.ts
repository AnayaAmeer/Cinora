import type { Order, OrderStatus } from "../types";

export const statusLabel: Record<OrderStatus, string> = {
  new: "Awaiting payment",
  confirmed: "Payment received",
  baking: "Baking",
  delivering: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const statusFilters: Array<OrderStatus | "all"> = [
  "all",
  "new",
  "confirmed",
  "baking",
  "delivering",
  "delivered",
  "cancelled",
];

async function readError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error || "Something went wrong. Please try again.";
}

export async function adminSession(): Promise<boolean> {
  const response = await fetch("/api/admin/session");
  return response.ok;
}

export async function adminLogin(password: string): Promise<string | null> {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (response.ok) return null;
  return readError(response);
}

export type VisitPlace = {
  place: string;
  people: number;
  live: number;
};

export type VisitStats = {
  today: number;
  live: number;
  places: VisitPlace[];
  watching: { place: string; page: string }[];
};

export async function loadVisitStats(): Promise<VisitStats> {
  const response = await fetch("/api/admin/visits");
  if (response.status === 401) throw new Error("signed-out");
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as VisitStats;
}

export async function adminLogout(): Promise<void> {
  await fetch("/api/admin/logout", { method: "POST" });
}

export async function loadAdminOrders(): Promise<Order[]> {
  const response = await fetch("/api/admin/orders");
  if (response.status === 401) throw new Error("signed-out");
  if (!response.ok) throw new Error(await readError(response));
  const payload = (await response.json()) as { orders?: Order[] };
  return Array.isArray(payload.orders) ? payload.orders : [];
}

export async function loadAdminOrder(id: string): Promise<Order | null> {
  const response = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`);
  if (response.status === 401) throw new Error("signed-out");
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as Order;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const response = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (response.status === 401) throw new Error("signed-out");
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as Order;
}
