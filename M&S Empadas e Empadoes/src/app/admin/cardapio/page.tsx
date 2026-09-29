"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Row {
  id: string;
  name: string;
  category: "empadao" | "empadinha";
  unit: "kg" | "un";
  price: number;
  is_available: boolean;
}

export default function CardapioPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    supabase!
      .from("products")
      .select("id,name,category,unit,price,is_available")
      .eq("is_archived", false)
      .order("category")
      .order("sort_order")
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, []);

  async function update(r: Row, patch: Partial<Row>) {
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...patch } : x)));
    const { error } = await supabase!.from("products").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", r.id);
    setSaved(error ? "Erro ao salvar" : "Salvo ✓");
    setTimeout(() => setSaved(""), 1500);
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-cream-200 px-5 py-3">
        <p className="text-sm text-wood-700">Desligue um sabor para pausar a venda (aparece como “Esgotado hoje” no site em até 30 s).</p>
        <span className="text-sm text-gold-700">{saved}</span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-cream-200 last:border-0">
              <td className="px-5 py-3">
                <span className="text-[11px] uppercase text-gold-600">{r.category === "empadao" ? "Empadão" : "Empadinha"}</span>
                <p className="font-serif font-semibold">{r.name}</p>
              </td>
              <td className="px-3 py-3">
                <label className="flex items-center gap-1">
                  R$
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    defaultValue={r.price}
                    onBlur={(e) => Number(e.target.value) !== Number(r.price) && update(r, { price: Number(e.target.value) })}
                    className="field w-24 px-2! py-1.5!"
                  />
                  <span className="text-wood-500">/{r.unit === "kg" ? "kg" : "un."}</span>
                </label>
              </td>
              <td className="px-5 py-3 text-right">
                <button
                  role="switch"
                  aria-checked={r.is_available}
                  onClick={() => update(r, { is_available: !r.is_available })}
                  className={`relative h-7 w-12 rounded-full transition ${r.is_available ? "bg-green-600" : "bg-wood-300"}`}
                >
                  <span className={`absolute top-1 size-5 rounded-full bg-white transition-all ${r.is_available ? "left-6" : "left-1"}`} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
