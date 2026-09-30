import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** null quando as variáveis de ambiente não estão configuradas (site funciona só com WhatsApp). */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;

export type OrderStatus = "novo" | "em_preparacao" | "pronto" | "concluido" | "cancelado";

export const STATUS_COLUMNS: { id: OrderStatus; label: string }[] = [
  { id: "novo", label: "Novos" },
  { id: "em_preparacao", label: "Em preparação" },
  { id: "pronto", label: "Prontos" },
  { id: "concluido", label: "Concluídos" },
];

export interface DbOrderItem {
  product_name: string;
  category: "empadao" | "empadinha";
  unit: "kg" | "un";
  quantity: number;
  line_total: number;
  is_gift?: boolean;
}

export interface DbOrder {
  id: string;
  code: string;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  fulfillment: "entrega" | "retirada";
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_cep: string | null;
  delivery_fee: number | null;
  scheduled_for: string;
  payment_method: "pix" | "cartao" | "dinheiro";
  change_for: number | null;
  notes: string | null;
  subtotal: number;
  discount: number;
  coupon_code: string | null;
  total: number;
  created_at: string;
  order_items: DbOrderItem[];
}
