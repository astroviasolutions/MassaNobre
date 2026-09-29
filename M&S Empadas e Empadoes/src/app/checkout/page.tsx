import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = { title: "Finalizar pedido · M&S Empadas e Empadões" };

export default function CheckoutPage() {
  return (
    <div className="px-4 pt-10 sm:px-6">
      <div className="mx-auto mb-8 max-w-6xl">
        <Link href="/#cardapio" className="inline-flex items-center gap-1.5 text-sm text-wood-500 transition hover:text-gold-700">
          <ArrowLeft className="size-4" /> Continuar comprando
        </Link>
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-wide text-wood-900 sm:text-4xl">Finalizar pedido</h1>
      </div>
      <CheckoutForm />
    </div>
  );
}
