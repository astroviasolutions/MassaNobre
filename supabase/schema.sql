-- Massa Nobre — esquema da base de dados (PostgreSQL / Supabase)
-- Fase 2: suporta o Painel de Gestão (Kanban, estoque, comanda, relatórios).

create extension if not exists "pgcrypto";

-- ───────────────────────── Catálogo ─────────────────────────
create type product_category as enum ('empadao', 'empadinha');
create type product_unit     as enum ('kg', 'un');

create table products (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  description  text,
  category     product_category not null,
  unit         product_unit not null,
  price        numeric(10,2) not null check (price >= 0),  -- por kg ou por unidade
  is_available boolean not null default true,              -- toggle "Ligar/Desligar"
  is_archived  boolean not null default false,             -- remove do cardápio sem apagar histórico
  sort_order   int not null default 0,
  image_url    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table delivery_zones (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,   -- bairro
  fee        numeric(10,2) not null check (fee >= 0),
  is_active  boolean not null default true
);

-- Linha única com as regras de agendamento (editáveis no Painel).
create table store_settings (
  id                int primary key default 1 check (id = 1),
  lead_time_hours   int  not null default 24,
  max_days_ahead    int  not null default 30,
  opening_time      time not null default '10:00',
  closing_time      time not null default '19:00',
  slot_minutes      int  not null default 30,
  closed_weekdays   int[] not null default '{}',
  max_orders_per_slot int,                      -- opcional: limitar capacidade da cozinha
  whatsapp          text not null default '5541999854161'
);
insert into store_settings default values;

-- Feriados / dias bloqueados pontualmente.
create table blocked_dates (
  day    date primary key,
  reason text
);

-- ───────────────────────── Pedidos ─────────────────────────
create type order_status   as enum ('novo', 'em_preparacao', 'pronto', 'concluido', 'cancelado');
create type fulfillment    as enum ('entrega', 'retirada');
create type payment_method as enum ('pix', 'cartao', 'dinheiro');

create table orders (
  id               uuid primary key default gen_random_uuid(),
  code             text unique not null,              -- ex.: MN-4K7QZ (vai na mensagem do WhatsApp)
  status           order_status not null default 'novo',
  customer_name    text not null,
  customer_phone   text not null,
  fulfillment      fulfillment not null,
  -- endereço (snapshot; só para entrega)
  address_cep          text,
  address_street       text,
  address_number       text,
  address_complement   text,
  address_neighborhood text,
  delivery_zone_id uuid references delivery_zones(id),
  delivery_fee     numeric(10,2),                     -- null = a combinar
  scheduled_for    timestamptz not null,              -- data + hora escolhidas
  payment_method   payment_method not null,
  change_for       numeric(10,2),
  notes            text,
  subtotal         numeric(10,2) not null,
  total            numeric(10,2) not null,
  printed_at       timestamptz,                       -- última impressão da comanda
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index orders_status_scheduled_idx on orders (status, scheduled_for);
create index orders_created_idx on orders (created_at);

create table order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  product_id   uuid references products(id),
  -- snapshot: o pedido não muda se o preço/nome mudar depois
  product_name text not null,
  category     product_category not null,
  unit         product_unit not null,
  unit_price   numeric(10,2) not null,
  quantity     numeric(10,3) not null check (quantity > 0), -- kg estimado ou unidades
  final_weight numeric(10,3),                               -- kg real após pesagem (empadão)
  line_total   numeric(10,2) not null
);
create index order_items_order_idx on order_items (order_id);

-- Histórico de movimentações no Kanban (quem moveu, quando).
create table order_status_history (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status  order_status not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

-- ───────────────────────── Relatórios ─────────────────────────
create view report_daily_revenue with (security_invoker = true) as
select (scheduled_for at time zone 'America/Sao_Paulo')::date as day,
       count(*)              as orders,
       sum(total)            as revenue,
       avg(total)            as avg_ticket
from orders
where status <> 'cancelado'
group by 1;

create view report_top_flavors with (security_invoker = true) as
select oi.product_name, oi.category, oi.unit,
       sum(coalesce(oi.final_weight, oi.quantity)) as qty_sold,
       sum(oi.line_total)                          as revenue,
       date_trunc('month', o.scheduled_for at time zone 'America/Sao_Paulo')::date as month
from order_items oi
join orders o on o.id = oi.order_id
where o.status <> 'cancelado'
group by oi.product_name, oi.category, oi.unit, month;

-- ───────────────────────── Segurança (RLS) ─────────────────────────
-- Público: só lê o cardápio e as zonas. Pedidos entram pela API (service role),
-- que recalcula preços no servidor. Painel: utilizadores autenticados (admin).
alter table products        enable row level security;
alter table delivery_zones  enable row level security;
alter table store_settings  enable row level security;
alter table blocked_dates   enable row level security;
alter table orders          enable row level security;
alter table order_items     enable row level security;
alter table order_status_history enable row level security;

create policy "cardapio publico" on products       for select using (not is_archived);
create policy "zonas publicas"   on delivery_zones for select using (is_active);
create policy "config publica"   on store_settings for select using (true);
create policy "bloqueios publicos" on blocked_dates for select using (true);

create policy "admin total products" on products       for all to authenticated using (true) with check (true);
create policy "admin total zones"    on delivery_zones for all to authenticated using (true) with check (true);
create policy "admin total settings" on store_settings for all to authenticated using (true) with check (true);
create policy "admin total blocked"  on blocked_dates  for all to authenticated using (true) with check (true);
create policy "admin total orders"   on orders         for all to authenticated using (true) with check (true);
create policy "admin total items"    on order_items    for all to authenticated using (true) with check (true);
create policy "admin total history"  on order_status_history for all to authenticated using (true) with check (true);
-- Nota: com mais de um tipo de utilizador, trocar "to authenticated" por um check de papel (ex.: tabela staff).

-- Realtime: o Kanban recebe pedidos novos ao vivo.
alter publication supabase_realtime add table orders;

-- ───────────────────────── Dados iniciais ─────────────────────────
insert into products (slug, name, category, unit, price, sort_order) values
  ('empadao-frango-cremoso',    'Frango Cremoso',      'empadao',   'kg', 60, 1),
  ('empadao-palmito',           'Palmito',             'empadao',   'kg', 70, 2),
  ('empadao-frango-palmito',    'Frango com Palmito',  'empadao',   'kg', 65, 3),
  ('empadao-camarao-cremoso',   'Camarão Cremoso',     'empadao',   'kg', 85, 4),
  ('empadao-camarao-palmito',   'Camarão com Palmito', 'empadao',   'kg', 80, 5),
  ('empadinha-frango-cremoso',  'Frango Cremoso',      'empadinha', 'un', 10, 1),
  ('empadinha-frango-palmito',  'Frango com Palmito',  'empadinha', 'un', 10, 2),
  ('empadinha-palmito',         'Palmito',             'empadinha', 'un', 12, 3),
  ('empadinha-camarao-palmito', 'Camarão com Palmito', 'empadinha', 'un', 12, 4),
  ('empadinha-camarao',         'Camarão',             'empadinha', 'un', 14, 5);
