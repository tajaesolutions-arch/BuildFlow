import { getSupabaseOrThrow } from './supabaseClient'
import { getHighestRole } from './roles'

export async function fetchWorkspaceContext(userId) {
  const client = getSupabaseOrThrow()
  const { data: profile, error: profileError } = await client.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (profileError) throw profileError

  const { data: memberships, error: memberError } = await client
    .from('workspace_members')
    .select('*, workspace:workspaces(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (memberError) throw memberError

  const activeMemberships = memberships?.filter((membership) => membership.status === 'active') ?? []
  const suspendedMembership = memberships?.find((membership) => membership.status === 'suspended')
  const membership = activeMemberships[0] ?? suspendedMembership ?? null
  const role = profile?.platform_role === 'platform_admin' ? 'platform_admin' : getHighestRole(memberships ?? [])

  return {
    profile,
    memberships: memberships ?? [],
    membership,
    workspace: membership?.workspace ?? null,
    role,
    isSuspended: profile?.status === 'suspended' || membership?.status === 'suspended' || membership?.workspace?.status === 'suspended',
  }
}

export async function createWorkspace({ name, businessType, country, currency, timezone, measurementSystem }, userId) {
  const client = getSupabaseOrThrow()
  const { data: workspace, error } = await client
    .from('workspaces')
    .insert({
      name,
      business_type: businessType,
      country,
      default_currency: currency,
      default_timezone: timezone,
      measurement_system: measurementSystem,
      status: 'active',
      created_by: userId,
    })
    .select('*')
    .single()
  if (error) throw error
  return workspace
}
