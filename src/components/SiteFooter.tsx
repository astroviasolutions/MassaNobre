import { MessageCircle } from "lucide-react";
import { STORE } from "@/lib/config";
import { Ornament } from "./Ornament";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-wood-950 text-cream-200">
      <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6">
        <p className="text-gold-foil font-serif text-2xl font-semibold">{STORE.name}</p>
        <p className="mt-1 text-xs tracking-[0.25em] text-gold-400/80 uppercase">{STORE.tagline}</p>
        <Ornament className="my-6" />
        <a
          href={`https://wa.me/${STORE.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-cream-100 transition hover:text-gold-300"
        >
          <MessageCircle className="size-4" /> Encomendas: {STORE.whatsappDisplay}
        </a>
        <p className="mt-6 text-xs text-wood-300">
          Encomendas com {STORE.leadTimeHours}h de antecedência · Feito à mão, com carinho.
        </p>
      </div>
    </footer>
  );
}
