import Image from "next/image";
import { CalendarClock, Truck, Wheat } from "lucide-react";
import { CATEGORIES } from "@/lib/menu";
import { getProducts } from "@/lib/products";
import { STORE } from "@/lib/config";
import { ProductCard } from "@/components/ProductCard";
import { Ornament } from "@/components/Ornament";
import { FloatingCartBar } from "@/components/FloatingCartBar";

export const revalidate = 30;

export default async function HomePage() {
  const PRODUCTS = await getProducts();
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-cream-100">
        <Image src="/brand/hero.jpg" alt="" fill priority className="-z-10 object-cover opacity-70" sizes="100vw" />
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-cream-50/40 via-cream-50/60 to-cream-50" />

        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24 sm:pb-28">
          <Image
            src="/brand/emblema.jpg"
            alt="M&S Empadas e Empadões — Artesanal"
            width={200}
            height={200}
            priority
            className="size-36 rounded-full shadow-[0_20px_50px_-15px_rgb(74_46_27/0.45)] ring-4 ring-white sm:size-48"
          />
          <h1 className="text-gold-foil mt-8 font-serif text-4xl font-semibold tracking-wide sm:text-6xl">M&amp;S Empadas<span className="block text-2xl sm:text-4xl">e Empadões</span></h1>
          <p className="mt-3 font-display text-xl text-wood-700 italic sm:text-2xl">
            Empadões e empadinhas feitos à mão, com massa que desmancha.
          </p>
          <Ornament className="my-8" />
          <a href="#cardapio" className="btn-gold">
            Fazer minha encomenda
          </a>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="border-y border-sage-200 bg-sage-200/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6">
          {[
            { icon: Wheat, title: "100% artesanal", text: "Receitas da casa, ingredientes selecionados." },
            { icon: CalendarClock, title: "Encomenda agendada", text: `Escolha dia e hora · ${STORE.leadTimeHours}h de antecedência.` },
            { icon: Truck, title: "Entrega ou retirada", text: "Entregamos no seu bairro ou retire sem custo." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-sage-600" strokeWidth={1.6} />
              <div>
                <p className="font-serif text-sm font-semibold tracking-wide text-wood-900">{title}</p>
                <p className="text-sm text-wood-700">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cardápio */}
      <div id="cardapio" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-16 sm:px-6">
        {CATEGORIES.map((cat) => {
          const items = PRODUCTS.filter((p) => p.category === cat.id);
          return (
            <section key={cat.id} className="mb-16" aria-labelledby={`cat-${cat.id}`}>
              <header className="mb-8 text-center">
                <h2 id={`cat-${cat.id}`} className="font-serif text-3xl font-semibold tracking-wide text-wood-900 sm:text-4xl">
                  {cat.title}
                </h2>
                <p className="mt-2 font-display text-lg text-wood-700 italic">{cat.subtitle}</p>
                <Ornament className="mt-4" />
              </header>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          );
        })}
        <p className="-mt-8 text-center text-xs text-wood-500">
          Empadões a partir de 500 g — escolha o peso que quiser (toque no número para digitar). O peso final pode variar ligeiramente — cobramos conforme a pesagem.
        </p>
      </div>

      <FloatingCartBar />
    </>
  );
}
