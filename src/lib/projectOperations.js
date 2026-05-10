import { getSupabaseOrThrow } from './supabaseClient'
import { MANAGEMENT_ROLES, ROLES } from './roles'

export const AREA_TYPES = ['phase', 'zone', 'block', 'building', 'floor', 'unit', 'lot', 'house', 'work_area', 'custom']
export const STAGE_STATUSES = ['not_started', 'in_progress', 'ready_for_review', 'under_inspection', 'approved', 'delayed', 'completed']
export const TASK_STATUSES = ['not_started', 'in_progress', 'ready_for_review', 'under_inspection', 'approved', 'rejected', 'needs_correction', 'rework_submitted', 'completed']
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent']

export const DEFAULT_STAGE_SUGGESTIONS = [
  'Planning & Pre-Construction',
  'Site Preparation',
  'Foundation',
  'Structure',
  'Roofing',
  'MEP Works',
  'Windows & Doors',
  'Interior Finishes',
  'Painting',
  'External Works',
  'QA / Snagging / Punch List',
  'Final Handover',
]

export function isManagementRole(role) {
  return MANAGEMENT_ROLES.includes(role)
}

export function canManageProjectOperations(role) {
  return isManagementRole(role)
}

export function canEditAssignedTask(role, task, userId) {
  return [ROLES.CONTRACTOR, ROLES.SITE_SUPERVISOR].includes(role) && task?.assigned_to === userId
}

export function getAllowedTaskStatuses(role, task, userId) {
  if (canManageProjectOperations(role)) return TASK_STATUSES
  if (!canEditAssignedTask(role, task, userId)) return []
  const base = ['in_progress', 'ready_for_review', 'rework_submitted']
  if (task?.approval_status === 'approved') base.push('completed')
  return base
}

export async function logActivity({ workspaceId, projectId, userId, action, entityType, entityId, metadata = {} }) {
  const { error } = await getSupabaseOrThrow().from('activity_logs').insert({
    workspace_id: workspaceId,
    project_id: projectId,
    actor_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
    created_by: userId,
  })
  if (error) console.warn('Activity log failed:', error.message)
}

export async function fetchProjectBundle(projectId) {
  const client = getSupabaseOrThrow()
  const [projectResult, areasResult, stagesResult, tasksResult, activityResult] = await Promise.all([
    client.from('projects').select('*').eq('id', projectId).single(),
    client.from('project_areas').select('*').eq('project_id', projectId).order('sort_order').order('created_at'),
    client.from('construction_stages').select('*, project_area:project_areas(name, area_type)').eq('project_id', projectId).order('sort_order').order('created_at'),
    client.from('construction_tasks').select('*, project_area:project_areas(name), stage:construction_stages(name)').eq('project_id', projectId).order('created_at', { ascending: false }),
    client.from('activity_logs').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(8),
  ])
  if (projectResult.error) throw projectResult.error
  if (areasResult.error) throw areasResult.error
  if (stagesResult.error) throw stagesResult.error
  if (tasksResult.error) throw tasksResult.error
  return {
    project: projectResult.data,
    areas: areasResult.data ?? [],
    stages: stagesResult.data ?? [],
    tasks: tasksResult.data ?? [],
    activity: activityResult.error ? [] : activityResult.data ?? [],
  }
}

export async function fetchProjectAreas(projectId) {
  const { data, error } = await getSupabaseOrThrow().from('project_areas').select('*').eq('project_id', projectId).order('sort_order').order('created_at')
  if (error) throw error
  return data ?? []
}

export async function createProjectArea({ workspaceId, projectId, userId, area }) {
  const { data, error } = await getSupabaseOrThrow().from('project_areas').insert({
    workspace_id: workspaceId,
    project_id: projectId,
    parent_area_id: area.parentAreaId || null,
    area_type: area.areaType,
    name: area.name,
    description: area.description || null,
    sort_order: Number(area.sortOrder || 0),
    created_by: userId,
  }).select('*').single()
  if (error) throw error
  await logActivity({ workspaceId, projectId, userId, action: 'project_area_created', entityType: 'project_area', entityId: data.id, metadata: { name: data.name, area_type: data.area_type } })
  return data
}

export async function fetchProjectStages(projectId) {
  const { data, error } = await getSupabaseOrThrow().from('construction_stages').select('*, project_area:project_areas(name)').eq('project_id', projectId).order('sort_order').order('created_at')
  if (error) throw error
  return data ?? []
}

export async function createStage({ workspaceId, projectId, userId, stage }) {
  const { data, error } = await getSupabaseOrThrow().from('construction_stages').insert({
    workspace_id: workspaceId,
    project_id: projectId,
    project_area_id: stage.projectAreaId || null,
    name: stage.name,
    description: stage.description || null,
    status: stage.status || 'not_started',
    progress_percent: Number(stage.progressPercent || 0),
    start_date: stage.startDate || null,
    due_date: stage.dueDate || null,
    sort_order: Number(stage.sortOrder || 0),
    created_by: userId,
  }).select('*').single()
  if (error) throw error
  await logActivity({ workspaceId, projectId, userId, action: 'stage_created', entityType: 'construction_stage', entityId: data.id, metadata: { name: data.name } })
  return data
}

export async function updateStage({ workspaceId, projectId, userId, stageId, patch }) {
  const { data, error } = await getSupabaseOrThrow().from('construction_stages').update(patch).eq('id', stageId).select('*').single()
  if (error) throw error
  await logActivity({ workspaceId, projectId, userId, action: 'stage_updated', entityType: 'construction_stage', entityId: stageId, metadata: patch })
  return data
}

export async function fetchTasks(projectId) {
  const { data, error } = await getSupabaseOrThrow().from('construction_tasks').select('*, project:projects(name), project_area:project_areas(name), stage:construction_stages(name)').eq('project_id', projectId).order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchTaskDetail(taskId) {
  const client = getSupabaseOrThrow()
  const [taskResult, checklistResult, updatesResult] = await Promise.all([
    client.from('construction_tasks').select('*, project:projects(name), project_area:project_areas(name), stage:construction_stages(name)').eq('id', taskId).single(),
    client.from('task_checklist_items').select('*').eq('task_id', taskId).order('sort_order').order('created_at'),
    client.from('task_updates').select('*').eq('task_id', taskId).order('created_at', { ascending: false }),
  ])
  if (taskResult.error) throw taskResult.error
  if (checklistResult.error) throw checklistResult.error
  if (updatesResult.error) throw updatesResult.error
  return { task: taskResult.data, checklist: checklistResult.data ?? [], updates: updatesResult.data ?? [] }
}

export async function createTask({ workspaceId, projectId, userId, task, checklistItems = [] }) {
  const client = getSupabaseOrThrow()
  const { data, error } = await client.from('construction_tasks').insert({
    workspace_id: workspaceId,
    project_id: projectId,
    project_area_id: task.projectAreaId || null,
    stage_id: task.stageId || null,
    title: task.title,
    description: task.description || null,
    trade: task.trade || null,
    priority: task.priority || 'medium',
    assigned_to: task.assignedTo || null,
    assigned_company: task.assignedCompany || null,
    start_date: task.startDate || null,
    due_date: task.dueDate || null,
    created_by: userId,
  }).select('*').single()
  if (error) throw error

  const cleaned = checklistItems.map((label, index) => label.trim()).filter(Boolean).map((label, index) => ({
    workspace_id: workspaceId,
    project_id: projectId,
    task_id: data.id,
    label,
    sort_order: index,
    created_by: userId,
  }))
  if (cleaned.length) {
    const { error: checklistError } = await client.from('task_checklist_items').insert(cleaned)
    if (checklistError) throw checklistError
  }
  await logActivity({ workspaceId, projectId, userId, action: 'task_created', entityType: 'construction_task', entityId: data.id, metadata: { title: data.title } })
  if (task.assignedTo) {
    await logActivity({ workspaceId, projectId, userId, action: 'task_assigned', entityType: 'construction_task', entityId: data.id, metadata: { assigned_to: task.assignedTo } })
  }
  return data
}

export async function updateTask({ workspaceId, projectId, userId, taskId, patch }) {
  const normalized = { ...patch }
  if (normalized.status === 'ready_for_review') normalized.approval_status = 'ready_for_review'
  if (normalized.status === 'under_inspection') normalized.approval_status = 'under_review'
  if (normalized.status === 'approved') normalized.approval_status = 'approved'
  if (normalized.status === 'rejected') normalized.approval_status = 'rejected'
  if (normalized.status === 'needs_correction') normalized.approval_status = 'needs_correction'
  if (normalized.status === 'completed') normalized.completed_at = new Date().toISOString()
  const { data, error } = await getSupabaseOrThrow().from('construction_tasks').update(normalized).eq('id', taskId).select('*').single()
  if (error) throw error
  const action = normalized.status === 'ready_for_review' ? 'task_submitted_for_review' : normalized.status === 'approved' ? 'task_approved' : normalized.status === 'rejected' || normalized.status === 'needs_correction' ? 'task_rejected' : normalized.status ? 'task_status_changed' : 'task_updated'
  await logActivity({ workspaceId, projectId, userId, action, entityType: 'construction_task', entityId: taskId, metadata: normalized })
  return data
}

export async function addTaskUpdate({ workspaceId, projectId, taskId, userId, message, updateType = 'note' }) {
  const { data, error } = await getSupabaseOrThrow().from('task_updates').insert({ workspace_id: workspaceId, project_id: projectId, task_id: taskId, created_by: userId, message, update_type: updateType }).select('*').single()
  if (error) throw error
  await logActivity({ workspaceId, projectId, userId, action: 'task_update_added', entityType: 'task_update', entityId: data.id, metadata: { task_id: taskId, update_type: updateType } })
  return data
}

export async function updateChecklistItem({ workspaceId, projectId, taskId, itemId, userId, isCompleted }) {
  const { data, error } = await getSupabaseOrThrow().from('task_checklist_items').update({ is_completed: isCompleted }).eq('id', itemId).select('*').single()
  if (error) throw error
  await logActivity({ workspaceId, projectId, userId, action: 'task_checklist_updated', entityType: 'task_checklist_item', entityId: itemId, metadata: { task_id: taskId, is_completed: isCompleted } })
  return data
}

export async function fetchWorkspaceTasks(workspaceId) {
  const { data, error } = await getSupabaseOrThrow().from('construction_tasks').select('*, project:projects(name), stage:construction_stages(name), project_area:project_areas(name)').eq('workspace_id', workspaceId).order('due_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

export async function fetchWorkspaceStages(workspaceId) {
  const { data, error } = await getSupabaseOrThrow().from('construction_stages').select('*, project:projects(name)').eq('workspace_id', workspaceId).order('due_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

export async function fetchContractorDashboard(userId) {
  const client = getSupabaseOrThrow()
  const [tasksResult, updatesResult] = await Promise.all([
    client.from('construction_tasks').select('*, project:projects(name), stage:construction_stages(name)').eq('assigned_to', userId).order('due_date', { ascending: true, nullsFirst: false }),
    client.from('task_updates').select('*, task:construction_tasks!inner(title, assigned_to, project:projects(name))').eq('task.assigned_to', userId).order('created_at', { ascending: false }).limit(8),
  ])
  if (tasksResult.error) throw tasksResult.error
  return { tasks: tasksResult.data ?? [], updates: updatesResult.error ? [] : updatesResult.data ?? [] }
}
