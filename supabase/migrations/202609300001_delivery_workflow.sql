begin;
create table if not exists public.delivery_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
insert into public.delivery_admins(user_id)
select id from auth.users where lower(email) = 'zac@zrphotos.net'
on conflict do nothing;

create table if not exists public.delivery_requests (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique,
  name text not null check (length(name) between 1 and 100),
  contact text not null check (length(contact) between 1 and 200),
  message text not null check (length(message) between 1 and 3000),
  preferred_date text not null default '',
  status text not null default 'pending' check (status in ('pending','accepted','processing','folder_error','ready','published','declined')),
  details jsonb,
  details_token text not null default encode(extensions.gen_random_bytes(32),'hex') unique,
  token_expires_at timestamptz,
  gallery_token text not null default encode(extensions.gen_random_bytes(32),'hex') unique,
  drive_folder_id text unique,
  lock_id uuid,
  locked_at timestamptz,
  last_error text,
  completed_by text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  published_at timestamptz
);
create index if not exists delivery_requests_created on public.delivery_requests(created_at desc);
alter table public.delivery_admins enable row level security;
alter table public.delivery_requests enable row level security;
revoke all on public.delivery_admins, public.delivery_requests from anon, authenticated;
grant all on public.delivery_admins, public.delivery_requests to service_role;

-- One transaction makes retries safe and prevents concurrent spam submissions
-- from bypassing the contact-level quota. No public database access is granted.
create or replace function public.delivery_enquire(p_submission uuid, p_name text, p_contact text, p_message text, p_date text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare existing uuid; new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('delivery-enquiries',0));
  select id into existing from delivery_requests where submission_id=p_submission;
  if existing is not null then return jsonb_build_object('created',false); end if;
  if (select count(*) from delivery_requests where lower(contact)=lower(p_contact) and created_at>now()-interval '1 hour') >= 3
     or (select count(*) from delivery_requests where created_at>now()-interval '15 minutes') >= 100 then
    raise exception 'Too many enquiries. Please try again later.' using errcode='P0001';
  end if;
  insert into delivery_requests(submission_id,name,contact,message,preferred_date)
  values(p_submission,p_name,p_contact,p_message,p_date) returning id into new_id;
  return jsonb_build_object('created',true);
end $$;
revoke all on function public.delivery_enquire(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.delivery_enquire(uuid,text,text,text,text) to service_role;
commit;
