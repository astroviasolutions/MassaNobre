import { PRODUCTS, type Product } from "./menu";
import { supabase } from "./supabase";

interface DbProduct {
  slug: string;
  name: string;
  description: string | null;
  category: Product["category"];
  unit: Product["unit"];
  price: number;
  is_available: boolean;
  sort_order: number;
}

/** Cardápio vindo do Supabase (preço e disponibilidade do Painel); cai para o estático se falhar. */
export async function getProducts(): Promise<Product[]> {
  if (!supabase) return PRODUCTS;
  const { data, error } = await supabase
    .from("products")
    .select("slug,name,description,category,unit,price,is_available,sort_order")
    .order("sort_order");
  if (error || !data?.length) return PRODUCTS;
  return (data as DbProduct[]).map((r) => ({
    id: r.slug,
    name: r.name,
    description: r.description || PRODUCTS.find((p) => p.id === r.slug)?.description || "",
    category: r.category,
    unit: r.unit,
    price: Number(r.price),
    available: r.is_available,
  }));
}
