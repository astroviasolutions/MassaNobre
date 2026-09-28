export type Category = "empadao" | "empadinha";
export type Unit = "kg" | "un";

export interface Product {
  id: string;
  name: string;
  description: string;
  category: Category;
  unit: Unit;
  /** Preço por kg (empadão) ou por unidade (empadinha), em reais. */
  price: number;
  /** Controlado pelo toggle "Ligar/Desligar" do Painel de Gestão. */
  available: boolean;
}

export const CATEGORIES: { id: Category; title: string; subtitle: string }[] = [
  { id: "empadao", title: "Empadões", subtitle: "Vendidos ao quilo · ideais para a família e ocasiões especiais" },
  { id: "empadinha", title: "Empadinhas", subtitle: "Vendidas por unidade · perfeitas para festas e lanches" },
];

// Cardápio inicial. Na fase 2 será lido da tabela `products` (Supabase).
export const PRODUCTS: Product[] = [
  { id: "empadao-frango-cremoso", category: "empadao", unit: "kg", price: 60, available: true,
    name: "Frango Cremoso", description: "Frango desfiado envolvido em creme suave, massa amanteigada que desmancha." },
  { id: "empadao-palmito", category: "empadao", unit: "kg", price: 70, available: true,
    name: "Palmito", description: "Palmito macio em molho cremoso, temperado com ervas frescas." },
  { id: "empadao-frango-palmito", category: "empadao", unit: "kg", price: 65, available: true,
    name: "Frango com Palmito", description: "O clássico da casa: frango desfiado e palmito em creme." },
  { id: "empadao-camarao-cremoso", category: "empadao", unit: "kg", price: 85, available: true,
    name: "Camarão Cremoso", description: "Camarões selecionados num creme delicado e aromático." },
  { id: "empadao-camarao-palmito", category: "empadao", unit: "kg", price: 80, available: true,
    name: "Camarão com Palmito", description: "Camarão e palmito em harmonia, recheio generoso." },

  { id: "empadinha-frango-cremoso", category: "empadinha", unit: "un", price: 10, available: true,
    name: "Frango Cremoso", description: "A preferida: recheio cremoso de frango." },
  { id: "empadinha-frango-palmito", category: "empadinha", unit: "un", price: 10, available: true,
    name: "Frango com Palmito", description: "Frango desfiado com palmito macio." },
  { id: "empadinha-palmito", category: "empadinha", unit: "un", price: 12, available: true,
    name: "Palmito", description: "Palmito em creme leve e temperado." },
  { id: "empadinha-camarao-palmito", category: "empadinha", unit: "un", price: 12, available: true,
    name: "Camarão com Palmito", description: "Camarão e palmito numa mordida." },
  { id: "empadinha-camarao", category: "empadinha", unit: "un", price: 14, available: true,
    name: "Camarão", description: "Recheio farto de camarão cremoso." },
];

export const productById = (id: string) => PRODUCTS.find((p) => p.id === id);

export const categoryLabel = (c: Category) => (c === "empadao" ? "Empadão" : "Empadinha");
