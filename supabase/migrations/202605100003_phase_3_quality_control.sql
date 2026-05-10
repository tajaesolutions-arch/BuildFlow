-- BuildFlow Phase 3: QA inspections, punch lists, private proof photos, verified completion, and RLS.

create extension if not exists pgcrypto;

create table if not exists public.inspection_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  trade text,
  project_type text,
  is_default boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspection_template_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  template_id uuid not null references public.inspection_templates(id) on delete cascade,
  label text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_area_id uuid references public.project_areas(id) on delete set null,
  stage_id uuid references public.construction_stages(id) on delete set null,
  task_id uuid references public.construction_tasks(id) on delete set null,
  template_id uuid references public.inspection_templates(id) on delete set null,
  title text not null,
  description text,
  inspection_type text,
  status text not null default 'scheduled',
  result text not null default 'pending',
  assigned_to uuid references auth.users(id) on delete set null,
  scheduled_date date,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspections_status_check check (status in ('scheduled','in_progress','passed','failed','needs_correction','ready_for_reinspection','closed')),
  constraint inspections_result_check check (result in ('pending','passed','failed','conditional_pass'))
);

create table if not exists public.inspection_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  label text not null,
  description text,
  status text not null default 'pending',
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspection_items_status_check check (status in ('pending','passed','failed','not_applicable'))
);

create table if not exists public.punch_list_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_area_id uuid references public.project_areas(id) on delete set null,
  stage_id uuid references public.construction_stages(id) on delete set null,
  task_id uuid references public.construction_tasks(id) on delete set null,
  inspection_id uuid references public.inspections(id) on delete set null,
  title text not null,
  description text,
  category text,
  priority text not null default 'medium',
  status text not null default 'open',
  assigned_to uuid references auth.users(id) on delete set null,
  assigned_company text,
  due_date date,
  resolved_at timestamptz,
  verified_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint punch_list_items_priority_check check (priority in ('low','medium','high','urgent')),
  constraint punch_list_items_status_check check (status in ('open','assigned','in_progress','ready_for_reinspection','passed','failed','closed'))
);

create table if not exists public.punch_list_updates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  punch_list_item_id uuid not null references public.punch_list_items(id) on delete cascade,
  update_type text not null default 'note',
  message text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.construction_tasks(id) on delete cascade,
  inspection_id uuid references public.inspections(id) on delete cascade,
  punch_list_item_id uuid references public.punch_list_items(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size integer,
  attachment_type text not null default 'photo',
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint task_attachments_type_check check (attachment_type in ('before_photo','progress_photo','completion_photo','inspection_photo','defect_photo','correction_photo','document','other')),
  constraint task_attachments_one_parent_check check (task_id is not null or inspection_id is not null or punch_list_item_id is not null)
);

create index if not exists inspections_project_idx on public.inspections(project_id, status, result);
create index if not exists inspections_assigned_idx on public.inspections(assigned_to, scheduled_date);
create index if not exists inspection_items_inspection_idx on public.inspection_items(inspection_id, sort_order);
create index if not exists punch_list_items_project_idx on public.punch_list_items(project_id, status, priority);
create index if not exists punch_list_items_assigned_idx on public.punch_list_items(assigned_to, due_date);
create index if not exists punch_list_updates_item_idx on public.punch_list_updates(punch_list_item_id, created_at desc);
create index if not exists task_attachments_project_idx on public.task_attachments(project_id, attachment_type, created_at desc);
create unique index if not exists task_attachments_file_path_idx on public.task_attachments(file_path);

insert into storage.buckets (id, name, public)
values ('buildflow-project-files', 'buildflow-project-files', false)
on conflict (id) do update set public = false;

drop trigger if exists inspection_templates_set_updated_at on public.inspection_templates;
create trigger inspection_templates_set_updated_at before update on public.inspection_templates for each row execute function public.set_updated_at();
drop trigger if exists inspection_template_items_set_updated_at on public.inspection_template_items;
create trigger inspection_template_items_set_updated_at before update on public.inspection_template_items for each row execute function public.set_updated_at();
drop trigger if exists inspections_set_updated_at on public.inspections;
create trigger inspections_set_updated_at before update on public.inspections for each row execute function public.set_updated_at();
drop trigger if exists inspection_items_set_updated_at on public.inspection_items;
create trigger inspection_items_set_updated_at before update on public.inspection_items for each row execute function public.set_updated_at();
drop trigger if exists punch_list_items_set_updated_at on public.punch_list_items;
create trigger punch_list_items_set_updated_at before update on public.punch_list_items for each row execute function public.set_updated_at();

create or replace function public.can_quality_manage_project(target_project_id uuid, user_uuid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_manage_project(target_project_id, user_uuid)
    or public.get_project_role(target_project_id, user_uuid) in ('qa_inspector','site_supervisor');
$$;

create or replace function public.can_view_punch_item(target_item_id uuid, user_uuid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.punch_list_items p
    where p.id = target_item_id and (
      public.can_manage_project(p.project_id, user_uuid)
      or p.assigned_to = user_uuid
      or public.get_project_role(p.project_id, user_uuid) in ('qa_inspector','site_supervisor')
      or (public.get_project_role(p.project_id, user_uuid) = 'client_owner_viewer' and p.status in ('passed','closed'))
    )
  );
$$;

create or replace function public.can_upload_quality_attachment(target_project_id uuid, target_task_id uuid, target_inspection_id uuid, target_punch_item_id uuid, attachment_kind text, user_uuid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.projects p where p.id = target_project_id) and (
    public.can_quality_manage_project(target_project_id, user_uuid)
    or exists (select 1 from public.construction_tasks t where t.id = target_task_id and t.assigned_to = user_uuid and attachment_kind in ('before_photo','progress_photo','completion_photo','correction_photo','other'))
    or exists (select 1 from public.inspections i where i.id = target_inspection_id and i.assigned_to = user_uuid and public.get_project_role(i.project_id, user_uuid) in ('qa_inspector','site_supervisor'))
    or exists (select 1 from public.punch_list_items p where p.id = target_punch_item_id and p.assigned_to = user_uuid and attachment_kind = 'correction_photo')
  );
$$;

create or replace function public.validate_inspection_child_scope()
returns trigger language plpgsql security definer set search_path = public as $$
declare expected_workspace uuid; expected_project uuid;
begin
  select workspace_id, project_id into expected_workspace, expected_project from public.inspections where id = new.inspection_id;
  if expected_workspace is null or expected_workspace <> new.workspace_id or expected_project <> new.project_id then
    raise exception 'inspection child records must match inspection workspace and project';
  end if;
  return new;
end;
$$;

create or replace function public.validate_punch_update_scope()
returns trigger language plpgsql security definer set search_path = public as $$
declare expected_workspace uuid; expected_project uuid;
begin
  select workspace_id, project_id into expected_workspace, expected_project from public.punch_list_items where id = new.punch_list_item_id;
  if expected_workspace is null or expected_workspace <> new.workspace_id or expected_project <> new.project_id then
    raise exception 'punch list updates must match punch list workspace and project';
  end if;
  return new;
end;
$$;

create or replace function public.validate_task_attachment_scope()
returns trigger language plpgsql security definer set search_path = public as $$
declare expected_workspace uuid; expected_project uuid;
begin
  if new.task_id is not null then
    select workspace_id, project_id into expected_workspace, expected_project from public.construction_tasks where id = new.task_id;
  elsif new.inspection_id is not null then
    select workspace_id, project_id into expected_workspace, expected_project from public.inspections where id = new.inspection_id;
  elsif new.punch_list_item_id is not null then
    select workspace_id, project_id into expected_workspace, expected_project from public.punch_list_items where id = new.punch_list_item_id;
  end if;
  if expected_workspace is null or expected_workspace <> new.workspace_id or expected_project <> new.project_id then
    raise exception 'attachment scope must match its parent record';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_punch_item_update_scope()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.can_manage_project(old.project_id, auth.uid()) or public.get_project_role(old.project_id, auth.uid()) in ('qa_inspector','site_supervisor') or public.is_platform_admin() then
    if new.status in ('passed','closed') and new.verified_at is null then new.verified_at = now(); end if;
    if new.status = 'closed' and new.resolved_at is null then new.resolved_at = now(); end if;
    return new;
  end if;
  if old.assigned_to = auth.uid() and public.get_project_role(old.project_id, auth.uid()) = 'contractor' then
    if new.workspace_id <> old.workspace_id or new.project_id <> old.project_id or new.project_area_id is distinct from old.project_area_id or new.stage_id is distinct from old.stage_id or new.task_id is distinct from old.task_id or new.inspection_id is distinct from old.inspection_id or new.title is distinct from old.title or new.description is distinct from old.description or new.category is distinct from old.category or new.priority is distinct from old.priority or new.assigned_to is distinct from old.assigned_to or new.assigned_company is distinct from old.assigned_company or new.due_date is distinct from old.due_date or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at or new.verified_at is distinct from old.verified_at or new.resolved_at is distinct from old.resolved_at then
      raise exception 'contractors may only update assigned punch list workflow status';
    end if;
    if new.status not in ('in_progress','ready_for_reinspection') then
      raise exception 'contractors cannot pass, fail, close, or reassign punch list items';
    end if;
    return new;
  end if;
  raise exception 'not authorized to update this punch list item';
end;
$$;

create or replace function public.block_task_completion_with_open_punch_items()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    if new.approval_status <> 'approved' then raise exception 'tasks must be approved before completion'; end if;
    if exists (select 1 from public.punch_list_items p where p.task_id = new.id and p.status not in ('passed','closed')) and not (public.can_manage_project(new.project_id, auth.uid()) or public.is_platform_admin()) then
      raise exception 'open punch list items block verified task completion';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists inspection_items_validate_scope on public.inspection_items;
create trigger inspection_items_validate_scope before insert or update on public.inspection_items for each row execute function public.validate_inspection_child_scope();
drop trigger if exists punch_list_updates_validate_scope on public.punch_list_updates;
create trigger punch_list_updates_validate_scope before insert or update on public.punch_list_updates for each row execute function public.validate_punch_update_scope();
drop trigger if exists task_attachments_validate_scope on public.task_attachments;
create trigger task_attachments_validate_scope before insert or update on public.task_attachments for each row execute function public.validate_task_attachment_scope();
drop trigger if exists punch_list_items_enforce_update on public.punch_list_items;
create trigger punch_list_items_enforce_update before update on public.punch_list_items for each row execute function public.enforce_punch_item_update_scope();
drop trigger if exists construction_tasks_block_open_punch on public.construction_tasks;
create trigger construction_tasks_block_open_punch before update on public.construction_tasks for each row execute function public.block_task_completion_with_open_punch_items();

alter table public.inspection_templates enable row level security;
alter table public.inspection_template_items enable row level security;
alter table public.inspections enable row level security;
alter table public.inspection_items enable row level security;
alter table public.punch_list_items enable row level security;
alter table public.punch_list_updates enable row level security;
alter table public.task_attachments enable row level security;

create policy "inspection_templates_select_members" on public.inspection_templates for select to authenticated using (public.is_workspace_member(workspace_id) or public.is_platform_admin());
create policy "inspection_templates_manage_managers" on public.inspection_templates for all to authenticated using (public.has_workspace_role(workspace_id, array['company_admin','director','head_project_manager','project_manager']::public.buildflow_member_role[]) or public.is_platform_admin()) with check (public.has_workspace_role(workspace_id, array['company_admin','director','head_project_manager','project_manager']::public.buildflow_member_role[]) or public.is_platform_admin());
create policy "inspection_template_items_select_members" on public.inspection_template_items for select to authenticated using (public.is_workspace_member(workspace_id) or public.is_platform_admin());
create policy "inspection_template_items_manage_managers" on public.inspection_template_items for all to authenticated using (public.has_workspace_role(workspace_id, array['company_admin','director','head_project_manager','project_manager']::public.buildflow_member_role[]) or public.is_platform_admin()) with check (public.has_workspace_role(workspace_id, array['company_admin','director','head_project_manager','project_manager']::public.buildflow_member_role[]) or public.is_platform_admin());

create policy "inspections_select_authorized" on public.inspections for select to authenticated using (public.can_manage_project(project_id) or assigned_to = auth.uid() or public.get_project_role(project_id) in ('qa_inspector','site_supervisor') or (public.get_project_role(project_id) = 'client_owner_viewer' and status in ('passed','closed')) or public.is_platform_admin());
create policy "inspections_insert_quality_roles" on public.inspections for insert to authenticated with check (created_by = auth.uid() and (public.can_quality_manage_project(project_id) or public.is_platform_admin()));
create policy "inspections_update_quality_roles" on public.inspections for update to authenticated using (public.can_quality_manage_project(project_id) or assigned_to = auth.uid() or public.is_platform_admin()) with check (public.can_quality_manage_project(project_id) or assigned_to = auth.uid() or public.is_platform_admin());

create policy "inspection_items_select_authorized" on public.inspection_items for select to authenticated using (exists (select 1 from public.inspections i where i.id = inspection_id and (public.can_manage_project(i.project_id) or i.assigned_to = auth.uid() or public.get_project_role(i.project_id) in ('qa_inspector','site_supervisor') or (public.get_project_role(i.project_id) = 'client_owner_viewer' and i.status in ('passed','closed')))) or public.is_platform_admin());
create policy "inspection_items_insert_quality_roles" on public.inspection_items for insert to authenticated with check (exists (select 1 from public.inspections i where i.id = inspection_id and (public.can_quality_manage_project(i.project_id) or i.assigned_to = auth.uid())));
create policy "inspection_items_update_quality_roles" on public.inspection_items for update to authenticated using (exists (select 1 from public.inspections i where i.id = inspection_id and (public.can_quality_manage_project(i.project_id) or i.assigned_to = auth.uid())) or public.is_platform_admin()) with check (exists (select 1 from public.inspections i where i.id = inspection_id and (public.can_quality_manage_project(i.project_id) or i.assigned_to = auth.uid())) or public.is_platform_admin());

create policy "punch_list_items_select_authorized" on public.punch_list_items for select to authenticated using (public.can_manage_project(project_id) or assigned_to = auth.uid() or public.get_project_role(project_id) in ('qa_inspector','site_supervisor') or (public.get_project_role(project_id) = 'client_owner_viewer' and status in ('passed','closed')) or public.is_platform_admin());
create policy "punch_list_items_insert_quality_roles" on public.punch_list_items for insert to authenticated with check (created_by = auth.uid() and (public.can_quality_manage_project(project_id) or public.is_platform_admin()));
create policy "punch_list_items_update_authorized" on public.punch_list_items for update to authenticated using (public.can_quality_manage_project(project_id) or assigned_to = auth.uid() or public.is_platform_admin()) with check (public.can_quality_manage_project(project_id) or (assigned_to = auth.uid() and status in ('in_progress','ready_for_reinspection')) or public.is_platform_admin());

create policy "punch_list_updates_select_authorized" on public.punch_list_updates for select to authenticated using (public.can_view_punch_item(punch_list_item_id) or public.is_platform_admin());
create policy "punch_list_updates_insert_authorized" on public.punch_list_updates for insert to authenticated with check (created_by = auth.uid() and (public.can_view_punch_item(punch_list_item_id) or public.is_platform_admin()));

create policy "task_attachments_select_authorized" on public.task_attachments for select to authenticated using (public.can_manage_project(project_id) or uploaded_by = auth.uid() or (task_id is not null and public.can_view_task(task_id)) or (inspection_id is not null and exists (select 1 from public.inspections i where i.id = inspection_id and (i.assigned_to = auth.uid() or public.get_project_role(i.project_id) in ('qa_inspector','site_supervisor') or (public.get_project_role(i.project_id) = 'client_owner_viewer' and i.status in ('passed','closed') and attachment_type in ('completion_photo','inspection_photo'))))) or (punch_list_item_id is not null and public.can_view_punch_item(punch_list_item_id)) or public.is_platform_admin());
create policy "task_attachments_insert_authorized" on public.task_attachments for insert to authenticated with check (uploaded_by = auth.uid() and public.can_upload_quality_attachment(project_id, task_id, inspection_id, punch_list_item_id, attachment_type));

create policy "storage_project_files_select_authorized" on storage.objects for select to authenticated using (bucket_id = 'buildflow-project-files' and exists (select 1 from public.task_attachments a where a.file_path = name and (public.can_manage_project(a.project_id) or a.uploaded_by = auth.uid() or (a.task_id is not null and public.can_view_task(a.task_id)) or (a.punch_list_item_id is not null and public.can_view_punch_item(a.punch_list_item_id)))));
create policy "storage_project_files_insert_authorized" on storage.objects for insert to authenticated with check (bucket_id = 'buildflow-project-files' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "storage_project_files_update_own_metadata" on storage.objects for update to authenticated using (bucket_id = 'buildflow-project-files' and owner = auth.uid()) with check (bucket_id = 'buildflow-project-files' and owner = auth.uid());

-- Extend Phase 2 task workflow so QA can inspect/approve/reject submitted work, while assignees still cannot approve themselves.
create or replace function public.can_review_task(target_task_id uuid, user_uuid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.construction_tasks t
    where t.id = target_task_id
      and (public.can_manage_project(t.project_id, user_uuid) or public.get_project_role(t.project_id, user_uuid) = 'qa_inspector')
  );
$$;

create or replace function public.enforce_assigned_task_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.can_manage_project(old.project_id, auth.uid()) or public.get_project_role(old.project_id, auth.uid()) = 'qa_inspector' or public.is_platform_admin() then
    if old.assigned_to = auth.uid() and new.status in ('approved','completed') then
      raise exception 'assigned users cannot approve or complete their own work through reviewer permissions';
    end if;
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

drop policy if exists "construction_tasks_update_managers_or_assignees" on public.construction_tasks;
create policy "construction_tasks_update_reviewers_or_assignees" on public.construction_tasks
  for update to authenticated
  using (public.can_review_task(id) or public.can_update_assigned_task(id) or public.is_platform_admin())
  with check (
    public.is_platform_admin()
    or public.can_review_task(id)
    or (
      assigned_to = auth.uid()
      and public.can_update_assigned_task(id)
      and status in ('not_started','in_progress','ready_for_review','rework_submitted','completed')
      and approval_status in ('not_submitted','ready_for_review','approved')
      and (status <> 'completed' or approval_status = 'approved')
    )
  );

drop policy if exists "punch_list_updates_insert_authorized" on public.punch_list_updates;
create policy "punch_list_updates_insert_authorized" on public.punch_list_updates
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.punch_list_items p
      where p.id = punch_list_item_id
        and (
          public.can_quality_manage_project(p.project_id)
          or p.assigned_to = auth.uid()
          or public.is_platform_admin()
        )
    )
  );

drop policy if exists "task_attachments_select_authorized" on public.task_attachments;
create policy "task_attachments_select_authorized" on public.task_attachments
  for select to authenticated
  using (
    public.can_manage_project(project_id)
    or uploaded_by = auth.uid()
    or (
      task_id is not null
      and public.can_view_task(task_id)
      and (public.get_project_role(project_id) is distinct from 'client_owner_viewer' or attachment_type = 'completion_photo')
    )
    or (
      inspection_id is not null
      and exists (
        select 1 from public.inspections i
        where i.id = inspection_id
          and (
            i.assigned_to = auth.uid()
            or public.get_project_role(i.project_id) in ('qa_inspector','site_supervisor')
            or (public.get_project_role(i.project_id) = 'client_owner_viewer' and i.status in ('passed','closed') and attachment_type in ('completion_photo','inspection_photo'))
          )
      )
    )
    or (
      punch_list_item_id is not null
      and exists (
        select 1 from public.punch_list_items p
        where p.id = punch_list_item_id
          and (
            p.assigned_to = auth.uid()
            or public.get_project_role(p.project_id) in ('qa_inspector','site_supervisor')
            or (public.get_project_role(p.project_id) = 'client_owner_viewer' and p.status = 'closed' and attachment_type = 'completion_photo')
          )
      )
    )
    or public.is_platform_admin()
  );

drop policy if exists "storage_project_files_select_authorized" on storage.objects;
create policy "storage_project_files_select_authorized" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'buildflow-project-files'
    and exists (
      select 1 from public.task_attachments a
      where a.file_path = name
        and (
          public.can_manage_project(a.project_id)
          or a.uploaded_by = auth.uid()
          or (a.task_id is not null and public.can_view_task(a.task_id) and (public.get_project_role(a.project_id) is distinct from 'client_owner_viewer' or a.attachment_type = 'completion_photo'))
          or (a.punch_list_item_id is not null and public.can_view_punch_item(a.punch_list_item_id) and (public.get_project_role(a.project_id) is distinct from 'client_owner_viewer' or a.attachment_type = 'completion_photo'))
          or (a.inspection_id is not null and exists (select 1 from public.inspections i where i.id = a.inspection_id and (i.assigned_to = auth.uid() or public.get_project_role(i.project_id) in ('qa_inspector','site_supervisor') or (public.get_project_role(i.project_id) = 'client_owner_viewer' and i.status in ('passed','closed') and a.attachment_type in ('completion_photo','inspection_photo')))))
        )
    )
  );
