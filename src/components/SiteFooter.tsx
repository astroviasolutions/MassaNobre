import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { STORE } from "@/lib/config";
import { Ornament } from "./Ornament";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-sage-200 bg-cream-100 text-wood-700">
      <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6">
        <p className="text-gold-foil font-serif text-2xl font-semibold">{STORE.name}</p>
        <p className="mt-1 text-xs tracking-[0.25em] text-sage-600 uppercase">{STORE.tagline}</p>
        <Ornament className="my-6" />
        <a
          href={`https://wa.me/${STORE.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-wood-800 transition hover:text-gold-600"
        >
          <MessageCircle className="size-4" /> Encomendas: {STORE.whatsappDisplay}
        </a>
        <p className="mt-6 text-xs text-wood-500">
          Encomendas com {STORE.leadTimeHours}h de antecedência · Feito à mão, com carinho.
        </p>
        <Link href="/admin" className="mt-4 inline-block text-[11px] text-wood-500 hover:text-gold-600">Área administrativa</Link>
      </div>
    </footer>
  );
}
