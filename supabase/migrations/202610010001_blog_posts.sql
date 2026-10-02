begin;

-- Reuse the existing Studio allowlist without making that table public.
create or replace function public.can_manage_blog()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.delivery_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.can_manage_blog() from public;
grant execute on function public.can_manage_blog() to authenticated;

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 160),
  slug text not null unique check (length(slug) between 1 and 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  excerpt text not null default '' check (length(excerpt) <= 300),
  body text not null check (length(trim(body)) between 1 and 30000),
  cover_url text not null default '' check (length(cover_url) <= 2048 and (cover_url = '' or cover_url ~ '^https://')),
  cover_alt text not null default '' check (length(cover_alt) <= 180),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists blog_posts_published on public.blog_posts(published_at desc) where published_at is not null;
alter table public.blog_posts enable row level security;
revoke all on public.blog_posts from anon, authenticated;
grant select on public.blog_posts to anon, authenticated;
grant insert, update, delete on public.blog_posts to authenticated;
grant all on public.blog_posts to service_role;
create policy "Anyone reads published posts" on public.blog_posts for select to anon, authenticated
  using (published_at is not null and published_at <= now());
create policy "Studio manages blog" on public.blog_posts for all to authenticated
  using ((select public.can_manage_blog())) with check ((select public.can_manage_blog()));

create or replace function public.touch_blog_post()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = clock_timestamp(); return new; end;
$$;
revoke all on function public.touch_blog_post() from public, anon, authenticated;
create trigger blog_post_updated before update on public.blog_posts for each row execute function public.touch_blog_post();
commit;
