"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pencil, Plus, Printer, Trash2, X } from "lucide-react";
import { STATUS_COLUMNS, supabase, type DbOrder, type OrderStatus } from "@/lib/supabase";
import { formatBRL, formatQty } from "@/lib/format";
import { PAYMENT_LABELS } from "@/lib/order";

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function PedidosPage() {
  const [orders, setOrders] = useState<DbOrder[]>([]);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 3 * 86400_000).toISOString();
    const { data } = await supabase!
      .from("orders")
      .select("*, order_items(product_name,category,unit,quantity,line_total,is_gift)")
      .neq("status", "cancelado")
      .or(`status.neq.concluido,scheduled_for.gte.${since}`)
      .order("scheduled_for");
    setOrders((data as DbOrder[]) ?? []);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase!
      .channel("orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => {
      supabase!.removeChannel(ch);
    };
  }, [load]);

  async function setStatus(o: DbOrder, status: OrderStatus) {
    if (status === "cancelado" && !confirm(`Cancelar o pedido #${o.code}?`)) return;
    setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, status } : x)));
    await supabase!.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", o.id);
    await supabase!.from("order_status_history").insert({ order_id: o.id, from_status: o.status, to_status: status });
    load();
  }

  async function remove(o: DbOrder) {
    if (!confirm(`EXCLUIR definitivamente o pedido #${o.code}? (some dos relatórios)`)) return;
    setOrders((prev) => prev.filter((x) => x.id !== o.id));
    await supabase!.from("orders").delete().eq("id", o.id);
  }

  return (
    <>
    <div className="mb-4 flex justify-end"><Link href="/admin/pedidos/novo" className="btn-gold"><Plus className="size-4" /> Novo pedido</Link></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {STATUS_COLUMNS.map((col, ci) => {
        const list = orders.filter((o) => o.status === col.id);
        return (
          <section key={col.id} className="rounded-2xl bg-cream-100/70 p-3">
            <h2 className="mb-3 flex items-center justify-between px-1 font-serif font-semibold">
              {col.label} <span className="rounded-full bg-wood-900 px-2 text-xs text-gold-200">{list.length}</span>
            </h2>
            <div className="space-y-3">
              {list.map((o) => (
                <article key={o.id} className="card p-4 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-serif font-semibold">#{o.code}</p>
                      <p className="text-wood-700">{o.customer_name}</p>
                    </div>
                    <span className="text-right text-xs font-semibold text-gold-700">{when(o.scheduled_for)}</span>
                  </div>
                  <ul className="my-2 text-xs text-wood-700">
                    {o.order_items.map((i, k) => (
                      <li key={k}>
                        {i.is_gift && "🎁 "}{formatQty(Number(i.quantity), i.unit)} · {i.category === "empadao" ? "Empadão" : "Empadinha"} {i.product_name}{i.is_gift && " (brinde)"}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-wood-500">
                    {o.fulfillment === "entrega" ? `Entrega · ${o.address_neighborhood ?? ""}` : "Retirada"} · {PAYMENT_LABELS[o.payment_method]}
                  </p>
                  {o.notes && <p className="mt-1 rounded bg-gold-300/20 px-2 py-1 text-xs">{o.notes}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-semibold">{formatBRL(Number(o.total))}</span>
                    <div className="flex gap-1">
                      <button title="Excluir" onClick={() => remove(o)} className="rounded p-1.5 text-wood-300 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button>
                      <button title="Cancelar" onClick={() => setStatus(o, "cancelado")} className="rounded p-1.5 text-wood-300 hover:bg-red-50 hover:text-red-600"><X className="size-4" /></button>
                      <Link title="Editar pedido" href={`/admin/pedidos/${o.id}`} className="rounded p-1.5 hover:bg-cream-200"><Pencil className="size-4" /></Link>
                      <a title="Imprimir comanda" href={`/admin/comanda/${o.id}`} target="_blank" className="rounded p-1.5 hover:bg-cream-200"><Printer className="size-4" /></a>
                      {ci > 0 && <button title="Voltar" onClick={() => setStatus(o, STATUS_COLUMNS[ci - 1].id)} className="rounded p-1.5 hover:bg-cream-200"><ChevronLeft className="size-4" /></button>}
                      {ci < STATUS_COLUMNS.length - 1 && <button title="Avançar" onClick={() => setStatus(o, STATUS_COLUMNS[ci + 1].id)} className="rounded bg-wood-900 p-1.5 text-gold-200"><ChevronRight className="size-4" /></button>}
                    </div>
                  </div>
                </article>
              ))}
              {!list.length && <p className="px-1 py-6 text-center text-xs text-wood-500">Nenhum pedido</p>}
            </div>
          </section>
        );
      })}
    </div>
    </>
  );
}
