import type { Metadata, Viewport } from "next";
import { Fraunces, Cormorant_Garamond, Montserrat } from "next/font/google";
import { CartProvider } from "@/context/CartContext";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { getProducts } from "@/lib/products";
import "./globals.css";

export const revalidate = 30;

const cinzel = Fraunces({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-cinzel" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-cormorant" });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-montserrat" });

export const metadata: Metadata = {
  title: "M&S Empadas e Empadões · Artesanal",
  description: "Encomende empadões ao quilo e empadinhas artesanais. Entrega ou retirada agendada.",
  icons: { icon: "/brand/emblema.jpg" },
};

export const viewport: Viewport = {
  themeColor: "#ece3d3",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const products = await getProducts();
  return (
    <html lang="pt-BR" className={`${cinzel.variable} ${cormorant.variable} ${montserrat.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <CartProvider products={products}>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
