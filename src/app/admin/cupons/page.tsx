"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatBRL } from "@/lib/format";

interface Coupon {
  id: string;
  code: string | null;
  description: string;
  kind: "percent" | "fixed" | "free_delivery";
  value: number;
  min_order: number;
  auto: boolean;
  active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  uses: number;
}

const KINDS = { percent: "% de desconto", fixed: "R$ de desconto", free_delivery: "Entrega grátis" };
const empty = { code: "", description: "", kind: "percent" as Coupon["kind"], value: "", min_order: "", expires_at: "", max_uses: "", auto: false };

export default function CuponsPage() {
  const [list, setList] = useState<Coupon[]>([]);
  const [n, setN] = useState(empty);
  const [err, setErr] = useState("");

  const load = () => {
    supabase!.from("coupons").select("*").order("created_at", { ascending: false }).then(({ data }) => setList((data as Coupon[]) ?? []));
  };
  useEffect(load, []);

  async function create() {
    setErr("");
    if (!n.description.trim()) return setErr("Dê um nome/descrição para a promoção.");
    if (!n.auto && !n.code.trim()) return setErr("Informe o código do cupom (ou marque como automática).");
    const { error } = await supabase!.from("coupons").insert({
      code: n.auto && !n.code.trim() ? null : n.code.trim().toUpperCase(),
      description: n.description.trim(),
      kind: n.kind,
      value: Number(n.value || 0),
      min_order: Number(n.min_order || 0),
      expires_at: n.expires_at || null,
      max_uses: n.max_uses ? Number(n.max_uses) : null,
      auto: n.auto,
    });
    if (error) return setErr(error.message.includes("duplicate") ? "Já existe um cupom com esse código." : error.message);
    setN(empty);
    load();
  }

  async function toggle(c: Coupon) {
    setList((l) => l.map((x) => (x.id === c.id ? { ...x, active: !c.active } : x)));
    await supabase!.from("coupons").update({ active: !c.active }).eq("id", c.id);
  }

  async function remove(c: Coupon) {
    if (!confirm(`Excluir "${c.description}"?`)) return;
    await supabase!.from("coupons").delete().eq("id", c.id);
    load();
  }

  const rule = (c: Coupon) =>
    `${c.kind === "percent" ? `${Number(c.value)}% off` : c.kind === "fixed" ? `${formatBRL(Number(c.value))} off` : "Entrega grátis"}` +
    (Number(c.min_order) ? ` · pedidos a partir de ${formatBRL(Number(c.min_order))}` : "") +
    (c.expires_at ? ` · até ${c.expires_at.split("-").reverse().join("/")}` : "") +
    (c.max_uses ? ` · ${c.uses}/${c.max_uses} usos` : ` · ${c.uses} usos`);

  return (
    <div className="space-y-6">
      <section className="card grid gap-3 p-5 sm:grid-cols-4">
        <h2 className="font-serif text-lg font-semibold sm:col-span-4">Criar cupom ou promoção</h2>
        <input className="field sm:col-span-2" placeholder="Descrição (ex.: Entrega grátis acima de R$ 100)" value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} />
        <input className="field uppercase" placeholder="Código (ex.: BEMVINDO10)" value={n.code} onChange={(e) => setN({ ...n, code: e.target.value })} />
        <select className="field" value={n.kind} onChange={(e) => setN({ ...n, kind: e.target.value as Coupon["kind"] })}>
          {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {n.kind !== "free_delivery" && (
          <input className="field" type="number" placeholder={n.kind === "percent" ? "Desconto (%)" : "Desconto (R$)"} value={n.value} onChange={(e) => setN({ ...n, value: e.target.value })} />
        )}
        <input className="field" type="number" placeholder="Pedido mínimo (R$)" value={n.min_order} onChange={(e) => setN({ ...n, min_order: e.target.value })} />
        <label className="text-xs text-wood-500">Válido até<input className="field" type="date" value={n.expires_at} onChange={(e) => setN({ ...n, expires_at: e.target.value })} /></label>
        <input className="field" type="number" placeholder="Limite de usos (opcional)" value={n.max_uses} onChange={(e) => setN({ ...n, max_uses: e.target.value })} />
        <label className="flex items-center gap-2 text-sm sm:col-span-3">
          <input type="checkbox" checked={n.auto} onChange={(e) => setN({ ...n, auto: e.target.checked })} />
          Promoção automática — aplica sozinha no site quando o pedido atinge o mínimo (sem digitar código)
        </label>
        <button onClick={create} className="btn-gold"><Plus className="size-4" /> Criar</button>
        {err && <p className="text-sm text-red-600 sm:col-span-4">{err}</p>}
      </section>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-t border-cream-200 first:border-0">
                <td className="px-5 py-3">
                  <p className="font-semibold">{c.description}</p>
                  <p className="text-xs text-wood-500">{rule(c)}</p>
                </td>
                <td>
                  {c.code ? <code className="rounded bg-cream-100 px-2 py-1 font-semibold">{c.code}</code> : null}
                  {c.auto && <span className="ml-2 rounded bg-sage-200 px-2 py-1 text-xs">automática</span>}
                </td>
                <td className="px-5 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button role="switch" aria-checked={c.active} onClick={() => toggle(c)} className={`relative h-7 w-12 rounded-full transition ${c.active ? "bg-green-600" : "bg-wood-300"}`}>
                      <span className={`absolute top-1 size-5 rounded-full bg-white transition-all ${c.active ? "left-6" : "left-1"}`} />
                    </button>
                    <button onClick={() => remove(c)} className="text-wood-300 hover:text-red-600" title="Excluir"><Trash2 className="size-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td className="px-5 py-6 text-center text-wood-500">Nenhum cupom criado</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
