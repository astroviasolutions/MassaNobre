"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { categoryLabel } from "@/lib/menu";
import { formatBRL, formatUnitPrice } from "@/lib/format";
import { QuantityStepper } from "./QuantityStepper";

export function CartDrawer() {
  const { isOpen, close, lines, subtotal, increment, decrement, setQty, remove } = useCart();
  const hasKg = lines.some((l) => l.product.unit === "kg");

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? "" : "pointer-events-none"}`} aria-hidden={!isOpen} inert={!isOpen}>
      <div
        className={`absolute inset-0 bg-wood-950/60 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={close}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Carrinho"
        className={`absolute top-0 right-0 flex h-full w-full max-w-md flex-col bg-cream-50 shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-sage-200 bg-cream-100 px-6 py-5">
          <h2 className="text-gold-foil font-serif text-xl font-semibold">Seu pedido</h2>
          <button type="button" onClick={close} className="rounded-full p-2 text-wood-700 transition hover:bg-white" aria-label="Fechar carrinho">
            <X className="size-5" />
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <ShoppingBag className="size-12 text-gold-500/60" strokeWidth={1.2} />
            <p className="font-display text-xl text-wood-700 italic">Seu carrinho está vazio.</p>
            <button type="button" onClick={close} className="btn-ghost">
              Ver cardápio
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-cream-200 overflow-y-auto px-6">
              {lines.map(({ product, quantity }) => (
                <li key={product.id} className="py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.15em] text-gold-600 uppercase">{categoryLabel(product.category)}</p>
                      <p className="font-serif text-base font-semibold text-wood-900">{product.name}</p>
                      <p className="text-xs text-wood-500">{formatUnitPrice(product.price, product.unit)}</p>
                    </div>
                    <button type="button" onClick={() => remove(product.id)} className="rounded-full p-1.5 text-wood-300 transition hover:bg-red-50 hover:text-red-600" aria-label={`Remover ${product.name}`}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <QuantityStepper
                      quantity={quantity}
                      unit={product.unit}
                      onIncrement={() => increment(product)}
                      onDecrement={() => decrement(product)}
                      onSet={(q) => setQty(product, q)}
                      size="sm"
                    />
                    <span className="font-semibold tabular-nums text-wood-900">{formatBRL(product.price * quantity)}</span>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="border-t border-cream-200 bg-white/60 px-6 py-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm tracking-wide text-wood-700 uppercase">Subtotal</span>
                <span className="font-serif text-2xl font-semibold text-wood-900 tabular-nums">{formatBRL(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-wood-500">
                Taxa de entrega calculada no checkout.
                {hasKg && " Empadões: peso aproximado, valor final conforme pesagem."}
              </p>
              <Link href="/checkout" onClick={close} className="btn-gold mt-4 w-full">
                Finalizar pedido
              </Link>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
