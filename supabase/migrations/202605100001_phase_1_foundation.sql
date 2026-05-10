-- BuildFlow Phase 1 SaaS foundation: multi-tenant workspaces, roles, projects, notifications, and activity logs.

create extension if not exists pgcrypto;

create type public.buildflow_platform_role as enum ('platform_admin');
create type public.buildflow_member_role as enum (
  'company_admin',
  'director',
  'head_project_manager',
  'project_manager',
  'qa_inspector',
  'contractor',
  'site_supervisor',
  'client_owner_viewer',
  'accountant_cost_controller',
  'safety_officer'
);
create type public.buildflow_record_status as enum ('active', 'inactive', 'pending', 'suspended', 'archived');
create type public.buildflow_measurement_system as enum ('metric', 'imperial');
create type public.buildflow_project_status as enum ('planning', 'active', 'on_hold', 'completed', 'cancelled', 'archived');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  platform_role public.buildflow_platform_role,
  status public.buildflow_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_type text not null,
  country text not null,
  default_currency char(3) not null,
  default_timezone text not null,
  measurement_system public.buildflow_measurement_system not null default 'metric',
  status public.buildflow_record_status not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.buildflow_member_role not null,
  status public.buildflow_record_status not null default 'pending',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  project_type text not null,
  country text not null,
  location text,
  start_date date,
  expected_completion_date date,
  budget_amount numeric(14,2),
  currency char(3) not null,
  timezone text not null,
  measurement_system public.buildflow_measurement_system not null default 'metric',
  client_name text,
  status public.buildflow_project_status not null default 'planning',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  notification_type text not null default 'info',
  read_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workspace_members_user_id_idx on public.workspace_members(user_id);
create index workspace_members_workspace_id_idx on public.workspace_members(workspace_id);
create index projects_workspace_id_idx on public.projects(workspace_id);
create index activity_logs_workspace_id_idx on public.activity_logs(workspace_id);
create index notifications_workspace_user_idx on public.notifications(workspace_id, user_id);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger workspaces_set_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
create trigger workspace_members_set_updated_at before update on public.workspace_members for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger activity_logs_set_updated_at before update on public.activity_logs for each row execute function public.set_updated_at();
create trigger notifications_set_updated_at before update on public.notifications for each row execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email)
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create or replace function public.is_platform_admin(user_uuid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_uuid
      and platform_role = 'platform_admin'
      and status = 'active'
  );
$$;

create or replace function public.is_workspace_member(target_workspace_id uuid, user_uuid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members wm
    join public.workspaces w on w.id = wm.workspace_id
    join public.profiles p on p.id = wm.user_id
    where wm.workspace_id = target_workspace_id
      and wm.user_id = user_uuid
      and wm.status = 'active'
      and w.status = 'active'
      and p.status = 'active'
  );
$$;

create or replace function public.has_workspace_role(target_workspace_id uuid, allowed_roles public.buildflow_member_role[], user_uuid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members wm
    join public.workspaces w on w.id = wm.workspace_id
    join public.profiles p on p.id = wm.user_id
    where wm.workspace_id = target_workspace_id
      and wm.user_id = user_uuid
      and wm.role = any(allowed_roles)
      and wm.status = 'active'
      and w.status = 'active'
      and p.status = 'active'
  );
$$;

create or replace function public.add_workspace_creator_as_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.workspace_members (workspace_id, user_id, role, status, invited_by)
    values (new.id, new.created_by, 'company_admin', 'active', new.created_by)
    on conflict (workspace_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_workspace_created
after insert on public.workspaces
for each row execute function public.add_workspace_creator_as_admin();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notifications enable row level security;

create policy "profiles_select_self_or_platform_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_platform_admin());

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and platform_role is null);

create policy "workspaces_select_member" on public.workspaces
  for select to authenticated
  using (public.is_workspace_member(id) or public.is_platform_admin());

create policy "workspaces_insert_authenticated" on public.workspaces
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "workspaces_update_admins" on public.workspaces
  for update to authenticated
  using (public.has_workspace_role(id, array['company_admin','director']::public.buildflow_member_role[]) or public.is_platform_admin())
  with check (public.has_workspace_role(id, array['company_admin','director']::public.buildflow_member_role[]) or public.is_platform_admin());

create policy "workspace_members_select_workspace_members" on public.workspace_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_workspace_member(workspace_id) or public.is_platform_admin());

create policy "workspace_members_manage_company_admins" on public.workspace_members
  for all to authenticated
  using (public.has_workspace_role(workspace_id, array['company_admin']::public.buildflow_member_role[]) or public.is_platform_admin())
  with check (public.has_workspace_role(workspace_id, array['company_admin']::public.buildflow_member_role[]) or public.is_platform_admin());

create policy "projects_select_workspace_members" on public.projects
  for select to authenticated
  using (public.is_workspace_member(workspace_id) or public.is_platform_admin());

create policy "projects_insert_authorized_roles" on public.projects
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.has_workspace_role(workspace_id, array['company_admin','director','head_project_manager','project_manager']::public.buildflow_member_role[])
  );

create policy "projects_update_authorized_roles" on public.projects
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['company_admin','director','head_project_manager','project_manager']::public.buildflow_member_role[]) or public.is_platform_admin())
  with check (public.has_workspace_role(workspace_id, array['company_admin','director','head_project_manager','project_manager']::public.buildflow_member_role[]) or public.is_platform_admin());

create policy "activity_logs_select_workspace_members" on public.activity_logs
  for select to authenticated
  using (public.is_workspace_member(workspace_id) or public.is_platform_admin());

create policy "activity_logs_insert_authorized_members" on public.activity_logs
  for insert to authenticated
  with check (created_by = auth.uid() and public.is_workspace_member(workspace_id));

create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using ((user_id = auth.uid() and public.is_workspace_member(workspace_id)) or public.is_platform_admin());

create policy "notifications_update_own_read_state" on public.notifications
  for update to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

create policy "notifications_insert_workspace_admins" on public.notifications
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.has_workspace_role(workspace_id, array['company_admin','director','head_project_manager','project_manager']::public.buildflow_member_role[])
  );
