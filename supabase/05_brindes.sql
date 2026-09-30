-- Brindes: manuais (no pedido) e automáticos (promoção "ganhe um brinde").
-- Cole tudo no SQL Editor do Supabase e clique em Run (pode rodar mais de uma vez).

alter table order_items add column if not exists is_gift boolean not null default false;
alter table coupons add column if not exists gift_slug text;
alter table coupons add column if not exists gift_qty numeric(10,3) not null default 1;
alter table coupons drop constraint if exists coupons_kind_check;
alter table coupons add constraint coupons_kind_check check (kind in ('percent', 'fixed', 'free_delivery', 'gift'));

create or replace function check_coupon(p_code text, p_subtotal numeric, p_fee numeric default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c coupons%rowtype; d numeric; g text;
begin
  select * into c from coupons
   where active and (expires_at is null or expires_at >= current_date) and (max_uses is null or uses < max_uses)
     and p_subtotal >= min_order
     and ((coalesce(p_code, '') <> '' and upper(code) = upper(trim(p_code))) or (coalesce(p_code, '') = '' and auto))
   order by case kind when 'fixed' then value when 'percent' then p_subtotal * value / 100 when 'gift' then 0.01 else coalesce(p_fee, 0) end desc
   limit 1;
  if not found then return null; end if;
  d := case c.kind when 'percent' then round(p_subtotal * c.value / 100, 2) when 'fixed' then least(c.value, p_subtotal)
                   when 'free_delivery' then coalesce(p_fee, 0) else 0 end;
  if c.kind = 'gift' then
    select (case category when 'empadao' then 'Empadão ' else 'Empadinha ' end) || name into g from products where slug = c.gift_slug;
  end if;
  return jsonb_build_object('id', c.id, 'code', c.code, 'description', c.description, 'kind', c.kind, 'discount', d,
                            'gift_slug', c.gift_slug, 'gift_qty', c.gift_qty, 'gift_name', g);
end $$;
grant execute on function check_coupon(text, numeric, numeric) to anon, authenticated;

create or replace function create_order(p jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_sub numeric := 0; v_fee numeric; v_zone delivery_zones%rowtype; it jsonb; pr products%rowtype;
  v_c jsonb; v_disc numeric := 0;
begin
  if jsonb_array_length(coalesce(p->'items', '[]')) = 0 then raise exception 'pedido sem itens'; end if;
  if p->>'fulfillment' = 'entrega' then
    select * into v_zone from delivery_zones where name = p->>'neighborhood' and is_active;
    v_fee := v_zone.fee;
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
    values (v_id, pr.id, pr.name, pr.category, pr.unit, pr.price, (it->>'qty')::numeric, round(pr.price * (it->>'qty')::numeric, 2));
    v_sub := v_sub + round(pr.price * (it->>'qty')::numeric, 2);
  end loop;

  v_c := check_coupon(p->>'coupon', v_sub, v_fee);
  if v_c is not null then
    v_disc := (v_c->>'discount')::numeric;
    update coupons set uses = uses + 1 where id = (v_c->>'id')::uuid;
    if v_c->>'kind' = 'gift' then
      select * into pr from products where slug = v_c->>'gift_slug';
      if found then
        insert into order_items (order_id, product_id, product_name, category, unit, unit_price, quantity, line_total, is_gift)
        values (v_id, pr.id, pr.name, pr.category, pr.unit, 0, (v_c->>'gift_qty')::numeric, 0, true);
      end if;
    end if;
  end if;

  update orders set subtotal = v_sub, discount = v_disc, coupon_code = coalesce(v_c->>'code', v_c->>'description'),
         total = v_sub + coalesce(v_fee, 0) - v_disc
   where id = v_id;
  return p->>'code';
end $$;
grant execute on function create_order(jsonb) to anon, authenticated;
