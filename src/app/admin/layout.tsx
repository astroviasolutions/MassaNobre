"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const TABS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/cardapio", label: "Produtos" },
  { href: "/admin/estoque", label: "Estoque" },
  { href: "/admin/despesas", label: "Despesas" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return setSession(null);
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (path.startsWith("/admin/comanda")) return <>{children}</>;

  if (!supabase) {
    return <p className="card mx-auto my-16 max-w-md p-8 text-center">Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no Vercel.</p>;
  }
  if (session === undefined) return <div className="mx-auto my-16 h-40 max-w-md animate-pulse rounded-2xl bg-cream-100" />;

  if (!session) {
    return (
      <form
        className="card mx-auto my-16 max-w-sm space-y-4 p-8"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          const { error } = await supabase!.auth.signInWithPassword({ email, password });
          if (error) setError("E-mail ou senha inválidos.");
        }}
      >
        <h1 className="font-serif text-2xl font-semibold">Área administrativa</h1>
        <input className="field" type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="field" type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-gold w-full">Entrar</button>
      </form>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-cream-200 pb-4">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full px-4 py-2 text-sm font-medium ${path === t.href ? "bg-wood-900 text-gold-200" : "text-wood-700 hover:bg-cream-100"}`}
          >
            {t.label}
          </Link>
        ))}
        <Link href="/admin/pedidos/novo" className="btn-gold ml-auto px-4! py-2!">+ Novo pedido</Link>
        <button onClick={() => supabase!.auth.signOut()} className=" text-sm text-wood-500 hover:text-red-600">
          Sair
        </button>
      </div>
      {children}
    </div>
  );
}
