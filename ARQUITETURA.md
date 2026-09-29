# Massa Nobre — Arquitetura

## Stack

| Camada | Escolha | Porquê |
|---|---|---|
| Frontend + API | **Next.js (App Router) + TypeScript** | Uma só base de código para o site do cliente, o Painel e as rotas de API. |
| Estilo | **Tailwind CSS v4** | Paleta da marca em `src/app/globals.css` (`gold-*`, `wood-*`, `cream-*`). |
| Base de dados + Auth + Realtime | **Supabase (PostgreSQL)** | Login do Painel, RLS, e o Kanban recebe pedidos novos ao vivo. |
| Hospedagem | **Vercel** | Deploy automático a partir do Git, domínio próprio. |

## Estado atual (Fase 1 — entregue)

```
src/
  app/
    page.tsx              Catálogo (hero + Empadões/Empadinhas)
    checkout/page.tsx     Checkout
    layout.tsx            Fontes (Cinzel, Cormorant, Montserrat), cabeçalho, carrinho
  components/
    ProductCard, QuantityStepper, CartDrawer, FloatingCartBar, SiteHeader/Footer, Ornament
    checkout/CheckoutForm  Dados, entrega/retirada + CEP (ViaCEP), agendamento, pagamento/troco, observações
    checkout/OrderSummary  Resumo fixo com total e botão WhatsApp
  context/CartContext.tsx  Carrinho (useReducer + localStorage)
  lib/
    config.ts     Regras da loja (antecedência, horários, WhatsApp)  → futura tabela store_settings
    menu.ts       Produtos e preços                                   → futura tabela products
    delivery.ts   Taxas por bairro + consulta de CEP                  → futura tabela delivery_zones
    schedule.ts   Cálculo de datas/horários disponíveis
    order.ts      Tipos do pedido + mensagem do WhatsApp
```

Hoje o pedido **não é gravado**: é compilado e enviado por WhatsApp. Os módulos em `lib/` já têm a forma dos dados da base, por isso a Fase 2 troca a origem sem mexer na interface.

## Fase 2 — Painel de Gestão

### Base de dados
O esquema completo está em [`supabase/schema.sql`](supabase/schema.sql):

- `products` — com `is_available` (toggle Ligar/Desligar) e `is_archived` (tirar do cardápio sem perder histórico).
- `delivery_zones`, `store_settings`, `blocked_dates` — tudo o que hoje está em `lib/` passa a ser editável.
- `orders` + `order_items` — os itens guardam uma **cópia** do nome e preço (o histórico não muda se o preço mudar). `final_weight` regista o peso real do empadão após pesagem.
- `order_status_history` — cada movimento no Kanban.
- Views `report_daily_revenue` e `report_top_flavors` para os relatórios.
- RLS: o público só lê o cardápio; pedidos entram pela API; o Painel exige login.

### Fluxo do pedido

```
Cliente ── checkout ──► POST /api/orders ──► valida + recalcula preços no servidor
                              │                (nunca confiar no total do navegador)
                              ├──► INSERT orders / order_items  (status = 'novo')
                              └──► devolve { code } ──► abre WhatsApp com a mensagem
                                                        │
Painel (Kanban) ◄── Supabase Realtime (INSERT em orders) ┘
```

No `CheckoutForm.handleSubmit` já está marcado o ponto onde entra o `POST /api/orders`.

### Rotas do Painel (`/admin`, protegidas por middleware + Supabase Auth)

| Rota | Função |
|---|---|
| `/admin` | **Kanban**: Novos → Em Preparação → Prontos → Concluídos. Arrastar (dnd-kit) faz `UPDATE orders.status` + insere em `order_status_history`. Filtro por dia de entrega; alerta sonoro em pedido novo. |
| `/admin/cardapio` | Lista de produtos com **toggle de disponibilidade** (um clique → `UPDATE products set is_available`), edição de preço e descrição. O catálogo usa `revalidateTag('products')` para refletir na hora. |
| `/admin/pedidos/[id]/comanda` | **Comanda térmica**: página com CSS `@page { size: 80mm auto; margin: 0 }`, fonte monoespaçada, sem cores; o botão chama `window.print()`. Funciona em qualquer impressora térmica instalada no Windows (58 mm ou 80 mm). Para impressão silenciosa sem diálogo, evoluir depois para QZ Tray ou PrintNode. |
| `/admin/relatorios` | Faturamento diário/mensal e sabores mais vendidos (lê as views). |
| `/admin/configuracoes` | Bairros e taxas, horários, antecedência, dias bloqueados. |

### Próximos passos sugeridos
1. Criar o projeto Supabase e correr `supabase/schema.sql`.
2. `lib/menu.ts` → ler `products` num Server Component (com cache/tag).
3. Criar `POST /api/orders` e ligá-lo ao checkout.
4. Login + Kanban com Realtime.
5. Comanda térmica, toggle de estoque, relatórios.
