"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatBRL } from "@/lib/format";

interface Day { day: string; orders: number; revenue: number }
interface Flavor { product_name: string; category: string; unit: string; qty_sold: number; revenue: number; month: string }

export default function RelatoriosPage() {
  const [days, setDays] = useState<Day[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const month = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    supabase!.from("report_daily_revenue").select("day,orders,revenue").gte("day", since).order("day", { ascending: false })
      .then(({ data }) => setDays((data as Day[]) ?? []));
    supabase!.from("report_top_flavors").select("*").eq("month", `${month}-01`).order("revenue", { ascending: false })
      .then(({ data }) => setFlavors((data as Flavor[]) ?? []));
  }, [month]);

  const today = new Date().toLocaleDateString("sv-SE");
  const sum = (list: Day[]) => list.reduce((s, d) => s + Number(d.revenue), 0);
  const monthDays = days.filter((d) => d.day.startsWith(month));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Hoje", sum(days.filter((d) => d.day === today))],
          ["Este mês", sum(monthDays)],
          ["Pedidos no mês", monthDays.reduce((s, d) => s + Number(d.orders), 0)],
        ].map(([label, v], i) => (
          <div key={label as string} className="card p-5">
            <p className="text-xs uppercase tracking-wider text-wood-500">{label}</p>
            <p className="font-serif text-3xl font-semibold">{i < 2 ? formatBRL(v as number) : v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-serif text-lg font-semibold">Sabores mais vendidos (mês)</h2>
          <table className="w-full text-sm">
            <tbody>
              {flavors.map((f, i) => (
                <tr key={i} className="border-b border-cream-200 last:border-0">
                  <td className="py-2">{f.category === "empadao" ? "Empadão" : "Empadinha"} {f.product_name}</td>
                  <td className="py-2 text-right text-wood-500">{Number(f.qty_sold).toLocaleString("pt-BR")} {f.unit}</td>
                  <td className="py-2 text-right font-semibold">{formatBRL(Number(f.revenue))}</td>
                </tr>
              ))}
              {!flavors.length && <tr><td className="py-4 text-center text-wood-500">Sem vendas neste mês</td></tr>}
            </tbody>
          </table>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-serif text-lg font-semibold">Faturamento diário (30 dias)</h2>
          <table className="w-full text-sm">
            <tbody>
              {days.map((d) => (
                <tr key={d.day} className="border-b border-cream-200 last:border-0">
                  <td className="py-2">{d.day.split("-").reverse().join("/")}</td>
                  <td className="py-2 text-right text-wood-500">{d.orders} pedidos</td>
                  <td className="py-2 text-right font-semibold">{formatBRL(Number(d.revenue))}</td>
                </tr>
              ))}
              {!days.length && <tr><td className="py-4 text-center text-wood-500">Sem pedidos</td></tr>}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
