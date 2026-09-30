"use client";

import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";

export function SiteHeader() {
  const { count, open, hydrated } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-sage-200 bg-cream-50/95 backdrop-blur supports-[backdrop-filter]:bg-cream-50/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-20 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/brand/emblema.jpg"
            alt="Emblema M&S Empadas e Empadões"
            width={52}
            height={52}
            className="size-11 rounded-full ring-1 ring-gold-500/60 sm:size-13"
            priority
          />
          <div className="leading-tight">
            <span className="text-gold-foil block font-serif text-lg font-semibold tracking-wide sm:text-xl">M&amp;S Empadas</span>
            <span className="hidden text-[10px] tracking-[0.25em] text-sage-600 uppercase sm:block">Empadas & Empadinhas</span>
          </div>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-6">
          <Link href="/#cardapio" className="hidden text-sm tracking-wide text-wood-700 transition hover:text-gold-600 sm:block">
            Cardápio
          </Link>
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-wood-700 transition hover:text-gold-600" aria-label="Área administrativa">
            <LayoutDashboard className="size-4" /> <span className="hidden sm:inline">Admin</span>
          </Link>
          <button
            type="button"
            onClick={open}
            className="relative inline-flex items-center gap-2 rounded-full border border-gold-500/60 px-4 py-2 text-sm font-medium text-wood-800 transition hover:border-gold-500 hover:bg-gold-300/20"
            aria-label={`Abrir carrinho (${count} itens)`}
          >
            <ShoppingBag className="size-4" />
            <span className="hidden sm:inline">Carrinho</span>
            {hydrated && count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-gold-400 text-[11px] font-bold text-wood-950">
                {count}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
