import { Link, NavLink, useNavigate } from 'react-router-dom'
import { signOut } from '../lib/auth'
import { canCreateProject, ROLE_LABELS } from '../lib/roles'
import { useAuth } from '../contexts/AuthContext'

const baseNav = [
  { label: 'Overview', to: '/dashboard', roles: ['company_admin', 'director', 'head_project_manager', 'project_manager'] },
  { label: 'QA', to: '/qa-dashboard', roles: ['qa_inspector'] },
  { label: 'Contractor', to: '/contractor-dashboard', roles: ['contractor'] },
  { label: 'Site', to: '/site-dashboard', roles: ['site_supervisor'] },
  { label: 'Costs', to: '/cost-dashboard', roles: ['accountant_cost_controller'] },
  { label: 'Safety', to: '/safety-dashboard', roles: ['safety_officer'] },
  { label: 'Client View', to: '/client-dashboard', roles: ['client_owner_viewer'] },
  { label: 'Platform Admin', to: '/admin', roles: ['platform_admin'] },
]

const placeholders = ['Tasks', 'Inspections', 'Punch Lists', 'Documents', 'Daily Reports', 'Approvals']

export function AppLayout({ children, title, eyebrow }) {
  const navigate = useNavigate()
  const { workspaceContext } = useAuth()
  const role = workspaceContext?.role
  const workspace = workspaceContext?.workspace
  const visibleNav = baseNav.filter((item) => item.roles.includes(role))

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="sidebar-brand" to="/">
          <span className="brand-mark small">BF</span>
          <span>BuildFlow</span>
        </Link>
        <div className="sidebar-context">
          <span>{workspace?.name || 'Workspace'}</span>
          <strong>{ROLE_LABELS[role] || 'Team Member'}</strong>
        </div>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          {visibleNav.map((item) => (
            <NavLink key={item.to} to={item.to}>{item.label}</NavLink>
          ))}
          {canCreateProject(role) && <NavLink to="/projects/new">Add Project</NavLink>}
        </nav>
        <div className="sidebar-placeholders">
          <p>Future modules</p>
          {placeholders.map((item) => <span key={item}>{item}</span>)}
        </div>
        <button className="ghost-button sidebar-signout" onClick={handleSignOut}>Sign out</button>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">{eyebrow || workspace?.name || 'BuildFlow'}</p>
            <h1>{title}</h1>
          </div>
          {canCreateProject(role) && <Link className="primary-button" to="/projects/new">Create project</Link>}
        </header>
        {children}
      </main>
    </div>
  )
}
