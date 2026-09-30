"use client";

import { use, useEffect, useState } from "react";
import { supabase, type DbOrder } from "@/lib/supabase";
import { STORE } from "@/lib/config";
import { formatBRL, formatQty } from "@/lib/format";
import { PAYMENT_LABELS } from "@/lib/order";

/** Comanda para impressora térmica (58/80 mm). Abre o diálogo de impressão automaticamente. */
export default function ComandaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [o, setO] = useState<DbOrder | null>(null);

  useEffect(() => {
    supabase!
      .from("orders")
      .select("*, order_items(product_name,category,unit,quantity,line_total)")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setO(data as DbOrder);
        setTimeout(() => window.print(), 300);
        supabase!.from("orders").update({ printed_at: new Date().toISOString() }).eq("id", id).then();
      });
  }, [id]);

  if (!o) return <p className="p-8">Carregando…</p>;
  const hr = <div className="my-1 border-t border-dashed border-black" />;

  return (
    <div className="comanda mx-auto w-[72mm] bg-white p-2 font-mono text-[12px] leading-tight text-black">
      <p className="text-center font-bold">{STORE.name.toUpperCase()}</p>
      <p className="text-center text-[16px] font-bold">PEDIDO #{o.code}</p>
      <p className="text-center">{new Date(o.scheduled_for).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
      {hr}
      <p>{o.customer_name} · {o.customer_phone}</p>
      <p className="font-bold">{o.fulfillment === "entrega" ? "ENTREGA" : "RETIRADA"}</p>
      {o.fulfillment === "entrega" && (
        <p>
          {o.address_street}, {o.address_number} {o.address_complement}
          <br />
          {o.address_neighborhood} {o.address_cep}
        </p>
      )}
      {hr}
      {o.order_items.map((i, k) => (
        <div key={k} className="flex justify-between gap-2">
          <span>
            <b>{formatQty(Number(i.quantity), i.unit)}</b> {i.category === "empadao" ? "Empadão" : "Empadinha"} {i.product_name}
          </span>
          <span>{formatBRL(Number(i.line_total))}</span>
        </div>
      ))}
      {hr}
      {o.fulfillment === "entrega" && <p className="flex justify-between"><span>Entrega</span><span>{o.delivery_fee === null ? "a combinar" : formatBRL(Number(o.delivery_fee))}</span></p>}
      {Number(o.discount) > 0 && <p className="flex justify-between"><span>Desconto {o.coupon_code}</span><span>-{formatBRL(Number(o.discount))}</span></p>}
      <p className="flex justify-between text-[14px] font-bold"><span>TOTAL</span><span>{formatBRL(Number(o.total))}</span></p>
      <p>{PAYMENT_LABELS[o.payment_method]}{o.change_for ? ` · troco p/ ${formatBRL(Number(o.change_for))}` : ""}</p>
      {o.notes && (<>{hr}<p className="font-bold">OBS: {o.notes}</p></>)}
      {hr}
      <p className="text-center">Obrigado!</p>
    </div>
  );
}
