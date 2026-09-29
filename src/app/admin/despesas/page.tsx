"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatBRL } from "@/lib/format";

interface Exp { id: string; day: string; category: string; description: string; amount: number }

const CATEGORIES = ["Ingredientes", "Embalagens", "Gás / energia", "Entregas", "Aluguel", "Funcionários", "Marketing", "Equipamentos", "Outros"];
const today = () => new Date().toLocaleDateString("sv-SE");

export default function DespesasPage() {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [list, setList] = useState<Exp[]>([]);
  const [n, setN] = useState({ day: today(), category: "Ingredientes", description: "", amount: "" });

  const load = () => {
    const [y, m] = month.split("-").map(Number);
    const end = new Date(y, m, 0).toLocaleDateString("sv-SE");
    supabase!.from("expenses").select("*").gte("day", `${month}-01`).lte("day", end).order("day", { ascending: false })
      .then(({ data }) => setList((data as Exp[]) ?? []));
  };
  useEffect(load, [month]);

  async function add() {
    if (!n.description.trim() || !(Number(n.amount) > 0)) return;
    await supabase!.from("expenses").insert({ ...n, amount: Number(n.amount) });
    setN({ ...n, description: "", amount: "" });
    load();
  }

  async function remove(e: Exp) {
    if (!confirm(`Excluir "${e.description}"?`)) return;
    await supabase!.from("expenses").delete().eq("id", e.id);
    load();
  }

  const total = list.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <section className="card grid gap-3 p-5 sm:grid-cols-6">
        <h2 className="font-serif text-lg font-semibold sm:col-span-6">Lançar despesa</h2>
        <input className="field" type="date" value={n.day} onChange={(e) => setN({ ...n, day: e.target.value })} />
        <select className="field" value={n.category} onChange={(e) => setN({ ...n, category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input className="field sm:col-span-2" placeholder="Descrição" value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} />
        <input className="field" type="number" step="0.01" placeholder="Valor" value={n.amount} onChange={(e) => setN({ ...n, amount: e.target.value })} />
        <button onClick={add} className="btn-gold"><Plus className="size-4" /> Lançar</button>
      </section>

      <div className="card overflow-x-auto">
        <div className="flex items-center justify-between border-b border-cream-200 px-5 py-3 text-sm">
          <input type="month" className="field w-auto py-1.5!" value={month} onChange={(e) => setMonth(e.target.value)} />
          <span>Total do mês: <b className="text-red-600">{formatBRL(total)}</b></span>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {list.map((e) => (
              <tr key={e.id} className="border-t border-cream-200">
                <td className="px-5 py-2 text-wood-500">{e.day.split("-").reverse().join("/")}</td>
                <td><span className="rounded bg-cream-100 px-2 py-0.5 text-xs">{e.category}</span></td>
                <td>{e.description}</td>
                <td className="text-right font-semibold">{formatBRL(Number(e.amount))}</td>
                <td className="px-5 text-right">
                  <button onClick={() => remove(e)} className="text-wood-300 hover:text-red-600"><Trash2 className="size-4" /></button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td className="px-5 py-6 text-center text-wood-500">Nenhuma despesa neste mês</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
