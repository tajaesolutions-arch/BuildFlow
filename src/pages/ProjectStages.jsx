import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { EmptyState } from '../components/EmptyState'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import { canManageProjectOperations, createStage, DEFAULT_STAGE_SUGGESTIONS, fetchProjectBundle, STAGE_STATUSES, updateStage } from '../lib/projectOperations'

const initialForm = { name: '', description: '', projectAreaId: '', status: 'not_started', progressPercent: 0, startDate: '', dueDate: '', sortOrder: 0 }

export function ProjectStages() {
  const { id } = useParams()
  const { user, workspaceContext } = useAuth()
  const role = workspaceContext?.role
  const [bundle, setBundle] = useState({ project: null, areas: [], stages: [] })
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState(null)
  const canEdit = canManageProjectOperations(role)

  async function load() { const data = await fetchProjectBundle(id); setBundle(data) }
  useEffect(() => { load().catch((err) => setError(err.message)) }, [id])

  async function handleCreate(event) {
    event.preventDefault(); setError(null)
    try { await createStage({ workspaceId: bundle.project.workspace_id, projectId: id, userId: user.id, stage: form }); setForm(initialForm); await load() } catch (err) { setError(err.message) }
  }

  async function applyTemplate() {
    setError(null)
    try {
      const start = bundle.stages.length
      for (const [index, name] of DEFAULT_STAGE_SUGGESTIONS.entries()) await createStage({ workspaceId: bundle.project.workspace_id, projectId: id, userId: user.id, stage: { name, sortOrder: start + index } })
      await load()
    } catch (err) { setError(err.message) }
  }

  async function update(stage, patch) {
    setError(null)
    try { await updateStage({ workspaceId: bundle.project.workspace_id, projectId: id, userId: user.id, stageId: stage.id, patch }); await load() } catch (err) { setError(err.message) }
  }

  return (
    <AppLayout title="Construction Stages" eyebrow={bundle.project?.name || 'Lifecycle tracking'}>
      <section className="page-actions"><Link className="secondary-button" to={`/projects/${id}`}>Back to project</Link><Link className="secondary-button" to={`/projects/${id}/tasks`}>Open tasks</Link></section>
      {error && <div className="notice error">{error}</div>}
      <section className="card"><div className="section-heading"><div><p className="eyebrow">Stage plan</p><h2>Project construction stages</h2></div>{canEdit && <button className="secondary-button" onClick={applyTemplate} disabled={!bundle.project}>Apply suggested template</button>}</div>{bundle.stages.length ? <div className="stage-list">{bundle.stages.map((stage) => <article className="stage-card" key={stage.id}><label>Stage name<input value={stage.name} disabled={!canEdit} onChange={(e) => update(stage, { name: e.target.value })} /></label><span>{stage.project_area?.name || 'Whole project'}</span><StatusBadge value={stage.status} /><label>Progress<input type="number" min="0" max="100" value={stage.progress_percent} disabled={!canEdit} onChange={(e) => update(stage, { progress_percent: Number(e.target.value) })} /></label><label>Status<select value={stage.status} disabled={!canEdit} onChange={(e) => update(stage, { status: e.target.value })}>{STAGE_STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></label></article>)}</div> : <EmptyState title="No stages yet" message="No default stages are inserted automatically. Apply the suggested template or create a custom stage when ready." />}</section>
      <section className="card form-card"><div className="section-heading"><div><p className="eyebrow">Authorized edit</p><h2>Add custom stage</h2></div></div>{canEdit ? <form className="form-grid" onSubmit={handleCreate}><label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label>Project area<select value={form.projectAreaId} onChange={(e) => setForm({ ...form, projectAreaId: e.target.value })}><option value="">Whole project</option>{bundle.areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label><label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STAGE_STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></label><label>Progress %<input type="number" min="0" max="100" value={form.progressPercent} onChange={(e) => setForm({ ...form, progressPercent: e.target.value })} /></label><label>Start date<input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label><label>Due date<input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label><label>Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label>Sort order<input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></label><button className="primary-button">Save stage</button></form> : <div className="notice warning">Your role can view stages but cannot create, rename, reorder, or update them.</div>}</section>
    </AppLayout>
  )
}
