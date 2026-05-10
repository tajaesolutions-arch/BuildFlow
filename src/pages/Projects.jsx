import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AppLayout } from '../components/AppLayout'
import { EmptyState } from '../components/EmptyState'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import { canCreateProject } from '../lib/roles'
import { fetchProjects } from '../lib/projects'

function formatMoney(amount, currency) {
  if (amount === null || amount === undefined) return 'Not set'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(Number(amount))
}

export function Projects() {
  const { workspaceContext } = useAuth()
  const workspace = workspaceContext?.workspace
  const role = workspaceContext?.role
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    if (!workspace?.id) return undefined
    setLoading(true)
    fetchProjects(workspace.id).then((items) => mounted && setProjects(items)).catch((err) => mounted && setError(err.message)).finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [workspace?.id])

  return (
    <AppLayout title="Projects" eyebrow="Project operations">
      <section className="card">
        <div className="section-heading">
          <div><p className="eyebrow">Portfolio</p><h2>Workspace projects</h2></div>
          {canCreateProject(role) && <Link className="primary-button" to="/projects/new">Add Project</Link>}
        </div>
        {error && <div className="notice error">{error}</div>}
        {loading ? <p>Loading projects…</p> : projects.length === 0 ? (
          <EmptyState title="No projects yet" message="No fake or demo projects are created. Authorized roles can add the first real project when ready." action={canCreateProject(role) ? <Link className="primary-button" to="/projects/new">Create project</Link> : null} />
        ) : (
          <div className="responsive-table project-table">
            <div className="table-head"><span>Project</span><span>Type</span><span>Location</span><span>Status</span><span>Progress</span><span>Budget</span><span>Expected completion</span><span>Assigned PM</span></div>
            {projects.map((project) => (
              <Link className="table-row" key={project.id} to={`/projects/${project.id}`}>
                <strong>{project.name}</strong>
                <span>{project.project_type || 'Not set'}</span>
                <span>{project.location || project.country || 'Not set'}</span>
                <StatusBadge value={project.status} />
                <span>{project.progress_percent ? `${project.progress_percent}%` : 'From stages/tasks'}</span>
                <span>{formatMoney(project.budget_amount, project.currency)}</span>
                <span>{project.expected_completion_date || 'Not set'}</span>
                <span>{project.assigned_pm || 'Not assigned'}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  )
}
