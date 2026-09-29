"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatBRL } from "@/lib/format";
import { PAYMENT_LABELS, type PaymentMethod } from "@/lib/order";

type Period = "hoje" | "7d" | "30d" | "mes";
const PERIODS: [Period, string][] = [["hoje", "Hoje"], ["7d", "7 dias"], ["30d", "30 dias"], ["mes", "Este mês"]];

interface O {
  total: number;
  status: string;
  scheduled_for: string;
  payment_method: PaymentMethod;
  order_items: { product_name: string; category: string; unit: string; quantity: number; unit_cost: number; line_total: number }[];
}
interface E { day: string; amount: number; category: string }
interface S { name: string; unit: string; quantity: number; min_quantity: number }

const iso = (d: Date) => d.toLocaleDateString("sv-SE");

function range(p: Period) {
  const end = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (p === "7d") start.setDate(start.getDate() - 6);
  if (p === "30d") start.setDate(start.getDate() - 29);
  if (p === "mes") start.setDate(1);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("mes");
  const [orders, setOrders] = useState<O[]>([]);
  const [expenses, setExpenses] = useState<E[]>([]);
  const [lowStock, setLowStock] = useState<S[]>([]);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const { start, end } = range(period);
    supabase!.from("orders")
      .select("total,status,scheduled_for,payment_method,order_items(product_name,category,unit,quantity,unit_cost,line_total)")
      .neq("status", "cancelado").gte("scheduled_for", start.toISOString()).lte("scheduled_for", end.toISOString())
      .then(({ data }) => setOrders((data as O[]) ?? []));
    supabase!.from("expenses").select("day,amount,category").gte("day", iso(start)).lte("day", iso(end))
      .then(({ data }) => setExpenses((data as E[]) ?? []));
    supabase!.from("stock_items").select("name,unit,quantity,min_quantity")
      .then(({ data }) => setLowStock(((data as S[]) ?? []).filter((s) => Number(s.quantity) <= Number(s.min_quantity))));
    supabase!.from("orders").select("id", { count: "exact", head: true }).in("status", ["novo", "em_preparacao"])
      .then(({ count }) => setPending(count ?? 0));
  }, [period]);

  const revenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const items = orders.flatMap((o) => o.order_items);
  const cogs = items.reduce((s, i) => s + Number(i.unit_cost) * Number(i.quantity), 0);
  const spent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const profit = revenue - cogs - spent;

  // Série diária
  const { start } = range(period);
  const days: string[] = [];
  for (const d = new Date(start); d <= new Date(); d.setDate(d.getDate() + 1)) days.push(iso(d));
  const byDay = days.map((d) => ({
    d,
    rev: orders.filter((o) => iso(new Date(o.scheduled_for)) === d).reduce((s, o) => s + Number(o.total), 0),
    exp: expenses.filter((e) => e.day === d).reduce((s, e) => s + Number(e.amount), 0),
  }));
  const max = Math.max(1, ...byDay.map((x) => Math.max(x.rev, x.exp)));

  const flavors = Object.values(
    items.reduce<Record<string, { name: string; unit: string; qty: number; rev: number }>>((acc, i) => {
      const k = `${i.category} ${i.product_name}`;
      acc[k] ??= { name: `${i.category === "empadao" ? "Empadão" : "Empadinha"} ${i.product_name}`, unit: i.unit, qty: 0, rev: 0 };
      acc[k].qty += Number(i.quantity);
      acc[k].rev += Number(i.line_total);
      return acc;
    }, {}),
  ).sort((a, b) => b.rev - a.rev);

  const byPayment = (Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => ({
    m,
    v: orders.filter((o) => o.payment_method === m).reduce((s, o) => s + Number(o.total), 0),
  }));
  const byExpCat = Object.entries(expenses.reduce<Record<string, number>>((a, e) => ((a[e.category] = (a[e.category] ?? 0) + Number(e.amount)), a), {}))
    .sort((a, b) => b[1] - a[1]);

  const kpis: [string, string, string?][] = [
    ["Faturamento", formatBRL(revenue)],
    ["Pedidos", String(orders.length), `ticket médio ${formatBRL(orders.length ? revenue / orders.length : 0)}`],
    ["Custo dos produtos", formatBRL(cogs)],
    ["Despesas", formatBRL(spent)],
    ["Lucro líquido", formatBRL(profit), revenue ? `margem ${((profit / revenue) * 100).toFixed(1)}%` : undefined],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map(([p, l]) => (
          <button key={p} onClick={() => setPeriod(p)} className={`rounded-full px-4 py-1.5 text-sm ${period === p ? "bg-gold-400 font-semibold text-wood-950" : "bg-cream-100 text-wood-700"}`}>{l}</button>
        ))}
        <Link href="/admin/pedidos" className="ml-auto rounded-full bg-wood-900 px-4 py-1.5 text-sm text-gold-200">{pending} pedido(s) em aberto →</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map(([l, v, sub], i) => (
          <div key={l} className={`card p-5 ${i === 4 ? (profit >= 0 ? "ring-2 ring-green-600/40" : "ring-2 ring-red-500/40") : ""}`}>
            <p className="text-xs uppercase tracking-wider text-wood-500">{l}</p>
            <p className={`font-serif text-2xl font-semibold ${i === 4 ? (profit >= 0 ? "text-green-700" : "text-red-600") : ""}`}>{v}</p>
            {sub && <p className="text-xs text-wood-500">{sub}</p>}
          </div>
        ))}
      </div>

      {lowStock.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
          <AlertTriangle className="size-4 text-amber-600" /> Estoque baixo:
          {lowStock.map((s) => <span key={s.name} className="rounded bg-white px-2 py-0.5">{s.name} ({Number(s.quantity)} {s.unit})</span>)}
          <Link href="/admin/estoque" className="ml-auto text-amber-700 underline">ver estoque</Link>
        </div>
      )}

      <section className="card p-5">
        <div className="mb-3 flex items-center gap-4">
          <h2 className="font-serif text-lg font-semibold">Vendas x despesas por dia</h2>
          <span className="flex items-center gap-1 text-xs"><i className="size-3 rounded-sm bg-gold-500" /> vendas</span>
          <span className="flex items-center gap-1 text-xs"><i className="size-3 rounded-sm bg-red-400" /> despesas</span>
        </div>
        <div className="flex h-48 items-end gap-1 overflow-x-auto">
          {byDay.map((x) => (
            <div key={x.d} className="flex min-w-4 flex-1 flex-col items-center gap-1" title={`${x.d.split("-").reverse().join("/")}: ${formatBRL(x.rev)} / ${formatBRL(x.exp)}`}>
              <div className="flex h-40 w-full items-end justify-center gap-px">
                <div className="w-1/2 rounded-t bg-gold-500" style={{ height: `${(x.rev / max) * 100}%` }} />
                <div className="w-1/2 rounded-t bg-red-400" style={{ height: `${(x.exp / max) * 100}%` }} />
              </div>
              <span className="text-[9px] text-wood-500">{x.d.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-1">
          <h2 className="mb-3 font-serif text-lg font-semibold">Sabores mais vendidos</h2>
          {flavors.map((f) => (
            <div key={f.name} className="flex justify-between border-b border-cream-200 py-1.5 text-sm last:border-0">
              <span>{f.name}</span>
              <span className="text-wood-500">{f.qty.toLocaleString("pt-BR")} {f.unit} · <b className="text-wood-900">{formatBRL(f.rev)}</b></span>
            </div>
          ))}
          {!flavors.length && <p className="text-sm text-wood-500">Sem vendas no período</p>}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-serif text-lg font-semibold">Recebimentos</h2>
          {byPayment.map(({ m, v }) => (
            <div key={m} className="flex justify-between border-b border-cream-200 py-1.5 text-sm last:border-0"><span>{PAYMENT_LABELS[m]}</span><b>{formatBRL(v)}</b></div>
          ))}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-serif text-lg font-semibold">Despesas por categoria</h2>
          {byExpCat.map(([c, v]) => (
            <div key={c} className="flex justify-between border-b border-cream-200 py-1.5 text-sm last:border-0"><span>{c}</span><b>{formatBRL(v)}</b></div>
          ))}
          {!byExpCat.length && <p className="text-sm text-wood-500">Nenhuma despesa lançada</p>}
        </section>
      </div>
    </div>
  );
}
