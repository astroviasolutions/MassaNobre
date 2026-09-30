"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, type OrderStatus } from "@/lib/supabase";
import { formatBRL, maskPhone } from "@/lib/format";
import { generateOrderCode, PAYMENT_LABELS, type PaymentMethod } from "@/lib/order";
import { QuantityStepper } from "@/components/QuantityStepper";

interface P { slug: string; name: string; category: string; unit: "kg" | "un"; price: number; is_available: boolean }
interface Z { name: string; fee: number }

const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export default function NovoPedido() {
  const router = useRouter();
  const [products, setProducts] = useState<P[]>([]);
  const [zones, setZones] = useState<Z[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [f, setF] = useState({
    name: "", phone: "", fulfillment: "retirada", neighborhood: "", street: "", number: "", complement: "",
    when: nowLocal(), payment: "pix" as PaymentMethod, notes: "", status: "concluido" as OrderStatus,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    supabase!.from("products").select("slug,name,category,unit,price,is_available").eq("is_archived", false).order("category").order("sort_order")
      .then(({ data }) => setProducts((data as P[]) ?? []));
    supabase!.from("delivery_zones").select("name,fee").eq("is_active", true).order("name").then(({ data }) => setZones((data as Z[]) ?? []));
  }, []);

  const step = (p: P) => (p.unit === "kg" ? 0.5 : 1);
  const change = (p: P, dir: 1 | -1) =>
    setQty((q) => ({ ...q, [p.slug]: Math.max(0, Math.round(((q[p.slug] ?? 0) + dir * step(p)) * 100) / 100) }));
  const lines = products.filter((p) => (qty[p.slug] ?? 0) > 0);
  const subtotal = lines.reduce((s, p) => s + p.price * qty[p.slug], 0);
  const fee = f.fulfillment === "entrega" ? zones.find((z) => z.name === f.neighborhood)?.fee ?? 0 : 0;

  async function save() {
    setError("");
    if (!f.name.trim()) return setError("Informe o nome do cliente.");
    if (!lines.length) return setError("Adicione pelo menos um item.");
    setSaving(true);
    const code = generateOrderCode();
    const { error } = await supabase!.rpc("create_order", {
      p: {
        code, name: f.name, phone: f.phone || "-", fulfillment: f.fulfillment, neighborhood: f.neighborhood,
        street: f.street, number: f.number, complement: f.complement, cep: "",
        scheduled_for: new Date(f.when).toISOString(), payment: f.payment, notes: f.notes,
        items: lines.map((p) => ({ slug: p.slug, qty: qty[p.slug] })),
      },
    });
    if (error) {
      setSaving(false);
      return setError(`Erro: ${error.message}`);
    }
    await supabase!.from("orders").update({ source: "painel", status: f.status }).eq("code", code);
    router.push("/admin/pedidos");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="card p-5">
        <h2 className="mb-3 font-serif text-lg font-semibold">Itens</h2>
        {products.map((p) => (
          <div key={p.slug} className={`flex items-center justify-between border-b border-cream-200 py-2 text-sm last:border-0 ${p.is_available ? "" : "opacity-50"}`}>
            <span>
              <span className="text-[11px] uppercase text-gold-600">{p.category === "empadao" ? "Empadão" : "Empadinha"}</span> {p.name}
              <span className="ml-2 text-wood-500">{formatBRL(p.price)}/{p.unit}</span>
              {!p.is_available && <span className="ml-2 text-xs text-red-600">desligado</span>}
            </span>
            {p.is_available && <QuantityStepper quantity={qty[p.slug] ?? 0} unit={p.unit} size="sm" onIncrement={() => change(p, 1)} onDecrement={() => change(p, -1)} onSet={(q) => setQty((s) => ({ ...s, [p.slug]: q }))} />}
          </div>
        ))}
      </section>

      <aside className="card space-y-3 p-5 text-sm">
        <input className="field" placeholder="Nome do cliente" value={f.name} onChange={(e) => set("name", e.target.value)} />
        <input className="field" placeholder="Telefone" value={f.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} />
        <select className="field" value={f.fulfillment} onChange={(e) => set("fulfillment", e.target.value)}>
          <option value="retirada">Retirada / balcão</option>
          <option value="entrega">Entrega</option>
        </select>
        {f.fulfillment === "entrega" && (
          <>
            <select className="field" value={f.neighborhood} onChange={(e) => set("neighborhood", e.target.value)}>
              <option value="">Bairro…</option>
              {zones.map((z) => <option key={z.name} value={z.name}>{z.name} — {formatBRL(z.fee)}</option>)}
            </select>
            <div className="flex gap-2">
              <input className="field" placeholder="Rua" value={f.street} onChange={(e) => set("street", e.target.value)} />
              <input className="field w-24" placeholder="Nº" value={f.number} onChange={(e) => set("number", e.target.value)} />
            </div>
            <input className="field" placeholder="Complemento" value={f.complement} onChange={(e) => set("complement", e.target.value)} />
          </>
        )}
        <label className="label">Data e hora</label>
        <input type="datetime-local" className="field" value={f.when} onChange={(e) => set("when", e.target.value)} />
        <select className="field" value={f.payment} onChange={(e) => set("payment", e.target.value)}>
          {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="field" value={f.status} onChange={(e) => set("status", e.target.value)}>
          <option value="concluido">Venda concluída (já entregue/pago)</option>
          <option value="novo">Encomenda — entra em “Novos”</option>
        </select>
        <textarea className="field" placeholder="Observações" value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        <div className="border-t border-cream-200 pt-3">
          <p className="flex justify-between"><span>Subtotal</span><span>{formatBRL(subtotal)}</span></p>
          {f.fulfillment === "entrega" && <p className="flex justify-between"><span>Entrega</span><span>{formatBRL(fee)}</span></p>}
          <p className="flex justify-between font-serif text-xl font-semibold"><span>Total</span><span>{formatBRL(subtotal + fee)}</span></p>
        </div>
        {error && <p className="text-red-600">{error}</p>}
        <button onClick={save} disabled={saving} className="btn-gold w-full">{saving ? "Salvando…" : "Lançar pedido"}</button>
      </aside>
    </div>
  );
}
