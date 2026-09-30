"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Banknote, CheckCircle2, CreditCard, Loader2, MessageCircle, QrCode, Store, Truck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { STORE } from "@/lib/config";
import { DELIVERY_ZONES, OTHER_ZONE_ID, findZoneByNeighborhood, lookupCep } from "@/lib/delivery";
import { formatBRL, maskCep, maskPhone, parseMoney } from "@/lib/format";
import { availableSlots, dateBounds, isClosedDay } from "@/lib/schedule";
import {
  buildWhatsAppMessage,
  generateOrderCode,
  whatsappUrl,
  type Fulfillment,
  type OrderDraft,
  type PaymentMethod,
} from "@/lib/order";
import { supabase } from "@/lib/supabase";
import { OrderSummary } from "./OrderSummary";
import { Section, ChoiceCard, FieldError } from "./ui";

type Errors = Partial<Record<string, string>>;

export function CheckoutForm() {
  const { hydrated, lines, subtotal, clear } = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("entrega");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [otherNeighborhood, setOtherNeighborhood] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("pix");
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState("");
  const [notes, setNotes] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState("");
  const [promo, setPromo] = useState<{ code: string | null; description: string; discount: number; kind: string; gift_name?: string; gift_qty?: number } | null>(null);

  const [errors, setErrors] = useState<Errors>({});
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "notfound">("idle");
  const [sent, setSent] = useState<{ code: string; url: string } | null>(null);

  const bounds = useMemo(() => dateBounds(), []);
  const slots = useMemo(() => availableSlots(date), [date]);

  const zone = DELIVERY_ZONES.find((z) => z.id === zoneId);
  const isOtherZone = zoneId === OTHER_ZONE_ID;
  const deliveryFee: number | null = fulfillment === "retirada" ? 0 : isOtherZone ? null : zone?.fee ?? 0;
  const neighborhood = isOtherZone ? otherNeighborhood.trim() : zone?.name ?? "";
  const discount = Number(promo?.discount ?? 0);
  const total = subtotal + (deliveryFee ?? 0) - discount;

  // Cupom digitado ou promoção automática (ex.: entrega grátis acima de X)
  useEffect(() => {
    if (!supabase || !subtotal) return setPromo(null);
    supabase
      .rpc("check_coupon", { p_code: couponApplied, p_subtotal: subtotal, p_fee: deliveryFee ?? 0 })
      .then(({ data }) => setPromo(data ?? null));
  }, [couponApplied, subtotal, deliveryFee]);

  async function handleCep(value: string) {
    const masked = maskCep(value);
    setCep(masked);
    if (masked.replace(/\D/g, "").length !== 8) return;
    setCepStatus("loading");
    const r = await lookupCep(masked);
    if (!r) return setCepStatus("notfound");
    setCepStatus("idle");
    if (r.street) setStreet(r.street);
    const match = r.city.toLowerCase() === "curitiba" ? findZoneByNeighborhood(r.neighborhood) : undefined;
    if (match) {
      setZoneId(match.id);
    } else if (r.neighborhood) {
      setZoneId(OTHER_ZONE_ID);
      setOtherNeighborhood(`${r.neighborhood}${r.city ? ` — ${r.city}` : ""}`);
    }
  }

  function validate(): Errors {
    const e: Errors = {};
    if (name.trim().length < 3) e.name = "Informe seu nome completo.";
    const phoneDigits = phone.replace(/\D/g, "").length;
    if (phoneDigits < 10 || phoneDigits > 11) e.phone = "Informe um telefone válido com DDD.";

    if (fulfillment === "entrega") {
      if (!street.trim()) e.street = "Informe a rua.";
      if (!number.trim()) e.number = "Informe o número.";
      if (!zoneId) e.zone = "Selecione o bairro.";
      if (isOtherZone && !otherNeighborhood.trim()) e.zone = "Informe o bairro.";
    }

    if (!date) e.date = "Escolha a data.";
    else if (date < bounds.min || date > bounds.max) e.date = "Data fora do período disponível.";
    else if (isClosedDay(date)) e.date = "Não trabalhamos neste dia da semana.";
    if (!time) e.time = "Escolha o horário.";
    else if (!slots.includes(time)) e.time = "Horário indisponível para esta data.";

    if (payment === "dinheiro" && needsChange) {
      const v = parseMoney(changeFor);
      if (!v) e.changeFor = "Informe o valor para troco.";
      else if (v <= total) e.changeFor = `O valor deve ser maior que o total (${formatBRL(total)}).`;
    }
    return e;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() =>
        document.querySelector("[aria-invalid='true']")?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      return;
    }

    const order: OrderDraft = {
      code: generateOrderCode(),
      customerName: name.trim(),
      customerPhone: phone,
      fulfillment,
      address:
        fulfillment === "entrega"
          ? { cep, street: street.trim(), number: number.trim(), complement: complement.trim(), neighborhood }
          : undefined,
      deliveryFee,
      scheduledDate: date,
      scheduledTime: time,
      payment,
      changeFor: payment === "dinheiro" && needsChange ? parseMoney(changeFor) : undefined,
      notes,
      lines,
      discount,
      couponLabel: promo ? promo.code ?? promo.description : undefined,
      gift: promo?.kind === "gift" && promo.gift_name ? `${promo.gift_qty}× ${promo.gift_name}` : undefined,
    };

    const url = whatsappUrl(buildWhatsAppMessage(order));
    const win = window.open(url, "_blank");
    if (!win) window.location.href = url;

    // Grava o pedido para aparecer em "Novos" no Painel. Preços são recalculados no banco.
    supabase
      ?.rpc("create_order", {
        p: {
          code: order.code,
          name: order.customerName,
          phone: order.customerPhone,
          fulfillment,
          cep,
          street,
          number,
          complement,
          neighborhood,
          scheduled_for: `${date}T${time}:00-03:00`,
          payment,
          change_for: order.changeFor ?? null,
          notes,
          coupon: couponApplied,
          items: lines.map((l) => ({ slug: l.product.id, qty: l.quantity })),
        },
      })
      .then(({ error }) => error && console.error("Falha ao gravar pedido", error));

    setSent({ code: order.code, url });
    clear();
  }

  if (!hydrated) {
    return <div className="mx-auto h-96 max-w-6xl animate-pulse rounded-2xl bg-cream-100" />;
  }

  if (sent) {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center">
        <CheckCircle2 className="mx-auto size-14 text-gold-500" strokeWidth={1.4} />
        <h2 className="mt-4 font-serif text-2xl font-semibold">Pedido pronto para envio!</h2>
        <p className="mt-2 text-wood-700">
          Código do pedido: <strong className="font-serif text-gold-700">#{sent.code}</strong>
        </p>
        <p className="mt-4 text-sm text-wood-700">
          Abrimos o WhatsApp com o seu pedido. <strong>Basta tocar em enviar</strong> para confirmarmos a sua encomenda.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <a href={sent.url} target="_blank" rel="noopener noreferrer" className="btn-gold">
            <MessageCircle className="size-4" /> Abrir WhatsApp novamente
          </a>
          <Link href="/" className="btn-ghost">
            Voltar ao cardápio
          </Link>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center">
        <p className="font-display text-2xl text-wood-700 italic">Seu carrinho está vazio.</p>
        <Link href="/#cardapio" className="btn-gold mt-6">
          Ver cardápio
        </Link>
      </div>
    );
  }

  const err = (k: string) => (errors[k] ? "field-error" : "");

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {/* 1. Dados */}
        <Section n={1} title="Seus dados">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="label">Nome</label>
              <input id="name" className={`field ${err("name")}`} value={name} onChange={(e) => setName(e.target.value)}
                autoComplete="name" placeholder="Como devemos chamá-lo(a)?" aria-invalid={!!errors.name} />
              <FieldError msg={errors.name} />
            </div>
            <div>
              <label htmlFor="phone" className="label">Telefone / WhatsApp</label>
              <input id="phone" className={`field ${err("phone")}`} value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))}
                inputMode="tel" autoComplete="tel-national" placeholder="(41) 99999-9999" aria-invalid={!!errors.phone} />
              <FieldError msg={errors.phone} />
            </div>
          </div>
        </Section>

        {/* 2. Entrega ou retirada */}
        <Section n={2} title="Entrega ou retirada">
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Forma de recebimento">
            <ChoiceCard checked={fulfillment === "entrega"} onSelect={() => setFulfillment("entrega")}
              icon={Truck} title="Entrega" hint="Taxa conforme o bairro" />
            <ChoiceCard checked={fulfillment === "retirada"} onSelect={() => setFulfillment("retirada")}
              icon={Store} title="Retirada no local" hint="Grátis" />
          </div>

          {fulfillment === "entrega" && (
            <div className="mt-5 grid gap-4 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label htmlFor="cep" className="label">CEP</label>
                <div className="relative">
                  <input id="cep" className="field" value={cep} onChange={(e) => handleCep(e.target.value)}
                    inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" />
                  {cepStatus === "loading" && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-gold-600" />}
                </div>
                {cepStatus === "notfound" && <p className="mt-1 text-xs text-wood-500">CEP não encontrado — preencha manualmente.</p>}
              </div>
              <div className="sm:col-span-4">
                <label htmlFor="zone" className="label">Bairro</label>
                <select id="zone" className={`field ${err("zone")}`} value={zoneId} onChange={(e) => setZoneId(e.target.value)} aria-invalid={!!errors.zone}>
                  <option value="">Selecione…</option>
                  {DELIVERY_ZONES.map((z) => (
                    <option key={z.id} value={z.id}>{z.name} — {formatBRL(z.fee)}</option>
                  ))}
                  <option value={OTHER_ZONE_ID}>Outro bairro (taxa a combinar)</option>
                </select>
                <FieldError msg={errors.zone} />
              </div>
              {isOtherZone && (
                <div className="sm:col-span-6">
                  <label htmlFor="otherNeighborhood" className="label">Qual bairro?</label>
                  <input id="otherNeighborhood" className="field" value={otherNeighborhood}
                    onChange={(e) => setOtherNeighborhood(e.target.value)} placeholder="Ex.: Pinheirinho" />
                  <p className="mt-1 text-xs text-wood-500">Confirmaremos a taxa de entrega pelo WhatsApp.</p>
                </div>
              )}
              <div className="sm:col-span-4">
                <label htmlFor="street" className="label">Rua</label>
                <input id="street" className={`field ${err("street")}`} value={street} onChange={(e) => setStreet(e.target.value)}
                  autoComplete="address-line1" aria-invalid={!!errors.street} />
                <FieldError msg={errors.street} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="number" className="label">Número</label>
                <input id="number" className={`field ${err("number")}`} value={number} onChange={(e) => setNumber(e.target.value)}
                  inputMode="numeric" aria-invalid={!!errors.number} />
                <FieldError msg={errors.number} />
              </div>
              <div className="sm:col-span-6">
                <label htmlFor="complement" className="label">Complemento <span className="font-normal normal-case tracking-normal text-wood-500">(opcional)</span></label>
                <input id="complement" className="field" value={complement} onChange={(e) => setComplement(e.target.value)}
                  autoComplete="address-line2" placeholder="Apto, bloco, referência…" />
              </div>
            </div>
          )}
        </Section>

        {/* 3. Agendamento */}
        <Section n={3} title="Data e horário" subtitle={`Encomendas com no mínimo ${STORE.leadTimeHours}h de antecedência.`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="date" className="label">{fulfillment === "entrega" ? "Data da entrega" : "Data da retirada"}</label>
              <input id="date" type="date" className={`field ${err("date")}`} min={bounds.min} max={bounds.max} value={date}
                onChange={(e) => { setDate(e.target.value); setTime(""); }} aria-invalid={!!errors.date} />
              <FieldError msg={errors.date} />
            </div>
            <div>
              <label htmlFor="time" className="label">Horário</label>
              <select id="time" className={`field ${err("time")}`} value={time} onChange={(e) => setTime(e.target.value)}
                disabled={!date || slots.length === 0} aria-invalid={!!errors.time}>
                <option value="">{!date ? "Escolha a data primeiro" : slots.length ? "Selecione…" : "Sem horários neste dia"}</option>
                {slots.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <FieldError msg={errors.time} />
            </div>
          </div>
        </Section>

        {/* 4. Pagamento */}
        <Section n={4} title="Pagamento" subtitle="O pagamento é feito na entrega ou retirada (PIX pode ser antecipado).">
          <div className="mb-5 flex gap-2">
            <input className="field uppercase" placeholder="Cupom de desconto" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} />
            <button type="button" className="btn-ghost shrink-0" onClick={() => setCouponApplied(couponInput.trim())}>Aplicar</button>
          </div>
          {couponApplied && !promo?.code && <p className="-mt-3 mb-4 text-xs text-red-600">Cupom inválido ou não aplicável a este pedido.</p>}
          {promo && (
            <p className="-mt-3 mb-4 text-xs font-semibold text-sage-600">
              ✓ {promo.description} {promo.kind === "gift" ? `— 🎁 ${promo.gift_qty}× ${promo.gift_name}` : `(−${formatBRL(discount)})`}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Forma de pagamento">
            <ChoiceCard checked={payment === "pix"} onSelect={() => setPayment("pix")} icon={QrCode} title="PIX" />
            <ChoiceCard checked={payment === "cartao"} onSelect={() => setPayment("cartao")} icon={CreditCard} title="Cartão" hint="Débito ou crédito" />
            <ChoiceCard checked={payment === "dinheiro"} onSelect={() => setPayment("dinheiro")} icon={Banknote} title="Dinheiro" />
          </div>

          {payment === "dinheiro" && (
            <div className="mt-5 rounded-xl border border-cream-200 bg-cream-50 p-4">
              <label className="flex cursor-pointer items-center gap-3 text-sm text-wood-800">
                <input type="checkbox" checked={needsChange} onChange={(e) => setNeedsChange(e.target.checked)}
                  className="size-4 accent-gold-600" />
                Preciso de troco
              </label>
              {needsChange && (
                <div className="mt-3 max-w-xs">
                  <label htmlFor="changeFor" className="label">Troco para quanto?</label>
                  <input id="changeFor" className={`field ${err("changeFor")}`} value={changeFor} onChange={(e) => setChangeFor(e.target.value)}
                    inputMode="decimal" placeholder="Ex.: 200,00" aria-invalid={!!errors.changeFor} />
                  <FieldError msg={errors.changeFor} />
                  {parseMoney(changeFor) > total && (
                    <p className="mt-1 text-xs text-wood-500">Troco: {formatBRL(parseMoney(changeFor) - total)}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </Section>

        {/* 5. Observações */}
        <Section n={5} title="Observações" subtitle="Restrições ou pedidos especiais.">
          <textarea id="notes" className="field min-h-28 resize-y" value={notes} onChange={(e) => setNotes(e.target.value)}
            maxLength={500} placeholder='Ex.: "Sem azeitona", "Embalagem para presente"…' aria-label="Observações" />
          <p className="mt-1 text-right text-xs text-wood-500">{notes.length}/500</p>
        </Section>
      </div>

      <OrderSummary
        lines={lines}
        subtotal={subtotal}
        fulfillment={fulfillment}
        deliveryFee={deliveryFee}
        neighborhood={neighborhood}
        discount={discount}
        promoLabel={promo?.description}
        gift={promo?.kind === "gift" ? `${promo.gift_qty}× ${promo.gift_name}` : undefined}
        total={total}
      />
    </form>
  );
}
