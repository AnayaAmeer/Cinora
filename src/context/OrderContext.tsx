import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { lineItems, type LineItem } from "../lib/cart";
import { clearDraft, emptyDraft, readDraft, writeDraft } from "../lib/orders";
import { menu } from "../data/menu";
import type { Draft } from "../types";

type OrderContextValue = {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  setQty: (id: string, qty: number) => void;
  reset: () => void;
  items: LineItem[];
  total: number;
  count: number;
};

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(() => readDraft());

  useEffect(() => {
    writeDraft(draft);
  }, [draft]);

  const update = useCallback((patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    if (!menu.some((item) => item.id === id && item.available)) return;
    setDraft((current) => {
      const quantities = { ...current.quantities };
      const safe = Math.max(0, Math.min(12, Math.floor(qty)));
      if (safe === 0) delete quantities[id];
      else quantities[id] = safe;
      return { ...current, quantities };
    });
  }, []);

  const reset = useCallback(() => {
    clearDraft();
    setDraft(emptyDraft());
  }, []);

  const items = useMemo(() => lineItems(draft.quantities), [draft.quantities]);
  const total = useMemo(() => items.reduce((sum, item) => sum + item.lineTotal, 0), [items]);
  const count = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);

  const value = useMemo(
    () => ({ draft, update, setQty, reset, items, total, count }),
    [draft, update, setQty, reset, items, total, count],
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrder(): OrderContextValue {
  const value = useContext(OrderContext);
  if (!value) throw new Error("useOrder must be used within OrderProvider");
  return value;
}
