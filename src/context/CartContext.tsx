"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { STORE } from "@/lib/config";
import { productById, type Product } from "@/lib/menu";
import type { OrderLine } from "@/lib/order";

type CartState = Record<string, number>; // productId -> quantidade (kg ou un.)

type Action =
  | { type: "set"; id: string; qty: number }
  | { type: "remove"; id: string }
  | { type: "clear" }
  | { type: "hydrate"; state: CartState };

const STORAGE_KEY = "massa-nobre:cart";

export const stepFor = (p: Product) => (p.unit === "kg" ? STORE.kgStep : 1);
export const minFor = (p: Product) => (p.unit === "kg" ? STORE.kgMin : 1);

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "set": {
      if (action.qty <= 0) {
        const { [action.id]: _, ...rest } = state;
        return rest;
      }
      return { ...state, [action.id]: Math.round(action.qty * 100) / 100 };
    }
    case "remove": {
      const { [action.id]: _, ...rest } = state;
      return rest;
    }
    case "clear":
      return {};
    case "hydrate":
      return action.state;
  }
}

interface CartContextValue {
  hydrated: boolean;
  lines: OrderLine[];
  count: number;
  subtotal: number;
  quantityOf: (id: string) => number;
  add: (p: Product) => void;
  increment: (p: Product) => void;
  decrement: (p: Product) => void;
  remove: (id: string) => void;
  clear: () => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {});
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "hydrate", state: JSON.parse(raw) });
    } catch {
      /* armazenamento indisponível: carrinho começa vazio */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignora */
    }
  }, [state, hydrated]);

  // Só entram produtos que existem e estão disponíveis.
  const lines = useMemo<OrderLine[]>(
    () =>
      Object.entries(state)
        .map(([id, quantity]) => ({ product: productById(id), quantity }))
        .filter((l): l is OrderLine => !!l.product && l.product.available),
    [state],
  );

  const quantityOf = useCallback((id: string) => state[id] ?? 0, [state]);

  const increment = useCallback(
    (p: Product) => {
      const cur = state[p.id] ?? 0;
      dispatch({ type: "set", id: p.id, qty: cur === 0 ? minFor(p) : cur + stepFor(p) });
    },
    [state],
  );

  const decrement = useCallback(
    (p: Product) => {
      const cur = state[p.id] ?? 0;
      const next = cur - stepFor(p);
      dispatch({ type: "set", id: p.id, qty: next < minFor(p) ? 0 : next });
    },
    [state],
  );

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value: CartContextValue = {
    hydrated,
    lines,
    count: lines.length,
    subtotal: lines.reduce((s, l) => s + l.product.price * l.quantity, 0),
    quantityOf,
    add: increment,
    increment,
    decrement,
    remove: (id) => dispatch({ type: "remove", id }),
    clear: () => dispatch({ type: "clear" }),
    isOpen,
    open,
    close,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de <CartProvider>");
  return ctx;
}
