-- Painel administrativo: acesso restrito + gravação de pedidos pelo site.
-- Cole tudo no SQL Editor do Supabase e clique em Run.

-- 1) Quem pode usar o Painel (e-mails autorizados)
create table if not exists admins (email text primary key);
alter table admins enable row level security;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from admins where email = auth.jwt() ->> 'email') $$;

drop policy if exists "admin le admins" on admins;
create policy "admin le admins" on admins for select using (is_admin());

-- 2) Troca "qualquer usuário logado" por "somente admins"
drop policy if exists "admin total products" on products;
drop policy if exists "admin total zones" on delivery_zones;
drop policy if exists "admin total settings" on store_settings;
drop policy if exists "admin total blocked" on blocked_dates;
drop policy if exists "admin total orders" on orders;
drop policy if exists "admin total items" on order_items;
drop policy if exists "admin total history" on order_status_history;
drop policy if exists "admin products" on products;
create policy "admin products" on products for all using (is_admin()) with check (is_admin());
drop policy if exists "admin zones" on delivery_zones;
create policy "admin zones" on delivery_zones for all using (is_admin()) with check (is_admin());
drop policy if exists "admin settings" on store_settings;
create policy "admin settings" on store_settings for all using (is_admin()) with check (is_admin());
drop policy if exists "admin blocked" on blocked_dates;
create policy "admin blocked" on blocked_dates for all using (is_admin()) with check (is_admin());
drop policy if exists "admin orders" on orders;
create policy "admin orders" on orders for all using (is_admin()) with check (is_admin());
drop policy if exists "admin items" on order_items;
create policy "admin items" on order_items for all using (is_admin()) with check (is_admin());
drop policy if exists "admin history" on order_status_history;
create policy "admin history" on order_status_history for all using (is_admin()) with check (is_admin());
-- o cardápio público mostra também sabores desligados (como "Esgotado hoje")

-- 3) Pedido vindo do site: preços recalculados aqui, nunca confiando no navegador
create or replace function create_order(p jsonb) returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
  v_sub numeric := 0;
  v_fee numeric;
  v_zone delivery_zones%rowtype;
  it jsonb;
  pr products%rowtype;
begin
  if jsonb_array_length(coalesce(p->'items', '[]')) = 0 then raise exception 'pedido sem itens'; end if;
  if p->>'fulfillment' = 'entrega' then
    select * into v_zone from delivery_zones where name = p->>'neighborhood' and is_active;
    v_fee := v_zone.fee; -- null = bairro fora da lista, taxa a combinar
  else
    v_fee := 0;
  end if;

  insert into orders (code, customer_name, customer_phone, fulfillment, address_cep, address_street, address_number,
    address_complement, address_neighborhood, delivery_zone_id, delivery_fee, scheduled_for, payment_method, change_for, notes, subtotal, total)
  values (p->>'code', p->>'name', p->>'phone', (p->>'fulfillment')::fulfillment, p->>'cep', p->>'street', p->>'number',
    p->>'complement', p->>'neighborhood', v_zone.id, v_fee, (p->>'scheduled_for')::timestamptz, (p->>'payment')::payment_method,
    nullif(p->>'change_for', '')::numeric, left(p->>'notes', 500), 0, 0)
  returning id into v_id;

  for it in select * from jsonb_array_elements(p->'items') loop
    select * into pr from products where slug = it->>'slug' and is_available and not is_archived;
    if not found then raise exception 'produto indisponivel: %', it->>'slug'; end if;
    if (it->>'qty')::numeric <= 0 then raise exception 'quantidade invalida'; end if;
    insert into order_items (order_id, product_id, product_name, category, unit, unit_price, quantity, line_total)
    values (v_id, pr.id, pr.name, pr.category, pr.unit, pr.price, (it->>'qty')::numeric, pr.price * (it->>'qty')::numeric);
    v_sub := v_sub + pr.price * (it->>'qty')::numeric;
  end loop;

  update orders set subtotal = v_sub, total = v_sub + coalesce(v_fee, 0) where id = v_id;
  return p->>'code';
end $$;

revoke all on function create_order(jsonb) from public;
grant execute on function create_order(jsonb) to anon, authenticated;

-- 4) Seu e-mail de administrador (troque se usar outro para entrar no Painel)
insert into admins (email) values ('christian.silveira.br@gmail.com') on conflict do nothing;
