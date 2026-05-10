import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { canCreateProject, ROLE_LABELS } from '../lib/roles'
import { fetchProjects } from '../lib/projects'
import { AppLayout } from './AppLayout'

export function DashboardTemplate({ title, description }) {
  const { workspaceContext } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(Boolean(workspaceContext?.workspace?.id))
  const [error, setError] = useState(null)
  const role = workspaceContext?.role
  const workspace = workspaceContext?.workspace

  useEffect(() => {
    let mounted = true
    if (!workspace?.id) return undefined
    setLoading(true)
    fetchProjects(workspace.id)
      .then((items) => { if (mounted) setProjects(items) })
      .catch((err) => { if (mounted) setError(err.message) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [workspace?.id])

  return (
    <AppLayout title={title} eyebrow={ROLE_LABELS[role]}>
      <section className="dashboard-grid">
        <article className="card hero-card">
          <p className="eyebrow">Phase 1 foundation</p>
          <h2>{ROLE_LABELS[role]}</h2>
          <p>{description}</p>
        </article>
        <article className="card context-card">
          <h3>Workspace context</h3>
          <dl>
            <div><dt>Workspace</dt><dd>{workspace?.name}</dd></div>
            <div><dt>Country</dt><dd>{workspace?.country || 'Not set'}</dd></div>
            <div><dt>Currency</dt><dd>{workspace?.default_currency || 'Not set'}</dd></div>
            <div><dt>Timezone</dt><dd>{workspace?.default_timezone || 'Not set'}</dd></div>
          </dl>
        </article>
      </section>
      <section className="card projects-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Projects</p>
            <h2>Workspace projects</h2>
          </div>
          {canCreateProject(role) && <Link className="secondary-button" to="/projects/new">Add first project</Link>}
        </div>
        {error && <div className="notice error">{error}</div>}
        {loading ? <p>Loading projects…</p> : projects.length === 0 ? (
          <div className="empty-state">
            <h3>No projects yet</h3>
            <p>BuildFlow starts with a clean workspace. No sample or demo projects are created.</p>
            {canCreateProject(role) ? <Link className="primary-button" to="/projects/new">Create the first project</Link> : <p>Your role can view assigned project context when projects are available.</p>}
          </div>
        ) : (
          <div className="project-list">
            {projects.map((project) => (
              <article key={project.id} className="project-row">
                <div>
                  <strong>{project.name}</strong>
                  <span>{project.location || project.country}</span>
                </div>
                <span className="status-badge">{project.status}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  )
}
