-- BuildFlow Phase 2: core project operations, project assignments, structures, stages, tasks, and RLS.

create extension if not exists pgcrypto;

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  status text not null default 'active',
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, user_id),
  constraint project_members_role_check check (role in ('director','head_project_manager','project_manager','qa_inspector','contractor','site_supervisor','client_owner_viewer','accountant_cost_controller','safety_officer')),
  constraint project_members_status_check check (status in ('active','inactive','pending','suspended','archived'))
);

create table if not exists public.project_areas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_area_id uuid references public.project_areas(id) on delete set null,
  area_type text not null,
  name text not null,
  description text,
  sort_order integer not null default 0,
  status text not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_areas_area_type_check check (area_type in ('phase','zone','block','building','floor','unit','lot','house','work_area','custom')),
  constraint project_areas_status_check check (status in ('active','inactive','archived'))
);

create table if not exists public.construction_stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_area_id uuid references public.project_areas(id) on delete set null,
  name text not null,
  description text,
  stage_type text,
  status text not null default 'not_started',
  progress_percent numeric not null default 0,
  start_date date,
  due_date date,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint construction_stages_status_check check (status in ('not_started','in_progress','ready_for_review','under_inspection','approved','delayed','completed')),
  constraint construction_stages_progress_check check (progress_percent >= 0 and progress_percent <= 100)
);

create table if not exists public.construction_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_area_id uuid references public.project_areas(id) on delete set null,
  stage_id uuid references public.construction_stages(id) on delete set null,
  title text not null,
  description text,
  trade text,
  priority text not null default 'medium',
  status text not null default 'not_started',
  approval_status text not null default 'not_submitted',
  assigned_to uuid references auth.users(id) on delete set null,
  assigned_company text,
  due_date date,
  start_date date,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint construction_tasks_status_check check (status in ('not_started','in_progress','ready_for_review','under_inspection','approved','rejected','needs_correction','rework_submitted','completed')),
  constraint construction_tasks_approval_status_check check (approval_status in ('not_submitted','ready_for_review','under_review','approved','rejected','needs_correction')),
  constraint construction_tasks_priority_check check (priority in ('low','medium','high','urgent'))
);

create table if not exists public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid not null references public.construction_tasks(id) on delete cascade,
  label text not null,
  is_completed boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_updates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid not null references public.construction_tasks(id) on delete cascade,
  update_type text not null default 'note',
  message text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists project_members_workspace_project_idx on public.project_members(workspace_id, project_id);
create index if not exists project_members_user_idx on public.project_members(user_id);
create index if not exists project_areas_project_idx on public.project_areas(project_id, parent_area_id);
create index if not exists construction_stages_project_idx on public.construction_stages(project_id, project_area_id);
create index if not exists construction_tasks_project_idx on public.construction_tasks(project_id, status, priority);
create index if not exists construction_tasks_assigned_to_idx on public.construction_tasks(assigned_to);
create index if not exists task_checklist_items_task_idx on public.task_checklist_items(task_id);
create index if not exists task_updates_task_idx on public.task_updates(task_id, created_at desc);

drop trigger if exists project_members_set_updated_at on public.project_members;
create trigger project_members_set_updated_at before update on public.project_members for each row execute function public.set_updated_at();
drop trigger if exists project_areas_set_updated_at on public.project_areas;
create trigger project_areas_set_updated_at before update on public.project_areas for each row execute function public.set_updated_at();
drop trigger if exists construction_stages_set_updated_at on public.construction_stages;
create trigger construction_stages_set_updated_at before update on public.construction_stages for each row execute function public.set_updated_at();
drop trigger if exists construction_tasks_set_updated_at on public.construction_tasks;
create trigger construction_tasks_set_updated_at before update on public.construction_tasks for each row execute function public.set_updated_at();
drop trigger if exists task_checklist_items_set_updated_at on public.task_checklist_items;
create trigger task_checklist_items_set_updated_at before update on public.task_checklist_items for each row execute function public.set_updated_at();

create or replace function public.get_workspace_role(target_workspace_id uuid, user_uuid uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public
as $$
  select wm.role::text
  from public.workspace_members wm
  join public.workspaces w on w.id = wm.workspace_id
  join public.profiles p on p.id = wm.user_id
  where wm.workspace_id = target_workspace_id
    and wm.user_id = user_uuid
    and wm.status = 'active'
    and w.status = 'active'
    and p.status = 'active'
  limit 1;
$$;

create or replace function public.get_project_role(target_project_id uuid, user_uuid uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public
as $$
  select pm.role
  from public.project_members pm
  join public.projects p on p.id = pm.project_id and p.workspace_id = pm.workspace_id
  where pm.project_id = target_project_id
    and pm.user_id = user_uuid
    and pm.status = 'active'
    and public.is_workspace_member(pm.workspace_id, user_uuid)
  limit 1;
$$;

create or replace function public.is_project_member(target_project_id uuid, user_uuid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = target_project_id
      and pm.user_id = user_uuid
      and pm.status = 'active'
      and public.is_workspace_member(pm.workspace_id, user_uuid)
  );
$$;

create or replace function public.can_manage_project(target_project_id uuid, user_uuid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = target_project_id
      and (
        public.has_workspace_role(p.workspace_id, array['company_admin','director','head_project_manager','project_manager']::public.buildflow_member_role[], user_uuid)
        or public.get_project_role(p.id, user_uuid) in ('director','head_project_manager','project_manager')
      )
  );
$$;

create or replace function public.can_view_project(target_project_id uuid, user_uuid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = target_project_id
      and (
        public.has_workspace_role(p.workspace_id, array['company_admin','director','head_project_manager','project_manager']::public.buildflow_member_role[], user_uuid)
        or public.is_project_member(p.id, user_uuid)
        or exists (select 1 from public.construction_tasks t where t.project_id = p.id and t.assigned_to = user_uuid)
      )
  );
$$;

create or replace function public.can_manage_task(target_task_id uuid, user_uuid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.construction_tasks t
    where t.id = target_task_id
      and public.can_manage_project(t.project_id, user_uuid)
  );
$$;

create or replace function public.can_view_task(target_task_id uuid, user_uuid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.construction_tasks t
    where t.id = target_task_id
      and (
        public.can_manage_project(t.project_id, user_uuid)
        or t.assigned_to = user_uuid
        or public.get_project_role(t.project_id, user_uuid) in ('qa_inspector','site_supervisor')
        or (public.get_project_role(t.project_id, user_uuid) = 'client_owner_viewer' and t.status in ('approved','completed'))
      )
  );
$$;

create or replace function public.can_update_assigned_task(target_task_id uuid, user_uuid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.construction_tasks t
    where t.id = target_task_id
      and t.assigned_to = user_uuid
      and public.get_project_role(t.project_id, user_uuid) in ('contractor','site_supervisor')
  );
$$;

create or replace function public.validate_project_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_workspace uuid;
begin
  select workspace_id into expected_workspace from public.projects where id = new.project_id;
  if expected_workspace is null or expected_workspace <> new.workspace_id then
    raise exception 'workspace_id must match project workspace';
  end if;
  return new;
end;
$$;

create or replace function public.validate_task_child_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  task_workspace uuid;
  task_project uuid;
begin
  select workspace_id, project_id into task_workspace, task_project from public.construction_tasks where id = new.task_id;
  if task_workspace is null or task_workspace <> new.workspace_id or task_project <> new.project_id then
    raise exception 'task child records must match task workspace and project';
  end if;
  return new;
end;
$$;

drop trigger if exists project_members_validate_scope on public.project_members;
create trigger project_members_validate_scope before insert or update on public.project_members for each row execute function public.validate_project_scope();
drop trigger if exists project_areas_validate_scope on public.project_areas;
create trigger project_areas_validate_scope before insert or update on public.project_areas for each row execute function public.validate_project_scope();
drop trigger if exists construction_stages_validate_scope on public.construction_stages;
create trigger construction_stages_validate_scope before insert or update on public.construction_stages for each row execute function public.validate_project_scope();
drop trigger if exists construction_tasks_validate_scope on public.construction_tasks;
create trigger construction_tasks_validate_scope before insert or update on public.construction_tasks for each row execute function public.validate_project_scope();
drop trigger if exists task_checklist_items_validate_scope on public.task_checklist_items;
create trigger task_checklist_items_validate_scope before insert or update on public.task_checklist_items for each row execute function public.validate_task_child_scope();
drop trigger if exists task_updates_validate_scope on public.task_updates;
create trigger task_updates_validate_scope before insert or update on public.task_updates for each row execute function public.validate_task_child_scope();


create or replace function public.enforce_assigned_task_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.can_manage_project(old.project_id, auth.uid()) or public.is_platform_admin() then
    return new;
  end if;

  if old.assigned_to = auth.uid() and public.get_project_role(old.project_id, auth.uid()) in ('contractor','site_supervisor') then
    if new.workspace_id <> old.workspace_id
      or new.project_id <> old.project_id
      or new.project_area_id is distinct from old.project_area_id
      or new.stage_id is distinct from old.stage_id
      or new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.trade is distinct from old.trade
      or new.priority is distinct from old.priority
      or new.assigned_to is distinct from old.assigned_to
      or new.assigned_company is distinct from old.assigned_company
      or new.due_date is distinct from old.due_date
      or new.start_date is distinct from old.start_date
      or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at then
      raise exception 'assigned task users may only update permitted workflow fields';
    end if;

    if new.status in ('approved','rejected','needs_correction','under_inspection')
      or new.approval_status in ('under_review','approved','rejected','needs_correction') then
      raise exception 'assigned task users cannot approve, reject, or inspect their own tasks';
    end if;

    if new.status = 'completed' and old.approval_status <> 'approved' then
      raise exception 'assigned task users can only complete approved tasks';
    end if;

    return new;
  end if;

  raise exception 'not authorized to update this task';
end;
$$;

drop trigger if exists construction_tasks_enforce_assigned_update on public.construction_tasks;
create trigger construction_tasks_enforce_assigned_update before update on public.construction_tasks for each row execute function public.enforce_assigned_task_update_scope();

create or replace function public.enforce_assigned_checklist_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.can_manage_task(old.task_id, auth.uid()) or public.is_platform_admin() then
    return new;
  end if;

  if public.can_update_assigned_task(old.task_id, auth.uid()) then
    if new.workspace_id <> old.workspace_id
      or new.project_id <> old.project_id
      or new.task_id <> old.task_id
      or new.label is distinct from old.label
      or new.sort_order is distinct from old.sort_order
      or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at then
      raise exception 'assigned task users may only complete checklist items';
    end if;
    return new;
  end if;

  raise exception 'not authorized to update this checklist item';
end;
$$;

drop trigger if exists task_checklist_items_enforce_assigned_update on public.task_checklist_items;
create trigger task_checklist_items_enforce_assigned_update before update on public.task_checklist_items for each row execute function public.enforce_assigned_checklist_update_scope();

alter table public.project_members enable row level security;
alter table public.project_areas enable row level security;
alter table public.construction_stages enable row level security;
alter table public.construction_tasks enable row level security;
alter table public.task_checklist_items enable row level security;
alter table public.task_updates enable row level security;

-- Tighten Phase 1 broad project/activity visibility so contractors only receive assigned project/task context.
drop policy if exists "projects_select_workspace_members" on public.projects;
create policy "projects_select_project_operations_view" on public.projects
  for select to authenticated
  using (public.can_view_project(id) or public.is_platform_admin());

drop policy if exists "activity_logs_select_workspace_members" on public.activity_logs;
create policy "activity_logs_select_project_operations_view" on public.activity_logs
  for select to authenticated
  using (
    public.is_platform_admin()
    or public.has_workspace_role(workspace_id, array['company_admin','director','head_project_manager','project_manager']::public.buildflow_member_role[])
    or (project_id is not null and public.can_view_project(project_id))
    or created_by = auth.uid()
  );

create policy "project_members_select_project_viewers" on public.project_members
  for select to authenticated
  using (public.can_view_project(project_id) or user_id = auth.uid() or public.is_platform_admin());

create policy "project_members_manage_project_managers" on public.project_members
  for all to authenticated
  using (public.can_manage_project(project_id) or public.is_platform_admin())
  with check (public.can_manage_project(project_id) or public.is_platform_admin());

create policy "project_areas_select_project_viewers" on public.project_areas
  for select to authenticated
  using (public.can_view_project(project_id) or public.is_platform_admin());

create policy "project_areas_insert_project_managers" on public.project_areas
  for insert to authenticated
  with check (created_by = auth.uid() and public.can_manage_project(project_id));

create policy "project_areas_update_project_managers" on public.project_areas
  for update to authenticated
  using (public.can_manage_project(project_id) or public.is_platform_admin())
  with check (public.can_manage_project(project_id) or public.is_platform_admin());

create policy "project_areas_delete_project_managers" on public.project_areas
  for delete to authenticated
  using (public.can_manage_project(project_id) or public.is_platform_admin());

create policy "construction_stages_select_project_viewers" on public.construction_stages
  for select to authenticated
  using (public.can_view_project(project_id) or public.is_platform_admin());

create policy "construction_stages_insert_project_managers" on public.construction_stages
  for insert to authenticated
  with check (created_by = auth.uid() and public.can_manage_project(project_id));

create policy "construction_stages_update_project_managers" on public.construction_stages
  for update to authenticated
  using (public.can_manage_project(project_id) or public.is_platform_admin())
  with check (public.can_manage_project(project_id) or public.is_platform_admin());

create policy "construction_stages_delete_project_managers" on public.construction_stages
  for delete to authenticated
  using (public.can_manage_project(project_id) or public.is_platform_admin());

create policy "construction_tasks_select_authorized" on public.construction_tasks
  for select to authenticated
  using (
    public.can_manage_project(project_id)
    or assigned_to = auth.uid()
    or public.get_project_role(project_id) in ('qa_inspector','site_supervisor')
    or (public.get_project_role(project_id) = 'client_owner_viewer' and status in ('approved','completed'))
    or public.is_platform_admin()
  );

create policy "construction_tasks_insert_project_managers" on public.construction_tasks
  for insert to authenticated
  with check (created_by = auth.uid() and public.can_manage_project(project_id));

create policy "construction_tasks_update_managers_or_assignees" on public.construction_tasks
  for update to authenticated
  using (public.can_manage_project(project_id) or public.can_update_assigned_task(id) or public.is_platform_admin())
  with check (
    public.is_platform_admin()
    or public.can_manage_project(project_id)
    or (
      assigned_to = auth.uid()
      and public.can_update_assigned_task(id)
      and status in ('not_started','in_progress','ready_for_review','rework_submitted','completed')
      and approval_status in ('not_submitted','ready_for_review','approved')
      and (status <> 'completed' or approval_status = 'approved')
    )
  );

create policy "task_checklist_items_select_authorized" on public.task_checklist_items
  for select to authenticated
  using (public.can_view_task(task_id) or public.is_platform_admin());

create policy "task_checklist_items_insert_managers" on public.task_checklist_items
  for insert to authenticated
  with check (created_by = auth.uid() and public.can_manage_task(task_id));

create policy "task_checklist_items_update_managers_or_assignees" on public.task_checklist_items
  for update to authenticated
  using (public.can_manage_task(task_id) or public.can_update_assigned_task(task_id) or public.is_platform_admin())
  with check (public.can_manage_task(task_id) or public.can_update_assigned_task(task_id) or public.is_platform_admin());

create policy "task_updates_select_authorized" on public.task_updates
  for select to authenticated
  using (public.can_view_task(task_id) or public.is_platform_admin());

create policy "task_updates_insert_authorized" on public.task_updates
  for insert to authenticated
  with check (created_by = auth.uid() and (public.can_manage_task(task_id) or public.can_update_assigned_task(task_id)));
