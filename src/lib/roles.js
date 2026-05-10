export const ROLES = {
  PLATFORM_ADMIN: 'platform_admin',
  COMPANY_ADMIN: 'company_admin',
  DIRECTOR: 'director',
  HEAD_PROJECT_MANAGER: 'head_project_manager',
  PROJECT_MANAGER: 'project_manager',
  QA_INSPECTOR: 'qa_inspector',
  CONTRACTOR: 'contractor',
  SITE_SUPERVISOR: 'site_supervisor',
  CLIENT_OWNER_VIEWER: 'client_owner_viewer',
  ACCOUNTANT_COST_CONTROLLER: 'accountant_cost_controller',
  SAFETY_OFFICER: 'safety_officer',
}

export const ROLE_LABELS = {
  [ROLES.PLATFORM_ADMIN]: 'Platform Admin',
  [ROLES.COMPANY_ADMIN]: 'Company Admin',
  [ROLES.DIRECTOR]: 'Director',
  [ROLES.HEAD_PROJECT_MANAGER]: 'Head Project Manager',
  [ROLES.PROJECT_MANAGER]: 'Project Manager',
  [ROLES.QA_INSPECTOR]: 'QA Inspector',
  [ROLES.CONTRACTOR]: 'Contractor',
  [ROLES.SITE_SUPERVISOR]: 'Site Supervisor',
  [ROLES.CLIENT_OWNER_VIEWER]: 'Client / Owner Viewer',
  [ROLES.ACCOUNTANT_COST_CONTROLLER]: 'Accountant / Cost Controller',
  [ROLES.SAFETY_OFFICER]: 'Safety Officer',
}

export const ROLE_PRIORITY = [
  ROLES.PLATFORM_ADMIN,
  ROLES.COMPANY_ADMIN,
  ROLES.DIRECTOR,
  ROLES.HEAD_PROJECT_MANAGER,
  ROLES.PROJECT_MANAGER,
  ROLES.QA_INSPECTOR,
  ROLES.SITE_SUPERVISOR,
  ROLES.ACCOUNTANT_COST_CONTROLLER,
  ROLES.SAFETY_OFFICER,
  ROLES.CONTRACTOR,
  ROLES.CLIENT_OWNER_VIEWER,
]

export const PROJECT_CREATE_ROLES = [
  ROLES.COMPANY_ADMIN,
  ROLES.DIRECTOR,
  ROLES.HEAD_PROJECT_MANAGER,
  ROLES.PROJECT_MANAGER,
]

export const ROLE_HOME_ROUTES = {
  [ROLES.PLATFORM_ADMIN]: '/admin',
  [ROLES.COMPANY_ADMIN]: '/dashboard',
  [ROLES.DIRECTOR]: '/dashboard',
  [ROLES.HEAD_PROJECT_MANAGER]: '/dashboard',
  [ROLES.PROJECT_MANAGER]: '/dashboard',
  [ROLES.QA_INSPECTOR]: '/qa-dashboard',
  [ROLES.CONTRACTOR]: '/contractor-dashboard',
  [ROLES.SITE_SUPERVISOR]: '/site-dashboard',
  [ROLES.CLIENT_OWNER_VIEWER]: '/client-dashboard',
  [ROLES.ACCOUNTANT_COST_CONTROLLER]: '/cost-dashboard',
  [ROLES.SAFETY_OFFICER]: '/safety-dashboard',
}

export function getHighestRole(memberships = []) {
  const activeRoles = memberships.filter((membership) => membership.status === 'active').map((membership) => membership.role)
  return ROLE_PRIORITY.find((role) => activeRoles.includes(role)) || null
}

export function getHomeRouteForRole(role) {
  return ROLE_HOME_ROUTES[role] || '/workspace/setup'
}

export function canCreateProject(role) {
  return PROJECT_CREATE_ROLES.includes(role)
}
