import { STORE } from "./config";
import { categoryLabel, type Product } from "./menu";
import { formatBRL, formatLongDate, formatQty } from "./format";

export type Fulfillment = "entrega" | "retirada";
export type PaymentMethod = "pix" | "cartao" | "dinheiro";

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  cartao: "Cartão (na entrega/retirada)",
  dinheiro: "Dinheiro",
};

export interface OrderLine {
  product: Product;
  quantity: number;
}

export interface Address {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
}

export interface OrderDraft {
  code: string;
  customerName: string;
  customerPhone: string;
  fulfillment: Fulfillment;
  address?: Address;
  /** null = bairro fora da lista, taxa a combinar. */
  deliveryFee: number | null;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:MM
  payment: PaymentMethod;
  changeFor?: number;
  notes: string;
  lines: OrderLine[];
  discount?: number;
  couponLabel?: string;
}

export const lineTotal = (l: OrderLine) => l.product.price * l.quantity;
export const subtotalOf = (lines: OrderLine[]) => lines.reduce((s, l) => s + lineTotal(l), 0);
export const totalOf = (o: Pick<OrderDraft, "lines" | "deliveryFee" | "fulfillment" | "discount">) =>
  subtotalOf(o.lines) + (o.fulfillment === "entrega" ? o.deliveryFee ?? 0 : 0) - (o.discount ?? 0);

/** Código curto para o cliente e a cozinha referirem o pedido (ex.: MN-4K7QZ). */
export function generateOrderCode() {
  return "MN-" + Date.now().toString(36).slice(-5).toUpperCase();
}

/** Texto do pedido formatado para WhatsApp (*negrito*, _itálico_). */
export function buildWhatsAppMessage(o: OrderDraft): string {
  const L: string[] = [];
  L.push(`*NOVO PEDIDO — ${STORE.name.toUpperCase()}*`);
  L.push(`Pedido: *#${o.code}*`, "");
  L.push(`*Cliente:* ${o.customerName}`);
  L.push(`*Telefone:* ${o.customerPhone}`, "");

  L.push("*Itens:*");
  for (const l of o.lines) {
    L.push(`• ${formatQty(l.quantity, l.product.unit)} — ${categoryLabel(l.product.category)} ${l.product.name} — ${formatBRL(lineTotal(l))}`);
  }
  L.push("");

  const subtotal = subtotalOf(o.lines);
  L.push(`Subtotal: ${formatBRL(subtotal)}`);
  if (o.fulfillment === "entrega") {
    const bairro = o.address?.neighborhood ?? "";
    L.push(o.deliveryFee === null
      ? `Taxa de entrega (${bairro}): _a combinar_`
      : `Taxa de entrega (${bairro}): ${formatBRL(o.deliveryFee)}`);
  }
  if (o.discount) L.push(`Desconto (${o.couponLabel}): -${formatBRL(o.discount)}`);
  L.push(`*Total: ${formatBRL(totalOf(o))}*${o.deliveryFee === null && o.fulfillment === "entrega" ? " + entrega" : ""}`, "");

  if (o.fulfillment === "entrega" && o.address) {
    const a = o.address;
    L.push("*Entrega em:*");
    L.push(`${a.street}, ${a.number}${a.complement ? ` — ${a.complement}` : ""}`);
    L.push(`${a.neighborhood}${a.cep ? ` — CEP ${a.cep}` : ""}`);
  } else {
    L.push("*Retirada no local*");
  }
  L.push(`*Data/Hora:* ${formatLongDate(o.scheduledDate)} às ${o.scheduledTime}`, "");

  let pay = `*Pagamento:* ${PAYMENT_LABELS[o.payment]}`;
  if (o.payment === "dinheiro") {
    pay += o.changeFor ? ` — troco para ${formatBRL(o.changeFor)}` : " — sem troco";
  }
  L.push(pay);

  if (o.notes.trim()) L.push(`*Observações:* ${o.notes.trim()}`);

  if (o.lines.some((l) => l.product.unit === "kg")) {
    L.push("", "_Empadões: peso aproximado, valor final conforme pesagem._");
  }
  return L.join("\n");
}

export const whatsappUrl = (message: string) =>
  `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(message)}`;
