"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Gift, Plus, Printer, Trash2 } from "lucide-react";
import { STATUS_COLUMNS, supabase } from "@/lib/supabase";
import { formatBRL, maskPhone } from "@/lib/format";
import { PAYMENT_LABELS } from "@/lib/order";
import { QuantityStepper } from "@/components/QuantityStepper";

interface Prod { id: string; name: string; category: "empadao" | "empadinha"; unit: "kg" | "un"; price: number }
interface Item { product_id: string | null; product_name: string; category: Prod["category"]; unit: Prod["unit"]; unit_price: number; quantity: number; is_gift: boolean }
interface Z { name: string; fee: number }

const toLocal = (iso: string) => {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const label = (c: string) => (c === "empadao" ? "Empadão" : "Empadinha");

export default function EditarPedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [o, setO] = useState<Record<string, any> | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [products, setProducts] = useState<Prod[]>([]);
  const [zones, setZones] = useState<Z[]>([]);
  const [pick, setPick] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase!.from("orders").select("*, order_items(product_id,product_name,category,unit,unit_price,quantity,is_gift)").eq("id", id).single()
      .then(({ data }) => {
        if (!data) return;
        const { order_items, ...rest } = data;
        setO({ ...rest, when: toLocal(rest.scheduled_for) });
        setItems((order_items as Item[]).map((i) => ({ ...i, unit_price: Number(i.unit_price), quantity: Number(i.quantity) })));
      });
    supabase!.from("products").select("id,name,category,unit,price").eq("is_archived", false).order("category").order("sort_order")
      .then(({ data }) => setProducts((data as Prod[]) ?? []));
    supabase!.from("delivery_zones").select("name,fee").order("name").then(({ data }) => setZones((data as Z[]) ?? []));
  }, [id]);

  if (!o) return <p className="p-8">Carregando…</p>;
  const set = (k: string, v: unknown) => setO((s) => ({ ...s, [k]: v }));
  const setItem = (i: number, patch: Partial<Item>) => setItems((l) => l.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const step = (u: string) => (u === "kg" ? 0.5 : 1);

  function add(gift: boolean) {
    const p = products.find((x) => x.id === pick);
    if (!p) return;
    setItems((l) => [...l, { product_id: p.id, product_name: p.name, category: p.category, unit: p.unit, unit_price: gift ? 0 : Number(p.price), quantity: p.unit === "kg" ? 1 : 1, is_gift: gift }]);
    setPick("");
  }

  const subtotal = items.reduce((s, i) => s + (i.is_gift ? 0 : i.unit_price * i.quantity), 0);
  const fee = o.fulfillment === "entrega" ? Number(o.delivery_fee || 0) : 0;
  const total = subtotal + fee - Number(o.discount || 0);

  async function save() {
    if (!items.length) return setMsg("O pedido precisa de pelo menos um item.");
    setMsg("Salvando…");
    const { error } = await supabase!.from("orders").update({
      customer_name: o!.customer_name, customer_phone: o!.customer_phone, fulfillment: o!.fulfillment, status: o!.status,
      address_neighborhood: o!.address_neighborhood, address_street: o!.address_street, address_number: o!.address_number,
      address_complement: o!.address_complement, delivery_fee: o!.fulfillment === "entrega" ? fee : 0,
      scheduled_for: new Date(o!.when).toISOString(), payment_method: o!.payment_method,
      change_for: o!.change_for ? Number(o!.change_for) : null, notes: o!.notes, discount: Number(o!.discount || 0),
      subtotal, total, updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return setMsg(`Erro: ${error.message}`);
    await supabase!.from("order_items").delete().eq("order_id", id);
    const { error: e2 } = await supabase!.from("order_items").insert(items.map((i) => ({
      order_id: id, product_id: i.product_id, product_name: i.product_name, category: i.category, unit: i.unit,
      unit_price: i.is_gift ? 0 : i.unit_price, quantity: i.quantity, line_total: i.is_gift ? 0 : Math.round(i.unit_price * i.quantity * 100) / 100, is_gift: i.is_gift,
    })));
    if (e2) return setMsg(`Erro nos itens: ${e2.message}`);
    router.push("/admin/pedidos");
  }

  async function remove() {
    if (!confirm(`EXCLUIR definitivamente o pedido #${o!.code}?`)) return;
    await supabase!.from("orders").delete().eq("id", id);
    router.push("/admin/pedidos");
  }

  const inp = (k: string, ph: string, extra = "") => (
    <input className={`field ${extra}`} placeholder={ph} value={o[k] ?? ""} onChange={(e) => set(k, k === "customer_phone" ? maskPhone(e.target.value) : e.target.value)} />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-2xl font-semibold">Pedido #{o.code}</h1>
        <select className="field w-auto py-2!" value={o.status} onChange={(e) => set("status", e.target.value)}>
          {[...STATUS_COLUMNS, { id: "cancelado", label: "Cancelado" }].map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <Link href={`/admin/comanda/${id}`} target="_blank" className="btn-ghost ml-auto"><Printer className="size-4" /> Comanda</Link>
        <button onClick={remove} className="btn-ghost text-red-600!"><Trash2 className="size-4" /> Excluir</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="card p-5">
          <h2 className="mb-3 font-serif text-lg font-semibold">Itens</h2>
          {items.map((i, k) => (
            <div key={k} className={`flex flex-wrap items-center gap-3 border-b border-cream-200 py-2 text-sm ${i.is_gift ? "bg-gold-200/40" : ""}`}>
              <span className="min-w-40 flex-1">
                {i.is_gift && <Gift className="mr-1 inline size-4 text-gold-600" />}
                <span className="text-[11px] uppercase text-gold-700">{label(i.category)}</span> {i.product_name}
              </span>
              <QuantityStepper quantity={i.quantity} unit={i.unit} size="sm"
                onIncrement={() => setItem(k, { quantity: i.quantity + step(i.unit) })}
                onDecrement={() => setItem(k, { quantity: Math.max(step(i.unit), i.quantity - step(i.unit)) })}
                onSet={(q) => q > 0 && setItem(k, { quantity: q })} />
              {i.is_gift ? (
                <span className="w-24 text-right font-semibold text-gold-700">BRINDE</span>
              ) : (
                <label className="flex items-center gap-1 text-xs">R$
                  <input type="number" step="0.5" className="field w-20 px-2! py-1!" value={i.unit_price} onChange={(e) => setItem(k, { unit_price: Number(e.target.value) })} />
                </label>
              )}
              <span className="w-20 text-right font-semibold">{formatBRL(i.is_gift ? 0 : i.unit_price * i.quantity)}</span>
              <button title={i.is_gift ? "Tornar item pago" : "Transformar em brinde"} onClick={() => setItem(k, { is_gift: !i.is_gift, unit_price: i.is_gift ? products.find((p) => p.id === i.product_id)?.price ?? i.unit_price : i.unit_price })}
                className={i.is_gift ? "text-gold-600" : "text-wood-300 hover:text-gold-600"}><Gift className="size-4" /></button>
              <button title="Remover item" onClick={() => setItems((l) => l.filter((_, x) => x !== k))} className="text-wood-300 hover:text-red-600"><Trash2 className="size-4" /></button>
            </div>
          ))}
          <div className="mt-4 flex flex-wrap gap-2">
            <select className="field flex-1" value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Escolha um produto…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{label(p.category)} {p.name} — {formatBRL(Number(p.price))}/{p.unit}</option>)}
            </select>
            <button onClick={() => add(false)} className="btn-gold"><Plus className="size-4" /> Item</button>
            <button onClick={() => add(true)} className="btn-ghost"><Gift className="size-4" /> Brinde</button>
          </div>
        </section>

        <aside className="card space-y-3 p-5 text-sm">
          {inp("customer_name", "Cliente")}
          {inp("customer_phone", "Telefone")}
          <select className="field" value={o.fulfillment} onChange={(e) => set("fulfillment", e.target.value)}>
            <option value="retirada">Retirada / balcão</option>
            <option value="entrega">Entrega</option>
          </select>
          {o.fulfillment === "entrega" && (
            <>
              <select className="field" value={o.address_neighborhood ?? ""} onChange={(e) => { set("address_neighborhood", e.target.value); const z = zones.find((x) => x.name === e.target.value); if (z) set("delivery_fee", z.fee); }}>
                <option value="">Bairro…</option>
                {o.address_neighborhood && !zones.some((z) => z.name === o.address_neighborhood) && <option>{o.address_neighborhood}</option>}
                {zones.map((z) => <option key={z.name} value={z.name}>{z.name}</option>)}
              </select>
              <div className="flex gap-2">{inp("address_street", "Rua")}{inp("address_number", "Nº", "w-24")}</div>
              {inp("address_complement", "Complemento")}
              <label className="flex items-center justify-between gap-2">Taxa de entrega
                <input type="number" step="0.5" className="field w-28" value={o.delivery_fee ?? 0} onChange={(e) => set("delivery_fee", e.target.value)} />
              </label>
            </>
          )}
          <input type="datetime-local" className="field" value={o.when} onChange={(e) => set("when", e.target.value)} />
          <select className="field" value={o.payment_method} onChange={(e) => set("payment_method", e.target.value)}>
            {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {o.payment_method === "dinheiro" && (
            <label className="flex items-center justify-between gap-2">Troco para
              <input type="number" className="field w-28" value={o.change_for ?? ""} onChange={(e) => set("change_for", e.target.value)} />
            </label>
          )}
          <label className="flex items-center justify-between gap-2">Desconto (R$)
            <input type="number" step="0.5" className="field w-28" value={o.discount ?? 0} onChange={(e) => set("discount", e.target.value)} />
          </label>
          <textarea className="field" placeholder="Observações" value={o.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          <div className="border-t border-cream-200 pt-3">
            <p className="flex justify-between"><span>Subtotal</span><span>{formatBRL(subtotal)}</span></p>
            {fee > 0 && <p className="flex justify-between"><span>Entrega</span><span>{formatBRL(fee)}</span></p>}
            {Number(o.discount) > 0 && <p className="flex justify-between"><span>Desconto</span><span>−{formatBRL(Number(o.discount))}</span></p>}
            <p className="flex justify-between font-serif text-xl font-semibold"><span>Total</span><span>{formatBRL(total)}</span></p>
          </div>
          {msg && <p className="text-red-600">{msg}</p>}
          <button onClick={save} className="btn-gold w-full">Salvar alterações</button>
        </aside>
      </div>
    </div>
  );
}
