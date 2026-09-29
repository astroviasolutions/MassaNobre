-- Gestão completa: custos, lucro, despesas, estoque e pedidos de balcão.
-- Cole tudo no SQL Editor do Supabase e clique em Run (pode rodar mais de uma vez).

-- Custo de produção por kg/unidade (para calcular o lucro)
alter table products add column if not exists cost numeric(10,2) not null default 0;
alter table order_items add column if not exists unit_cost numeric(10,2) not null default 0;
alter table orders add column if not exists source text not null default 'site'; -- site | painel

-- Cada item de pedido guarda o custo do produto no momento da venda
create or replace function set_item_cost() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.unit_cost = 0 and new.product_id is not null then
    select cost into new.unit_cost from products where id = new.product_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_item_cost on order_items;
create trigger trg_item_cost before insert on order_items for each row execute function set_item_cost();

-- Despesas (ingredientes, embalagens, gás, entregas, aluguel...)
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  day date not null default current_date,
  category text not null default 'Outros',
  description text not null,
  amount numeric(10,2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

-- Estoque de insumos
create table if not exists stock_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null default 'kg',
  quantity numeric(12,3) not null default 0,
  min_quantity numeric(12,3) not null default 0,
  cost_per_unit numeric(10,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references stock_items(id) on delete cascade,
  kind text not null check (kind in ('entrada', 'saida')),
  quantity numeric(12,3) not null check (quantity > 0),
  note text,
  created_at timestamptz not null default now()
);

create or replace function apply_stock_movement() returns trigger language plpgsql as $$
begin
  update stock_items
     set quantity = quantity + case when new.kind = 'entrada' then new.quantity else -new.quantity end,
         updated_at = now()
   where id = new.item_id;
  return new;
end $$;
drop trigger if exists trg_stock_movement on stock_movements;
create trigger trg_stock_movement after insert on stock_movements for each row execute function apply_stock_movement();

alter table expenses enable row level security;
alter table stock_items enable row level security;
alter table stock_movements enable row level security;
drop policy if exists "admin expenses" on expenses;
drop policy if exists "admin stock" on stock_items;
drop policy if exists "admin movements" on stock_movements;
create policy "admin expenses" on expenses for all using (is_admin()) with check (is_admin());
create policy "admin stock" on stock_items for all using (is_admin()) with check (is_admin());
create policy "admin movements" on stock_movements for all using (is_admin()) with check (is_admin());
