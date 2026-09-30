-- Gorjetas (lançadas avulsas ou ligadas a um pedido).
-- Cole no SQL Editor do Supabase e clique em Run (pode rodar mais de uma vez).
create table if not exists tips (
  id uuid primary key default gen_random_uuid(),
  day date not null default current_date,
  amount numeric(10,2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);
alter table tips enable row level security;
drop policy if exists "admin tips" on tips;
create policy "admin tips" on tips for all using (is_admin()) with check (is_admin());

-- Conferência: vendas por dia da venda (created_at) — use para bater com o caixa
-- select (created_at at time zone 'America/Sao_Paulo')::date dia, count(*), sum(total)
--   from orders where status <> 'cancelado' group by 1 order by 1 desc;
