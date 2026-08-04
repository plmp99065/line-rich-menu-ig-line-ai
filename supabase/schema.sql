-- 窩的家客服：Supabase / PostgreSQL production schema
create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'agent' check (role in ('owner','admin','agent')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index if not exists organization_members_user_idx on public.organization_members(user_id);

create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org and m.user_id = (select auth.uid())
  );
$$;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  line_user_id text not null,
  display_name text not null,
  avatar_url text,
  tags text[] not null default '{}',
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, line_user_id)
);
create index if not exists customers_org_updated_idx on public.customers(organization_id, updated_at desc);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  status text not null default 'ai' check (status in ('ai','human','resolved')),
  assignee_id uuid references auth.users(id) on delete set null,
  ai_paused boolean not null default false,
  summary text,
  unread_count integer not null default 0 check (unread_count >= 0),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists conversations_org_status_time_idx on public.conversations(organization_id, status, last_message_at desc);
create index if not exists conversations_customer_idx on public.conversations(customer_id);
create index if not exists conversations_assignee_idx on public.conversations(assignee_id) where assignee_id is not null;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  line_message_id text,
  sender_type text not null check (sender_type in ('customer','agent','ai','system')),
  body text not null,
  delivery_status text not null default 'received' check (delivery_status in ('received','draft','sent','failed')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_time_idx on public.messages(conversation_id, created_at);
create index if not exists messages_org_time_idx on public.messages(organization_id, created_at desc);
create unique index if not exists messages_line_id_unique on public.messages(organization_id, line_message_id) where line_message_id is not null;

create table if not exists public.handoffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open','claimed','closed')),
  claimed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists handoffs_org_status_idx on public.handoffs(organization_id, status, created_at desc);
create index if not exists handoffs_conversation_idx on public.handoffs(conversation_id);

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  storage_path text,
  mime_type text,
  openai_file_id text,
  vector_store_id text,
  status text not null default 'processing' check (status in ('processing','ready','failed','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists knowledge_documents_org_status_idx on public.knowledge_documents(organization_id, status, updated_at desc);

create table if not exists public.rich_menus (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  page_key text not null check (page_key in ('home','service')),
  name text not null,
  image_path text,
  line_rich_menu_id text,
  alias_id text,
  status text not null default 'draft' check (status in ('draft','publishing','published','failed')),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (organization_id, page_key)
);
create index if not exists rich_menus_org_status_idx on public.rich_menus(organization_id, status);

create table if not exists public.rich_menu_areas (
  id uuid primary key default gen_random_uuid(),
  rich_menu_id uuid not null references public.rich_menus(id) on delete cascade,
  position smallint not null check (position between 1 and 8),
  label text not null,
  action_type text not null check (action_type in ('uri','message','richmenuswitch')),
  action_value text not null,
  bounds jsonb not null,
  unique (rich_menu_id, position)
);
create index if not exists rich_menu_areas_menu_idx on public.rich_menu_areas(rich_menu_id);

create table if not exists public.metric_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null,
  conversation_id uuid references public.conversations(id) on delete set null,
  properties jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);
create index if not exists metric_events_org_type_time_idx on public.metric_events(organization_id, event_type, occurred_at desc);
create index if not exists metric_events_conversation_idx on public.metric_events(conversation_id) where conversation_id is not null;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.customers enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.handoffs enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.rich_menus enable row level security;
alter table public.rich_menu_areas enable row level security;
alter table public.metric_events enable row level security;

create policy organizations_member_access on public.organizations for select to authenticated using ((select public.is_org_member(id)));
create policy members_org_access on public.organization_members for select to authenticated using ((select public.is_org_member(organization_id)));
create policy customers_org_access on public.customers for all to authenticated using ((select public.is_org_member(organization_id))) with check ((select public.is_org_member(organization_id)));
create policy conversations_org_access on public.conversations for all to authenticated using ((select public.is_org_member(organization_id))) with check ((select public.is_org_member(organization_id)));
create policy messages_org_access on public.messages for all to authenticated using ((select public.is_org_member(organization_id))) with check ((select public.is_org_member(organization_id)));
create policy handoffs_org_access on public.handoffs for all to authenticated using ((select public.is_org_member(organization_id))) with check ((select public.is_org_member(organization_id)));
create policy knowledge_org_access on public.knowledge_documents for all to authenticated using ((select public.is_org_member(organization_id))) with check ((select public.is_org_member(organization_id)));
create policy rich_menus_org_access on public.rich_menus for all to authenticated using ((select public.is_org_member(organization_id))) with check ((select public.is_org_member(organization_id)));
create policy rich_menu_areas_org_access on public.rich_menu_areas for all to authenticated using ((select public.is_org_member((select organization_id from public.rich_menus where id = rich_menu_id)))) with check ((select public.is_org_member((select organization_id from public.rich_menus where id = rich_menu_id))));
create policy metric_events_org_access on public.metric_events for all to authenticated using ((select public.is_org_member(organization_id))) with check ((select public.is_org_member(organization_id)));
