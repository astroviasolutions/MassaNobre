"use client";

import { Plus } from "lucide-react";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/lib/menu";
import { formatBRL } from "@/lib/format";
import { QuantityStepper } from "./QuantityStepper";

export function ProductCard({ product }: { product: Product }) {
  const { quantityOf, add, increment, decrement, setQty, hydrated } = useCart();
  const qty = hydrated ? quantityOf(product.id) : 0;
  const soldOut = !product.available;

  return (
    <article
      className={`card group relative flex flex-col justify-between gap-5 p-6 transition ${
        soldOut ? "opacity-60" : "hover:-translate-y-0.5 hover:border-gold-400/70"
      }`}
    >
      {soldOut && (
        <span className="absolute top-4 right-4 rounded-full bg-wood-800 px-3 py-1 text-[10px] font-semibold tracking-[0.15em] text-gold-300 uppercase">
          Esgotado hoje
        </span>
      )}

      <div>
        <h3 className="font-serif text-xl font-semibold text-wood-900">{product.name}</h3>
        <p className="mt-2 font-display text-[17px] leading-snug text-wood-700 italic">{product.description}</p>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="font-serif text-2xl font-semibold text-gold-700">{formatBRL(product.price)}</span>
          <span className="ml-1 text-sm text-wood-500">{product.unit === "kg" ? "/ kg" : "/ unidade"}</span>
        </div>

        {soldOut ? null : qty > 0 ? (
          <QuantityStepper
            quantity={qty}
            unit={product.unit}
            onIncrement={() => increment(product)}
            onDecrement={() => decrement(product)}
            onSet={(q) => setQty(product, q)}
            size="sm"
          />
        ) : (
          <button type="button" onClick={() => add(product)} className="btn-gold px-4! py-2.5!">
            <Plus className="size-4" /> Adicionar
          </button>
        )}
      </div>
    </article>
  );
}
