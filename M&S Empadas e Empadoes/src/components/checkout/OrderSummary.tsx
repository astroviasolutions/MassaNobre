import { MessageCircle } from "lucide-react";
import { categoryLabel } from "@/lib/menu";
import { formatBRL, formatQty } from "@/lib/format";
import type { Fulfillment, OrderLine } from "@/lib/order";
import { Ornament } from "../Ornament";

interface Props {
  lines: OrderLine[];
  subtotal: number;
  fulfillment: Fulfillment;
  deliveryFee: number | null;
  neighborhood: string;
  total: number;
}

export function OrderSummary({ lines, subtotal, fulfillment, deliveryFee, neighborhood, total }: Props) {
  const hasKg = lines.some((l) => l.product.unit === "kg");

  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <div className="overflow-hidden rounded-2xl bg-wood-900 text-cream-100 shadow-xl ring-1 ring-gold-600/40">
        <div className="px-6 pt-6 pb-4 text-center">
          <h2 className="text-gold-foil font-serif text-xl font-semibold tracking-wide">Resumo do pedido</h2>
          <Ornament className="mt-3 [&_span]:w-10" />
        </div>

        <ul className="space-y-3 px-6 text-sm">
          {lines.map(({ product, quantity }) => (
            <li key={product.id} className="flex justify-between gap-3">
              <span>
                <span className="text-gold-300 tabular-nums">{formatQty(quantity, product.unit)}</span>{" "}
                {categoryLabel(product.category)} {product.name}
              </span>
              <span className="shrink-0 tabular-nums">{formatBRL(product.price * quantity)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-2 border-t border-white/10 px-6 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-cream-300">Subtotal</dt>
            <dd className="tabular-nums">{formatBRL(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-cream-300">
              {fulfillment === "retirada" ? "Retirada no local" : `Entrega${neighborhood ? ` · ${neighborhood}` : ""}`}
            </dt>
            <dd className="tabular-nums">
              {fulfillment === "retirada"
                ? "Grátis"
                : deliveryFee === null
                  ? "A combinar"
                  : neighborhood
                    ? formatBRL(deliveryFee)
                    : "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex items-baseline justify-between border-t border-gold-600/40 px-6 py-4">
          <span className="text-sm tracking-[0.15em] text-gold-300 uppercase">Total</span>
          <span className="font-serif text-3xl font-semibold text-cream-50 tabular-nums">{formatBRL(total)}</span>
        </div>

        <div className="px-6 pb-6">
          <button type="submit" className="btn-gold w-full py-4">
            <MessageCircle className="size-4" /> Enviar pedido pelo WhatsApp
          </button>
          <p className="mt-3 text-center text-xs text-cream-300/80">
            Você será direcionado ao WhatsApp com o pedido já escrito.
            {hasKg && " Empadões: valor final conforme pesagem."}
          </p>
        </div>
      </div>
    </aside>
  );
}
