export type Fulfillment = "delivery";

export type Draft = {
  date: string | null;
  quantities: Record<string, number>;
  fulfillment: Fulfillment | null;
  area: string;
  address: string;
  withinCity: boolean;
  name: string;
  phone: string;
  note: string;
};

export type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
};

export type OrderStatus = "new" | "confirmed" | "baking" | "delivering" | "delivered" | "cancelled";

export type Order = {
  id: string;
  createdAt: string;
  date: string;
  items: OrderItem[];
  fulfillment: Fulfillment;
  area: string;
  address: string;
  name: string;
  phone: string;
  note: string;
  total: number;
  hasScreenshot: boolean;
  status: OrderStatus;
};

export type FieldKey =
  | "date"
  | "items"
  | "fulfillment"
  | "area"
  | "address"
  | "withinCity"
  | "name"
  | "phone"
  | "screenshot";

export type FieldErrors = Partial<Record<FieldKey, string>>;
