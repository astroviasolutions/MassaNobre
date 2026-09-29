"use client";

import { useEffect, useState } from "react";
import { Archive, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatBRL } from "@/lib/format";

interface Row {
  id: string;
  name: string;
  description: string | null;
  category: "empadao" | "empadinha";
  unit: "kg" | "un";
  price: number;
  cost: number;
  is_available: boolean;
}

const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const empty = { name: "", description: "", category: "empadinha" as Row["category"], price: "", cost: "" };

export default function ProdutosPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const [n, setN] = useState(empty);

  const load = () => {
    supabase!.from("products").select("id,name,description,category,unit,price,cost,is_available").eq("is_archived", false)
      .order("category").order("sort_order").then(({ data }) => setRows((data as Row[]) ?? []));
  };
  useEffect(load, []);

  const flash = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 1800);
  };

  async function update(r: Row, patch: Partial<Row> & { is_archived?: boolean }) {
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...patch } : x)));
    const { error } = await supabase!.from("products").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", r.id);
    flash(error ? "Erro ao salvar" : "Salvo ✓");
    if (patch.is_archived) load();
  }

  async function create() {
    if (!n.name.trim() || !n.price) return flash("Preencha nome e preço");
    const { error } = await supabase!.from("products").insert({
      slug: `${n.category}-${slugify(n.name)}-${Date.now().toString(36).slice(-3)}`,
      name: n.name.trim(),
      description: n.description || null,
      category: n.category,
      unit: n.category === "empadao" ? "kg" : "un",
      price: Number(n.price),
      cost: Number(n.cost || 0),
      sort_order: rows.length + 1,
    });
    if (error) return flash(`Erro: ${error.message}`);
    setN(empty);
    flash("Produto cadastrado ✓");
    load();
  }

  const num = "field w-24 px-2! py-1.5!";

  return (
    <div className="space-y-6">
      <section className="card grid gap-3 p-5 sm:grid-cols-6">
        <h2 className="font-serif text-lg font-semibold sm:col-span-6">Cadastrar produto</h2>
        <input className="field sm:col-span-2" placeholder="Nome (ex.: Carne seca)" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
        <select className="field" value={n.category} onChange={(e) => setN({ ...n, category: e.target.value as Row["category"] })}>
          <option value="empadinha">Empadinha (un.)</option>
          <option value="empadao">Empadão (kg)</option>
        </select>
        <input className="field" type="number" step="0.5" placeholder="Preço" value={n.price} onChange={(e) => setN({ ...n, price: e.target.value })} />
        <input className="field" type="number" step="0.1" placeholder="Custo" value={n.cost} onChange={(e) => setN({ ...n, cost: e.target.value })} />
        <button onClick={create} className="btn-gold"><Plus className="size-4" /> Adicionar</button>
        <input className="field sm:col-span-6" placeholder="Descrição (aparece no site)" value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} />
      </section>

      <div className="card overflow-x-auto">
        <div className="flex items-center justify-between border-b border-cream-200 px-5 py-3 text-sm text-wood-700">
          <span>Desligue para pausar a venda (“Esgotado hoje” no site). Custo = quanto custa produzir 1 kg ou 1 unidade.</span>
          <span className="text-gold-700">{msg}</span>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-wood-500">
            <tr><th className="px-5 py-2">Produto</th><th>Preço</th><th>Custo</th><th>Lucro</th><th className="px-5 text-right">À venda</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-cream-200">
                <td className="px-5 py-2">
                  <span className="text-[11px] uppercase text-gold-600">{r.category === "empadao" ? "Empadão · kg" : "Empadinha · un."}</span>
                  <input className="block w-full bg-transparent font-serif font-semibold outline-none" defaultValue={r.name}
                    onBlur={(e) => e.target.value !== r.name && update(r, { name: e.target.value })} />
                </td>
                <td><input type="number" step="0.5" className={num} defaultValue={r.price} onBlur={(e) => Number(e.target.value) !== Number(r.price) && update(r, { price: Number(e.target.value) })} /></td>
                <td><input type="number" step="0.1" className={num} defaultValue={r.cost} onBlur={(e) => Number(e.target.value) !== Number(r.cost) && update(r, { cost: Number(e.target.value) })} /></td>
                <td className="text-green-700">{formatBRL(Number(r.price) - Number(r.cost))}</td>
                <td className="px-5 py-2">
                  <div className="flex items-center justify-end gap-3">
                    <button role="switch" aria-checked={r.is_available} onClick={() => update(r, { is_available: !r.is_available })}
                      className={`relative h-7 w-12 rounded-full transition ${r.is_available ? "bg-green-600" : "bg-wood-300"}`}>
                      <span className={`absolute top-1 size-5 rounded-full bg-white transition-all ${r.is_available ? "left-6" : "left-1"}`} />
                    </button>
                    <button title="Remover do cardápio" onClick={() => confirm(`Remover "${r.name}" do cardápio?`) && update(r, { is_archived: true })} className="text-wood-300 hover:text-red-600">
                      <Archive className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
