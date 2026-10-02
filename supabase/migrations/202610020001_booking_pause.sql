begin;

-- One row of site-wide switches. Studio uses it to pause online booking until a
-- resume time; the site treats the pause as over once that time passes.
create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),
  booking_paused boolean not null default false,
  booking_resume_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint booking_pause_has_resume check (not booking_paused or booking_resume_at is not null)
);
insert into public.site_settings (id) values (1) on conflict do nothing;

alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant update (booking_paused, booking_resume_at) on public.site_settings to authenticated;
grant all on public.site_settings to service_role;

-- The pause is public information: /book and the booking endpoint read it.
drop policy if exists "Anyone reads site settings" on public.site_settings;
create policy "Anyone reads site settings" on public.site_settings for select to anon, authenticated
  using (true);
-- Only the Studio allowlist (delivery_admins, via can_manage_blog) may change it.
drop policy if exists "Studio updates site settings" on public.site_settings;
create policy "Studio updates site settings" on public.site_settings for update to authenticated
  using ((select public.can_manage_blog())) with check ((select public.can_manage_blog()));

create or replace function public.touch_site_settings()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = clock_timestamp(); return new; end;
$$;
revoke all on function public.touch_site_settings() from public, anon, authenticated;
drop trigger if exists site_settings_updated on public.site_settings;
create trigger site_settings_updated before update on public.site_settings for each row execute function public.touch_site_settings();

commit;
