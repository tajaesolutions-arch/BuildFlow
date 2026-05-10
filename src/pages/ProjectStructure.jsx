import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { EmptyState } from '../components/EmptyState'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import { AREA_TYPES, canManageProjectOperations, createProjectArea, fetchProjectAreas, fetchProjectBundle } from '../lib/projectOperations'

const initialForm = { name: '', areaType: 'phase', parentAreaId: '', description: '', sortOrder: 0 }

function AreaNode({ area, childrenByParent }) {
  const children = childrenByParent.get(area.id) || []
  return <li><div className="tree-node"><strong>{area.name}</strong><StatusBadge value={area.area_type} /></div>{children.length ? <ul>{children.map((child) => <AreaNode key={child.id} area={child} childrenByParent={childrenByParent} />)}</ul> : null}</li>
}

export function ProjectStructure() {
  const { id } = useParams()
  const { user, workspaceContext } = useAuth()
  const role = workspaceContext?.role
  const [project, setProject] = useState(null)
  const [areas, setAreas] = useState([])
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const canEdit = canManageProjectOperations(role)

  async function load() {
    const bundle = await fetchProjectBundle(id)
    setProject(bundle.project)
    setAreas(bundle.areas)
  }

  useEffect(() => { let mounted = true; setLoading(true); load().catch((err) => mounted && setError(err.message)).finally(() => mounted && setLoading(false)); return () => { mounted = false } }, [id])

  const childrenByParent = useMemo(() => {
    const map = new Map()
    areas.forEach((area) => { const key = area.parent_area_id || 'root'; map.set(key, [...(map.get(key) || []), area]) })
    return map
  }, [areas])

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    try {
      await createProjectArea({ workspaceId: project.workspace_id, projectId: id, userId: user.id, area: form })
      setForm(initialForm)
      setAreas(await fetchProjectAreas(id))
    } catch (err) { setError(err.message) }
  }

  return (
    <AppLayout title="Project Structure" eyebrow={project?.name || 'Flexible breakdown'}>
      <section className="page-actions"><Link className="secondary-button" to={`/projects/${id}`}>Back to project</Link><Link className="secondary-button" to={`/projects/${id}/tasks`}>Open tasks</Link></section>
      {error && <div className="notice error">{error}</div>}
      <section className="dashboard-grid">
        <article className="card"><div className="section-heading"><div><p className="eyebrow">Hierarchy</p><h2>Areas, phases, buildings, floors, units</h2></div></div>{loading ? <p>Loading structure…</p> : areas.length ? <ul className="area-tree">{(childrenByParent.get('root') || []).map((area) => <AreaNode key={area.id} area={area} childrenByParent={childrenByParent} />)}</ul> : <EmptyState title="No areas yet" message="Create a real project hierarchy when your team is ready. Contractors and clients cannot manage project areas." />}</article>
        <article className="card"><div className="section-heading"><div><p className="eyebrow">Authorized setup</p><h2>Add project area</h2></div></div>{canEdit ? <form className="form-grid one-column" onSubmit={handleSubmit}><label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label>Area type<select value={form.areaType} onChange={(e) => setForm({ ...form, areaType: e.target.value })}>{AREA_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select></label><label>Parent area<select value={form.parentAreaId} onChange={(e) => setForm({ ...form, parentAreaId: e.target.value })}><option value="">No parent</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label><label>Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label>Sort order<input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></label><button className="primary-button">Save area</button></form> : <div className="notice warning">Your role can view assigned project structure, but cannot create or edit areas.</div>}</article>
      </section>
    </AppLayout>
  )
}
