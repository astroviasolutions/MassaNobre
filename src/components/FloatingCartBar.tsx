"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatBRL } from "@/lib/format";

/** Barra fixa no rodapé (celular) quando há itens no carrinho. */
export function FloatingCartBar() {
  const { hydrated, count, subtotal, open } = useCart();
  if (!hydrated || count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 p-4 sm:hidden">
      <button
        type="button"
        onClick={open}
        className="flex w-full items-center justify-between rounded-2xl bg-wood-900 px-5 py-4 text-cream-50 shadow-2xl ring-1 ring-gold-500/40"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <ShoppingBag className="size-4 text-gold-300" />
          {count} {count === 1 ? "item" : "itens"}
        </span>
        <span className="text-sm font-semibold tracking-wide text-gold-300 uppercase">Ver carrinho · {formatBRL(subtotal)}</span>
      </button>
    </div>
  );
}
