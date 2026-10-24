import { menu, type MenuItem } from "../data/menu";
import type { Draft } from "../types";

export type LineItem = MenuItem & {
  qty: number;
  lineTotal: number;
};

export function lineItems(quantities: Draft["quantities"]): LineItem[] {
  return menu.flatMap((item) => {
    const qty = quantities[item.id] ?? 0;
    if (!item.available || qty <= 0) return [];
    return [{ ...item, qty, lineTotal: item.price * qty }];
  });
}

export function itemCount(quantities: Draft["quantities"]): number {
  return lineItems(quantities).reduce((sum, item) => sum + item.qty, 0);
}
