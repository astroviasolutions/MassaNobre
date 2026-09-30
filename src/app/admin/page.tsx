"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatBRL } from "@/lib/format";
import { PAYMENT_LABELS, type PaymentMethod } from "@/lib/order";

type Basis = "created_at" | "scheduled_for";
interface O {
  id: string; code: string; customer_name: string; status: string; created_at: string; scheduled_for: string;
  payment_method: PaymentMethod; subtotal: number; discount: number; delivery_fee: number | null; total: number;
  order_items: { product_name: string; category: string; unit: string; quantity: number; unit_cost: number; line_total: number; is_gift: boolean }[];
}
interface E { day: string; amount: number; category: string }
interface T { id: string; day: string; amount: number; note: string | null }
interface S { name: string; unit: string; quantity: number; min_quantity: number }

const iso = (d: Date) => d.toLocaleDateString("sv-SE");
const br = (s: string) => s.split("-").reverse().join("/");
const addDays = (s: string, n: number) => { const d = new Date(`${s}T12:00:00`); d.setDate(d.getDate() + n); return iso(d); };
const diffDays = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000);

function preset(p: string): [string, string] {
  const t = iso(new Date());
  const first = `${t.slice(0, 8)}01`;
  switch (p) {
    case "hoje": return [t, t];
    case "ontem": return [addDays(t, -1), addDays(t, -1)];
    case "7d": return [addDays(t, -6), t];
    case "30d": return [addDays(t, -29), t];
    case "mespassado": { const e = addDays(first, -1); return [`${e.slice(0, 8)}01`, e]; }
    default: return [first, t];
  }
}
const PRESETS = [["hoje", "Hoje"], ["ontem", "Ontem"], ["7d", "7 dias"], ["30d", "30 dias"], ["mes", "Este mês"], ["mespassado", "Mês passado"]];

function summarize(orders: O[], expenses: E[], tips: T[]) {
  const valid = orders.filter((o) => o.status !== "cancelado");
  const items = valid.flatMap((o) => o.order_items);
  const gross = valid.reduce((s, o) => s + Number(o.subtotal), 0);
  const discounts = valid.reduce((s, o) => s + Number(o.discount || 0), 0);
  const fees = valid.reduce((s, o) => s + Number(o.delivery_fee || 0), 0);
  const tipsSum = tips.reduce((s, t) => s + Number(t.amount), 0);
  const sales = valid.reduce((s, o) => s + Number(o.total), 0);
  const revenue = sales + tipsSum;
  const cogs = items.reduce((s, i) => s + Number(i.unit_cost) * Number(i.quantity), 0);
  const spent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const profit = revenue - cogs - spent;
  return { valid, items, gross, discounts, fees, tipsSum, sales, revenue, cogs, spent, profit, canceled: orders.length - valid.length };
}

export default function Dashboard() {
  const [basis, setBasis] = useState<Basis>("created_at");
  const [[from, to], setRange] = useState<[string, string]>(preset("mes"));
  const [active, setActive] = useState("mes");
  const [data, setData] = useState<{ o: O[]; e: E[]; t: T[] }>({ o: [], e: [], t: [] });
  const [lowStock, setLowStock] = useState<S[]>([]);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [tip, setTip] = useState({ day: iso(new Date()), amount: "", note: "" });
  const [reload, setReload] = useState(0);

  // Busca o período atual + o anterior (mesmo tamanho) para comparação
  const len = diffDays(from, to) + 1;
  const prevFrom = addDays(from, -len);

  useEffect(() => {
    const start = new Date(`${prevFrom}T00:00:00`).toISOString();
    const end = new Date(`${to}T23:59:59.999`).toISOString();
    Promise.all([
      supabase!.from("orders")
        .select("id,code,customer_name,status,created_at,scheduled_for,payment_method,subtotal,discount,delivery_fee,total,order_items(product_name,category,unit,quantity,unit_cost,line_total,is_gift)")
        .gte(basis, start).lte(basis, end).order(basis),
      supabase!.from("expenses").select("day,amount,category").gte("day", prevFrom).lte("day", to),
      supabase!.from("tips").select("id,day,amount,note").gte("day", prevFrom).lte("day", to).order("day", { ascending: false }),
    ]).then(([o, e, t]) => setData({ o: (o.data as O[]) ?? [], e: (e.data as E[]) ?? [], t: (t.data as T[]) ?? [] }));
    supabase!.from("stock_items").select("name,unit,quantity,min_quantity")
      .then(({ data }) => setLowStock(((data as S[]) ?? []).filter((s) => Number(s.quantity) <= Number(s.min_quantity))));
  }, [basis, prevFrom, to, reload]);

  const dayOf = (o: O) => iso(new Date(o[basis]));
  const inCur = (d: string) => d >= from && d <= to;
  const cur = useMemo(() => summarize(data.o.filter((o) => inCur(dayOf(o))), data.e.filter((e) => inCur(e.day)), data.t.filter((t) => inCur(t.day))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, from, to, basis]);
  const prev = useMemo(() => summarize(data.o.filter((o) => !inCur(dayOf(o))), data.e.filter((e) => !inCur(e.day)), data.t.filter((t) => !inCur(t.day))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, from, to, basis]);

  const days = Array.from({ length: len }, (_, i) => addDays(from, i));
  const daily = days.map((d) => {
    const s = summarize(cur.valid.filter((o) => dayOf(o) === d), data.e.filter((e) => e.day === d), data.t.filter((t) => t.day === d));
    return { d, ...s, orders: cur.valid.filter((o) => dayOf(o) === d) };
  }).reverse();
  const max = Math.max(1, ...daily.map((x) => Math.max(x.revenue, x.spent)));

  const flavors = Object.values(cur.items.filter((i) => !i.is_gift).reduce<Record<string, { name: string; unit: string; qty: number; rev: number }>>((acc, i) => {
    const k = `${i.category}${i.product_name}`;
    acc[k] ??= { name: `${i.category === "empadao" ? "Empadão" : "Empadinha"} ${i.product_name}`, unit: i.unit, qty: 0, rev: 0 };
    acc[k].qty += Number(i.quantity);
    acc[k].rev += Number(i.line_total);
    return acc;
  }, {})).sort((a, b) => b.rev - a.rev);
  const flavorMax = Math.max(1, ...flavors.map((f) => f.rev));

  const payments = (Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => ({ m, v: cur.valid.filter((o) => o.payment_method === m).reduce((s, o) => s + Number(o.total), 0) }));
  const expCats = Object.entries(data.e.filter((e) => inCur(e.day)).reduce<Record<string, number>>((a, e) => ((a[e.category] = (a[e.category] ?? 0) + Number(e.amount)), a), {})).sort((a, b) => b[1] - a[1]);

  const delta = (a: number, b: number) => {
    if (!b) return null;
    const p = ((a - b) / Math.abs(b)) * 100;
    return (
      <span className={`inline-flex items-center text-xs font-semibold ${p >= 0 ? "text-green-700" : "text-red-600"}`}>
        {p >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{Math.abs(p).toFixed(0)}% vs período anterior
      </span>
    );
  };

  async function addTip() {
    if (!(Number(tip.amount) > 0)) return;
    await supabase!.from("tips").insert({ day: tip.day, amount: Number(tip.amount), note: tip.note || null });
    setTip({ ...tip, amount: "", note: "" });
    setReload((r) => r + 1);
  }
  async function delTip(t: T) {
    if (!confirm(`Excluir gorjeta de ${formatBRL(Number(t.amount))}?`)) return;
    await supabase!.from("tips").delete().eq("id", t.id);
    setReload((r) => r + 1);
  }

  const Row = ({ l, v, strong, neg }: { l: string; v: number; strong?: boolean; neg?: boolean }) => (
    <div className={`flex justify-between py-1.5 ${strong ? "border-t border-cream-300 font-semibold" : ""}`}>
      <span>{l}</span><span className={`tabular-nums ${neg ? "text-red-600" : ""}`}>{neg && v ? "−" : ""}{formatBRL(v)}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="card flex flex-wrap items-center gap-2 p-3">
        {PRESETS.map(([p, l]) => (
          <button key={p} onClick={() => { setActive(p); setRange(preset(p)); setOpenDay(null); }}
            className={`rounded-full px-3.5 py-1.5 text-sm ${active === p ? "bg-wood-900 font-semibold text-white" : "text-wood-700 hover:bg-cream-100"}`}>{l}</button>
        ))}
        <div className="flex items-center gap-1 text-sm">
          <input type="date" className="field w-auto px-2! py-1.5!" value={from} onChange={(e) => { setActive(""); setRange([e.target.value, to < e.target.value ? e.target.value : to]); }} />
          até
          <input type="date" className="field w-auto px-2! py-1.5!" value={to} onChange={(e) => { setActive(""); setRange([from > e.target.value ? e.target.value : from, e.target.value]); }} />
        </div>
        <select className="field ml-auto w-auto py-1.5! text-sm" value={basis} onChange={(e) => setBasis(e.target.value as Basis)}>
          <option value="created_at">Pela data da venda</option>
          <option value="scheduled_for">Pela data de entrega</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Receita total", v: formatBRL(cur.revenue), s: delta(cur.revenue, prev.revenue) },
          { l: "Lucro líquido", v: formatBRL(cur.profit), s: <span className="text-xs text-wood-500">margem {cur.revenue ? ((cur.profit / cur.revenue) * 100).toFixed(1) : "0"}% · {delta(cur.profit, prev.profit)}</span>, tone: cur.profit >= 0 ? "text-green-700" : "text-red-600" },
          { l: "Pedidos", v: String(cur.valid.length), s: <span className="text-xs text-wood-500">ticket médio {formatBRL(cur.valid.length ? cur.sales / cur.valid.length : 0)}{cur.canceled ? ` · ${cur.canceled} cancelado(s)` : ""}</span> },
          { l: "Gorjetas", v: formatBRL(cur.tipsSum), s: delta(cur.tipsSum, prev.tipsSum) },
        ].map((k) => (
          <div key={k.l} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-wood-500">{k.l}</p>
            <p className={`mt-1 font-serif text-3xl font-semibold ${k.tone ?? ""}`}>{k.v}</p>
            <div className="mt-1">{k.s}</div>
          </div>
        ))}
      </div>

      {lowStock.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-sm">
          <AlertTriangle className="size-4 text-amber-600" /> Estoque baixo:
          {lowStock.map((s) => <span key={s.name} className="rounded bg-white px-2 py-0.5">{s.name} ({Number(s.quantity)} {s.unit})</span>)}
          <Link href="/admin/estoque" className="ml-auto underline">ver estoque</Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* DRE */}
        <section className="card p-5 text-sm">
          <h2 className="mb-2 font-serif text-lg font-semibold">Resultado do período</h2>
          <Row l="Vendas de produtos" v={cur.gross} />
          <Row l="(−) Descontos / cupons" v={cur.discounts} neg />
          <Row l="(+) Taxas de entrega" v={cur.fees} />
          <Row l="(+) Gorjetas" v={cur.tipsSum} />
          <Row l="= Receita total" v={cur.revenue} strong />
          <Row l="(−) Custo dos produtos" v={cur.cogs} neg />
          <Row l="(−) Despesas" v={cur.spent} neg />
          <Row l="= Lucro líquido" v={cur.profit} strong />
          <h3 className="mt-4 mb-1 text-xs font-semibold uppercase text-wood-500">Recebimentos</h3>
          {payments.map(({ m, v }) => <Row key={m} l={PAYMENT_LABELS[m]} v={v} />)}
        </section>

        {/* Gráfico */}
        <section className="card p-5">
          <div className="mb-3 flex flex-wrap items-center gap-4">
            <h2 className="font-serif text-lg font-semibold">Receita x despesas por dia</h2>
            <span className="flex items-center gap-1 text-xs"><i className="size-3 rounded-sm bg-wood-900" /> receita</span>
            <span className="flex items-center gap-1 text-xs"><i className="size-3 rounded-sm bg-red-400" /> despesas</span>
          </div>
          <div className="flex h-56 items-end gap-1 overflow-x-auto">
            {[...daily].reverse().map((x) => (
              <button key={x.d} onClick={() => setOpenDay(x.d)} className="group flex min-w-5 flex-1 flex-col items-center gap-1" title={`${br(x.d)} · receita ${formatBRL(x.revenue)} · despesas ${formatBRL(x.spent)}`}>
                <div className="flex h-48 w-full items-end justify-center gap-px">
                  <div className="w-1/2 rounded-t bg-wood-900 group-hover:bg-gold-600" style={{ height: `${(x.revenue / max) * 100}%` }} />
                  <div className="w-1/2 rounded-t bg-red-400" style={{ height: `${(x.spent / max) * 100}%` }} />
                </div>
                <span className="text-[9px] text-wood-500">{x.d.slice(8)}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Dia a dia */}
      <section className="card overflow-x-auto">
        <h2 className="px-5 pt-5 font-serif text-lg font-semibold">Dia a dia <span className="text-sm font-normal text-wood-500">(clique no dia para ver os pedidos)</span></h2>
        <table className="mt-3 w-full text-sm">
          <thead className="bg-cream-100 text-left text-xs uppercase text-wood-500">
            <tr><th className="px-5 py-2">Dia</th><th className="text-right">Pedidos</th><th className="text-right">Vendas</th><th className="text-right">Gorjetas</th><th className="text-right">Despesas</th><th className="px-5 text-right">Lucro</th></tr>
          </thead>
          <tbody>
            {daily.filter((x) => x.valid.length || x.spent || x.tipsSum).map((x) => (
              <Fragment key={x.d}>
                <tr onClick={() => setOpenDay(openDay === x.d ? null : x.d)} className="cursor-pointer border-t border-cream-200 hover:bg-cream-50">
                  <td className="px-5 py-2 font-semibold">{br(x.d)}</td>
                  <td className="text-right">{x.valid.length}</td>
                  <td className="text-right tabular-nums">{formatBRL(x.sales)}</td>
                  <td className="text-right tabular-nums">{formatBRL(x.tipsSum)}</td>
                  <td className="text-right tabular-nums text-red-600">{formatBRL(x.spent)}</td>
                  <td className={`px-5 text-right font-semibold tabular-nums ${x.profit >= 0 ? "text-green-700" : "text-red-600"}`}>{formatBRL(x.profit)}</td>
                </tr>
                {openDay === x.d && x.orders.map((o) => (
                  <tr key={o.id} className="bg-cream-50 text-xs">
                    <td className="px-8 py-1.5"><Link href={`/admin/pedidos/${o.id}`} className="underline">#{o.code}</Link></td>
                    <td colSpan={2}>{o.customer_name} · {PAYMENT_LABELS[o.payment_method]}</td>
                    <td colSpan={2} className="text-wood-500">{o.order_items.length} item(ns)</td>
                    <td className="px-5 text-right font-semibold">{formatBRL(Number(o.total))}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
            {!daily.some((x) => x.valid.length || x.spent || x.tipsSum) && <tr><td colSpan={6} className="px-5 py-6 text-center text-wood-500">Sem movimento no período</td></tr>}
          </tbody>
          <tfoot className="border-t-2 border-cream-300 font-semibold">
            <tr><td className="px-5 py-2">Total</td><td className="text-right">{cur.valid.length}</td><td className="text-right">{formatBRL(cur.sales)}</td><td className="text-right">{formatBRL(cur.tipsSum)}</td><td className="text-right text-red-600">{formatBRL(cur.spent)}</td><td className="px-5 text-right">{formatBRL(cur.profit)}</td></tr>
          </tfoot>
        </table>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5">
          <h2 className="mb-3 font-serif text-lg font-semibold">Mais vendidos</h2>
          {flavors.map((f) => (
            <div key={f.name} className="mb-2 text-sm">
              <div className="flex justify-between"><span>{f.name}</span><b>{formatBRL(f.rev)}</b></div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded bg-cream-200"><div className="h-1.5 rounded bg-gold-500" style={{ width: `${(f.rev / flavorMax) * 100}%` }} /></div>
                <span className="text-xs text-wood-500">{f.qty.toLocaleString("pt-BR")} {f.unit}</span>
              </div>
            </div>
          ))}
          {!flavors.length && <p className="text-sm text-wood-500">Sem vendas no período</p>}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-serif text-lg font-semibold">Despesas por categoria</h2>
          {expCats.map(([c, v]) => <div key={c} className="flex justify-between border-b border-cream-200 py-1.5 text-sm last:border-0"><span>{c}</span><b>{formatBRL(v)}</b></div>)}
          {!expCats.length && <p className="text-sm text-wood-500">Nenhuma despesa</p>}
          <Link href="/admin/despesas" className="mt-3 inline-block text-sm underline">lançar despesa</Link>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-serif text-lg font-semibold">Gorjetas</h2>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <input type="date" className="field px-2! py-1.5!" value={tip.day} onChange={(e) => setTip({ ...tip, day: e.target.value })} />
            <input type="number" step="0.01" className="field px-2! py-1.5!" placeholder="Valor" value={tip.amount} onChange={(e) => setTip({ ...tip, amount: e.target.value })} />
            <input className="field col-span-2 px-2! py-1.5!" placeholder="Observação (ex.: pedido #MN-…, entregador)" value={tip.note} onChange={(e) => setTip({ ...tip, note: e.target.value })} />
            <button onClick={addTip} className="btn-gold col-span-2 py-2!"><Plus className="size-4" /> Lançar gorjeta</button>
          </div>
          {data.t.filter((t) => inCur(t.day)).map((t) => (
            <div key={t.id} className="flex items-center justify-between border-b border-cream-200 py-1.5 text-sm last:border-0">
              <span>{br(t.day)} {t.note && <span className="text-wood-500">· {t.note}</span>}</span>
              <span className="flex items-center gap-2"><b>{formatBRL(Number(t.amount))}</b>
                <button onClick={() => delTip(t)} className="text-wood-300 hover:text-red-600"><Trash2 className="size-3.5" /></button></span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
