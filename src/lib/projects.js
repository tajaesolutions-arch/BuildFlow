import { getSupabaseOrThrow } from './supabaseClient'

export async function fetchProjects(workspaceId) {
  const { data, error } = await getSupabaseOrThrow()
    .from('projects')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createProject(workspaceId, userId, project) {
  const { data, error } = await getSupabaseOrThrow()
    .from('projects')
    .insert({
      workspace_id: workspaceId,
      created_by: userId,
      name: project.name,
      project_type: project.projectType,
      country: project.country,
      location: project.location,
      start_date: project.startDate || null,
      expected_completion_date: project.expectedCompletionDate || null,
      budget_amount: project.budgetAmount ? Number(project.budgetAmount) : null,
      currency: project.currency,
      timezone: project.timezone,
      measurement_system: project.measurementSystem,
      client_name: project.clientName,
      status: project.status,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}
