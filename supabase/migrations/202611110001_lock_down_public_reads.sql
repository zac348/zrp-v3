-- Lock down what the public (anon) key can read, and who can write.
--
-- Before: the public key could list old bookings (names, emails, phones), every
-- client gallery link, every private client photo, and every coupon code; and
-- the older tables' write rules were created by hand outside this repo.
-- After:
--   bookings            Studio admins only.
--   client_galleries    Studio admins only. A visitor with a gallery link reads
--                       that one gallery through get_gallery(slug).
--   portfolio_photos    Public can read only photos marked for the portfolio.
--   coupons             Studio admins only. The booking form checks one code at
--                       a time through check_coupon(code).
--   availability, package_pricing, addon_pricing
--                       Public read (the booking page needs them); only Studio
--                       admins can change them.
-- "Studio admin" = an account listed in delivery_admins (can_manage_blog()).
--
-- Deploy the site code that calls get_gallery / check_coupon BEFORE running
-- this. Safe to run more than once. Runs in one transaction: all or nothing.
-- To keep a copy of the old rules first, run and save the output of:
--   select * from pg_policies where schemaname = 'public';
begin;

-- Remove every existing rule on these tables, whatever it was called.
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public'
             and tablename in ('bookings','client_galleries','portfolio_photos','coupons','availability','package_pricing','addon_pricing')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table public.bookings          enable row level security;
alter table public.client_galleries  enable row level security;
alter table public.portfolio_photos  enable row level security;
alter table public.coupons           enable row level security;
alter table public.availability      enable row level security;
alter table public.package_pricing   enable row level security;
alter table public.addon_pricing     enable row level security;

revoke all on public.bookings, public.client_galleries, public.coupons from anon;
revoke insert, update, delete on public.portfolio_photos, public.availability, public.package_pricing, public.addon_pricing from anon;
grant select on public.portfolio_photos, public.availability, public.package_pricing, public.addon_pricing to anon, authenticated;
grant select, insert, update, delete on public.bookings, public.client_galleries, public.portfolio_photos, public.coupons,
  public.availability, public.package_pricing, public.addon_pricing to authenticated;

-- Studio admins: full access to all seven tables.
create policy "Studio manages bookings"   on public.bookings         for all to authenticated using ((select public.can_manage_blog())) with check ((select public.can_manage_blog()));
create policy "Studio manages galleries"  on public.client_galleries for all to authenticated using ((select public.can_manage_blog())) with check ((select public.can_manage_blog()));
create policy "Studio manages photos"     on public.portfolio_photos for all to authenticated using ((select public.can_manage_blog())) with check ((select public.can_manage_blog()));
create policy "Studio manages coupons"    on public.coupons          for all to authenticated using ((select public.can_manage_blog())) with check ((select public.can_manage_blog()));
create policy "Studio manages calendar"   on public.availability     for all to authenticated using ((select public.can_manage_blog())) with check ((select public.can_manage_blog()));
create policy "Studio manages packages"   on public.package_pricing  for all to authenticated using ((select public.can_manage_blog())) with check ((select public.can_manage_blog()));
create policy "Studio manages add-ons"    on public.addon_pricing    for all to authenticated using ((select public.can_manage_blog())) with check ((select public.can_manage_blog()));

-- Public reads the booking page and portfolio need.
create policy "Anyone reads portfolio photos" on public.portfolio_photos for select to anon, authenticated using (on_portfolio = true);
create policy "Anyone reads the calendar"     on public.availability     for select to anon, authenticated using (true);
create policy "Anyone reads packages"         on public.package_pricing  for select to anon, authenticated using (true);
create policy "Anyone reads add-ons"          on public.addon_pricing    for select to anon, authenticated using (true);

-- One gallery, by its exact link. Never a list.
create or replace function public.get_gallery(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'gallery', jsonb_build_object('id', g.id, 'name', g.name, 'slug', g.slug, 'watermarked', coalesce(g.watermarked, false)),
    'photos', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from public.portfolio_photos p where p.gallery_id = g.id), '[]'::jsonb))
  from public.client_galleries g
  where p_slug is not null and length(p_slug) between 1 and 200 and g.slug = p_slug
  limit 1;
$$;

-- One photo's storage location, only when it belongs to that gallery.
create or replace function public.get_gallery_file(p_slug text, p_photo text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('storage_path', p.storage_path, 'url', p.url, 'file_name', p.file_name)
  from public.client_galleries g
  join public.portfolio_photos p on p.gallery_id = g.id
  where p_slug is not null and g.slug = p_slug and p.id::text = p_photo
  limit 1;
$$;

-- One active coupon, by its exact code. Never a list.
create or replace function public.check_coupon(p_code text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('code', c.code, 'type', c.type, 'value', c.value, 'expires_at', c.expires_at, 'max_uses', c.max_uses, 'uses', c.uses, 'active', c.active)
  from public.coupons c
  where p_code is not null and length(p_code) between 1 and 80 and c.code = upper(trim(p_code)) and c.active = true
  limit 1;
$$;

revoke all on function public.get_gallery(text), public.get_gallery_file(text, text), public.check_coupon(text) from public;
grant execute on function public.get_gallery(text), public.get_gallery_file(text, text), public.check_coupon(text) to anon, authenticated;

commit;
