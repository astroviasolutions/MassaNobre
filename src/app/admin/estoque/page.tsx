"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatBRL } from "@/lib/format";

interface Item { id: string; name: string; unit: string; quantity: number; min_quantity: number; cost_per_unit: number }
interface Mov { id: string; kind: string; quantity: number; note: string | null; created_at: string; stock_items: { name: string; unit: string } | null }

const empty = { name: "", unit: "kg", quantity: "", min_quantity: "", cost_per_unit: "" };

export default function EstoquePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [n, setN] = useState(empty);
  const [move, setMove] = useState<{ item: Item; kind: "entrada" | "saida" } | null>(null);
  const [mq, setMq] = useState("");
  const [expense, setExpense] = useState(true);

  const load = () => {
    supabase!.from("stock_items").select("*").order("name").then(({ data }) => setItems((data as Item[]) ?? []));
    supabase!.from("stock_movements").select("id,kind,quantity,note,created_at,stock_items(name,unit)").order("created_at", { ascending: false }).limit(15)
      .then(({ data }) => setMovs((data as unknown as Mov[]) ?? []));
  };
  useEffect(load, []);

  async function create() {
    if (!n.name.trim()) return;
    await supabase!.from("stock_items").insert({
      name: n.name.trim(), unit: n.unit, quantity: Number(n.quantity || 0), min_quantity: Number(n.min_quantity || 0), cost_per_unit: Number(n.cost_per_unit || 0),
    });
    setN(empty);
    load();
  }

  async function confirmMove() {
    if (!move || !(Number(mq) > 0)) return;
    const q = Number(mq);
    await supabase!.from("stock_movements").insert({ item_id: move.item.id, kind: move.kind, quantity: q });
    if (move.kind === "entrada" && expense && move.item.cost_per_unit > 0) {
      await supabase!.from("expenses").insert({
        category: "Ingredientes", description: `Compra: ${q} ${move.item.unit} de ${move.item.name}`, amount: q * Number(move.item.cost_per_unit),
      });
    }
    setMove(null);
    setMq("");
    load();
  }

  const total = items.reduce((s, i) => s + Number(i.quantity) * Number(i.cost_per_unit), 0);

  return (
    <div className="space-y-6">
      <section className="card grid gap-3 p-5 sm:grid-cols-6">
        <h2 className="font-serif text-lg font-semibold sm:col-span-6">Cadastrar insumo</h2>
        <input className="field sm:col-span-2" placeholder="Nome (ex.: Farinha de trigo)" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
        <select className="field" value={n.unit} onChange={(e) => setN({ ...n, unit: e.target.value })}>
          {["kg", "g", "L", "un", "pct", "cx"].map((u) => <option key={u}>{u}</option>)}
        </select>
        <input className="field" type="number" placeholder="Qtd. atual" value={n.quantity} onChange={(e) => setN({ ...n, quantity: e.target.value })} />
        <input className="field" type="number" placeholder="Mínimo" value={n.min_quantity} onChange={(e) => setN({ ...n, min_quantity: e.target.value })} />
        <input className="field" type="number" step="0.01" placeholder="Custo/unid." value={n.cost_per_unit} onChange={(e) => setN({ ...n, cost_per_unit: e.target.value })} />
        <button onClick={create} className="btn-gold sm:col-span-6 sm:justify-self-end"><Plus className="size-4" /> Adicionar insumo</button>
      </section>

      <div className="card overflow-x-auto">
        <div className="border-b border-cream-200 px-5 py-3 text-sm text-wood-700">Valor em estoque: <b>{formatBRL(total)}</b></div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-wood-500">
            <tr><th className="px-5 py-2">Insumo</th><th>Quantidade</th><th>Mínimo</th><th>Custo/unid.</th><th className="px-5 text-right">Movimentar</th></tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const low = Number(i.quantity) <= Number(i.min_quantity);
              return (
                <tr key={i.id} className={`border-t border-cream-200 ${low ? "bg-amber-50" : ""}`}>
                  <td className="px-5 py-2 font-semibold">{i.name} {low && <span className="ml-1 rounded bg-amber-200 px-1.5 text-[10px] uppercase">repor</span>}</td>
                  <td>{Number(i.quantity).toLocaleString("pt-BR")} {i.unit}</td>
                  <td className="text-wood-500">{Number(i.min_quantity).toLocaleString("pt-BR")} {i.unit}</td>
                  <td>{formatBRL(Number(i.cost_per_unit))}</td>
                  <td className="px-5 py-2 text-right">
                    <button onClick={() => setMove({ item: i, kind: "entrada" })} className="mr-1 rounded bg-green-600 p-1.5 text-white" title="Entrada"><Plus className="size-4" /></button>
                    <button onClick={() => setMove({ item: i, kind: "saida" })} className="rounded bg-wood-700 p-1.5 text-white" title="Saída"><Minus className="size-4" /></button>
                  </td>
                </tr>
              );
            })}
            {!items.length && <tr><td className="px-5 py-6 text-center text-wood-500" colSpan={5}>Nenhum insumo cadastrado</td></tr>}
          </tbody>
        </table>
      </div>

      {move && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setMove(null)}>
          <div className="card w-full max-w-sm space-y-3 bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg font-semibold">{move.kind === "entrada" ? "Entrada" : "Saída"} · {move.item.name}</h3>
            <input autoFocus className="field" type="number" step="0.01" placeholder={`Quantidade (${move.item.unit})`} value={mq} onChange={(e) => setMq(e.target.value)} />
            {move.kind === "entrada" && move.item.cost_per_unit > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={expense} onChange={(e) => setExpense(e.target.checked)} />
                Lançar {formatBRL(Number(mq || 0) * Number(move.item.cost_per_unit))} em despesas
              </label>
            )}
            <button onClick={confirmMove} className="btn-gold w-full">Confirmar</button>
          </div>
        </div>
      )}

      <section className="card p-5">
        <h2 className="mb-3 font-serif text-lg font-semibold">Últimas movimentações</h2>
        {movs.map((m) => (
          <p key={m.id} className="flex justify-between border-b border-cream-200 py-1.5 text-sm last:border-0">
            <span>{m.kind === "entrada" ? "➕" : "➖"} {Number(m.quantity).toLocaleString("pt-BR")} {m.stock_items?.unit} · {m.stock_items?.name}</span>
            <span className="text-wood-500">{new Date(m.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
          </p>
        ))}
        {!movs.length && <p className="text-sm text-wood-500">Sem movimentações</p>}
      </section>
    </div>
  );
}
