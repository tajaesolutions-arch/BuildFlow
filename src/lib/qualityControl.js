import { getSupabaseOrThrow } from './supabaseClient'
import { MANAGEMENT_ROLES, ROLES } from './roles'
import { logActivity } from './projectOperations'

export const INSPECTION_STATUSES = ['scheduled', 'in_progress', 'passed', 'failed', 'needs_correction', 'ready_for_reinspection', 'closed']
export const INSPECTION_RESULTS = ['pending', 'passed', 'failed', 'conditional_pass']
export const INSPECTION_ITEM_STATUSES = ['pending', 'passed', 'failed', 'not_applicable']
export const PUNCH_PRIORITIES = ['low', 'medium', 'high', 'urgent']
export const PUNCH_STATUSES = ['open', 'assigned', 'in_progress', 'ready_for_reinspection', 'passed', 'failed', 'closed']
export const ATTACHMENT_TYPES = ['before_photo', 'progress_photo', 'completion_photo', 'inspection_photo', 'defect_photo', 'correction_photo', 'document', 'other']
export const PROJECT_FILE_BUCKET = 'buildflow-project-files'

export function canManageQuality(role) {
  return MANAGEMENT_ROLES.includes(role) || [ROLES.QA_INSPECTOR, ROLES.SITE_SUPERVISOR].includes(role)
}

export function canReviewQuality(role) {
  return MANAGEMENT_ROLES.includes(role) || role === ROLES.QA_INSPECTOR
}

export function canUpdateAssignedPunch(role, item, userId) {
  return role === ROLES.CONTRACTOR && item?.assigned_to === userId
}

export function isClientViewer(role) {
  return role === ROLES.CLIENT_OWNER_VIEWER
}

export function openPunchBlocksCompletion(items = []) {
  return items.some((item) => !['passed', 'closed'].includes(item.status))
}

export async function fetchWorkspaceQualityMetrics(workspaceId) {
  const client = getSupabaseOrThrow()
  const [inspections, punchItems, tasks, attachments] = await Promise.all([
    client.from('inspections').select('*, project:projects(name)').eq('workspace_id', workspaceId).order('scheduled_date', { ascending: true, nullsFirst: false }),
    client.from('punch_list_items').select('*, project:projects(name)').eq('workspace_id', workspaceId).order('due_date', { ascending: true, nullsFirst: false }),
    client.from('construction_tasks').select('*, project:projects(name)').eq('workspace_id', workspaceId).in('status', ['ready_for_review', 'under_inspection', 'needs_correction', 'approved', 'completed']),
    client.from('task_attachments').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(12),
  ])
  if (inspections.error) throw inspections.error
  if (punchItems.error) throw punchItems.error
  if (tasks.error) throw tasks.error
  return { inspections: inspections.data ?? [], punchItems: punchItems.data ?? [], tasks: tasks.data ?? [], attachments: attachments.error ? [] : attachments.data ?? [] }
}

export async function fetchQADashboard(userId) {
  const client = getSupabaseOrThrow()
  const [inspections, tasks, punchItems] = await Promise.all([
    client.from('inspections').select('*, project:projects(name), task:construction_tasks(title)').or(`assigned_to.eq.${userId},status.in.(scheduled,in_progress,failed,ready_for_reinspection,needs_correction)`).order('scheduled_date', { ascending: true, nullsFirst: false }),
    client.from('construction_tasks').select('*, project:projects(name)').in('status', ['ready_for_review', 'under_inspection']).order('due_date', { ascending: true, nullsFirst: false }),
    client.from('punch_list_items').select('*, project:projects(name)').in('status', ['ready_for_reinspection', 'failed']).order('due_date', { ascending: true, nullsFirst: false }),
  ])
  if (inspections.error) throw inspections.error
  return { inspections: inspections.data ?? [], tasks: tasks.error ? [] : tasks.data ?? [], punchItems: punchItems.error ? [] : punchItems.data ?? [] }
}

export async function fetchProjectQuality(projectId) {
  const client = getSupabaseOrThrow()
  const [project, areas, stages, tasks, inspections, punchItems, attachments, activity] = await Promise.all([
    client.from('projects').select('*').eq('id', projectId).single(),
    client.from('project_areas').select('*').eq('project_id', projectId).order('sort_order'),
    client.from('construction_stages').select('*').eq('project_id', projectId).order('sort_order'),
    client.from('construction_tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    client.from('inspections').select('*, project_area:project_areas(name), stage:construction_stages(name), task:construction_tasks(title)').eq('project_id', projectId).order('created_at', { ascending: false }),
    client.from('punch_list_items').select('*, project_area:project_areas(name), stage:construction_stages(name), task:construction_tasks(title), inspection:inspections(title)').eq('project_id', projectId).order('created_at', { ascending: false }),
    client.from('task_attachments').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    client.from('activity_logs').select('*').eq('project_id', projectId).in('entity_type', ['inspection', 'inspection_item', 'punch_list_item', 'task_attachment', 'construction_task']).order('created_at', { ascending: false }).limit(30),
  ])
  if (project.error) throw project.error
  return { project: project.data, areas: areas.data ?? [], stages: stages.data ?? [], tasks: tasks.data ?? [], inspections: inspections.error ? [] : inspections.data ?? [], punchItems: punchItems.error ? [] : punchItems.data ?? [], attachments: attachments.error ? [] : attachments.data ?? [], activity: activity.error ? [] : activity.data ?? [] }
}

export async function fetchInspectionDetail(inspectionId) {
  const client = getSupabaseOrThrow()
  const [inspection, items, punchItems, attachments, activity] = await Promise.all([
    client.from('inspections').select('*, project:projects(name), project_area:project_areas(name), stage:construction_stages(name), task:construction_tasks(title)').eq('id', inspectionId).single(),
    client.from('inspection_items').select('*').eq('inspection_id', inspectionId).order('sort_order').order('created_at'),
    client.from('punch_list_items').select('*').eq('inspection_id', inspectionId).order('created_at', { ascending: false }),
    client.from('task_attachments').select('*').eq('inspection_id', inspectionId).order('created_at', { ascending: false }),
    client.from('activity_logs').select('*').eq('entity_id', inspectionId).order('created_at', { ascending: false }).limit(12),
  ])
  if (inspection.error) throw inspection.error
  return { inspection: inspection.data, items: items.data ?? [], punchItems: punchItems.error ? [] : punchItems.data ?? [], attachments: attachments.error ? [] : attachments.data ?? [], activity: activity.error ? [] : activity.data ?? [] }
}

export async function fetchPunchDetail(itemId) {
  const client = getSupabaseOrThrow()
  const [item, updates, attachments, activity] = await Promise.all([
    client.from('punch_list_items').select('*, project:projects(name), project_area:project_areas(name), stage:construction_stages(name), task:construction_tasks(title), inspection:inspections(title)').eq('id', itemId).single(),
    client.from('punch_list_updates').select('*').eq('punch_list_item_id', itemId).order('created_at', { ascending: false }),
    client.from('task_attachments').select('*').eq('punch_list_item_id', itemId).order('created_at', { ascending: false }),
    client.from('activity_logs').select('*').eq('entity_id', itemId).order('created_at', { ascending: false }).limit(12),
  ])
  if (item.error) throw item.error
  return { item: item.data, updates: updates.data ?? [], attachments: attachments.error ? [] : attachments.data ?? [], activity: activity.error ? [] : activity.data ?? [] }
}

export async function createInspection({ workspaceId, projectId, userId, inspection, checklistItems = [] }) {
  const client = getSupabaseOrThrow()
  const { data, error } = await client.from('inspections').insert({
    workspace_id: workspaceId,
    project_id: projectId,
    project_area_id: inspection.projectAreaId || null,
    stage_id: inspection.stageId || null,
    task_id: inspection.taskId || null,
    title: inspection.title,
    description: inspection.description || null,
    inspection_type: inspection.inspectionType || null,
    assigned_to: inspection.assignedTo || null,
    scheduled_date: inspection.scheduledDate || null,
    created_by: userId,
  }).select('*').single()
  if (error) throw error
  const items = checklistItems.map((label) => label.trim()).filter(Boolean).map((label, index) => ({ workspace_id: workspaceId, project_id: projectId, inspection_id: data.id, label, sort_order: index }))
  if (items.length) {
    const { error: itemError } = await client.from('inspection_items').insert(items)
    if (itemError) throw itemError
  }
  await logActivity({ workspaceId, projectId, userId, action: 'inspection_created', entityType: 'inspection', entityId: data.id, metadata: { title: data.title } })
  return data
}

export async function updateInspection({ workspaceId, projectId, userId, inspectionId, patch }) {
  const normalized = { ...patch }
  if (['passed', 'failed', 'closed'].includes(normalized.status) || ['passed', 'failed', 'conditional_pass'].includes(normalized.result)) normalized.completed_at = new Date().toISOString()
  const { data, error } = await getSupabaseOrThrow().from('inspections').update(normalized).eq('id', inspectionId).select('*').single()
  if (error) throw error
  const action = normalized.status === 'in_progress' ? 'inspection_started' : normalized.result === 'passed' ? 'inspection_passed' : normalized.result === 'failed' ? 'inspection_failed' : 'inspection_updated'
  await logActivity({ workspaceId, projectId, userId, action, entityType: 'inspection', entityId: inspectionId, metadata: normalized })
  return data
}

export async function updateInspectionItem({ workspaceId, projectId, userId, itemId, patch }) {
  const { data, error } = await getSupabaseOrThrow().from('inspection_items').update(patch).eq('id', itemId).select('*').single()
  if (error) throw error
  await logActivity({ workspaceId, projectId, userId, action: 'inspection_checklist_updated', entityType: 'inspection_item', entityId: itemId, metadata: patch })
  return data
}

export async function createPunchItem({ workspaceId, projectId, userId, item }) {
  const { data, error } = await getSupabaseOrThrow().from('punch_list_items').insert({
    workspace_id: workspaceId,
    project_id: projectId,
    project_area_id: item.projectAreaId || null,
    stage_id: item.stageId || null,
    task_id: item.taskId || null,
    inspection_id: item.inspectionId || null,
    title: item.title,
    description: item.description || null,
    category: item.category || null,
    priority: item.priority || 'medium',
    status: item.assignedTo ? 'assigned' : 'open',
    assigned_to: item.assignedTo || null,
    assigned_company: item.assignedCompany || null,
    due_date: item.dueDate || null,
    created_by: userId,
  }).select('*').single()
  if (error) throw error
  await logActivity({ workspaceId, projectId, userId, action: 'punch_list_item_created', entityType: 'punch_list_item', entityId: data.id, metadata: { title: data.title } })
  if (item.assignedTo) await logActivity({ workspaceId, projectId, userId, action: 'punch_list_item_assigned', entityType: 'punch_list_item', entityId: data.id, metadata: { assigned_to: item.assignedTo } })
  return data
}

export async function updatePunchItem({ workspaceId, projectId, userId, itemId, patch }) {
  const normalized = { ...patch }
  if (normalized.status === 'passed') normalized.verified_at = new Date().toISOString()
  if (normalized.status === 'closed') normalized.resolved_at = new Date().toISOString()
  const { data, error } = await getSupabaseOrThrow().from('punch_list_items').update(normalized).eq('id', itemId).select('*').single()
  if (error) throw error
  const action = normalized.status === 'passed' ? 'punch_list_item_passed' : normalized.status === 'failed' ? 'punch_list_item_failed' : normalized.status === 'closed' ? 'punch_list_item_closed' : normalized.status ? 'punch_list_item_status_changed' : 'punch_list_item_updated'
  await logActivity({ workspaceId, projectId, userId, action, entityType: 'punch_list_item', entityId: itemId, metadata: normalized })
  return data
}

export async function addPunchUpdate({ workspaceId, projectId, userId, itemId, message, updateType = 'note' }) {
  const { data, error } = await getSupabaseOrThrow().from('punch_list_updates').insert({ workspace_id: workspaceId, project_id: projectId, punch_list_item_id: itemId, created_by: userId, message, update_type: updateType }).select('*').single()
  if (error) throw error
  await logActivity({ workspaceId, projectId, userId, action: 'punch_list_update_added', entityType: 'punch_list_item', entityId: itemId, metadata: { update_type: updateType } })
  return data
}

export async function addAttachmentMetadata({ workspaceId, projectId, userId, attachment }) {
  const { data, error } = await getSupabaseOrThrow().from('task_attachments').insert({
    workspace_id: workspaceId,
    project_id: projectId,
    task_id: attachment.taskId || null,
    inspection_id: attachment.inspectionId || null,
    punch_list_item_id: attachment.punchListItemId || null,
    file_name: attachment.fileName,
    file_path: attachment.filePath,
    file_type: attachment.fileType || null,
    file_size: attachment.fileSize ? Number(attachment.fileSize) : null,
    attachment_type: attachment.attachmentType || 'other',
    uploaded_by: userId,
  }).select('*').single()
  if (error) throw error
  const action = attachment.attachmentType === 'correction_photo' ? 'correction_photo_uploaded' : 'proof_photo_uploaded'
  await logActivity({ workspaceId, projectId, userId, action, entityType: 'task_attachment', entityId: data.id, metadata: { attachment_type: data.attachment_type } })
  return data
}
