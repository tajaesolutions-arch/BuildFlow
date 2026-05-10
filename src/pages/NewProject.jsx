import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { useAuth } from '../contexts/AuthContext'
import { canCreateProject } from '../lib/roles'
import { createProject } from '../lib/projects'

const initialForm = {
  name: '', projectType: '', country: '', location: '', startDate: '', expectedCompletionDate: '', budgetAmount: '', currency: 'USD', timezone: 'UTC', measurementSystem: 'metric', clientName: '', status: 'planning',
}

export function NewProject() {
  const navigate = useNavigate()
  const { user, workspaceContext } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const role = workspaceContext?.role

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canCreateProject(role)) {
      setError('Your role is not permitted to create projects.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await createProject(workspaceContext.workspace.id, user.id, form)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout title="Create project" eyebrow="Authorized project setup">
      <section className="card form-card">
        <div className="section-heading"><div><p className="eyebrow">Project foundation</p><h2>Add a workspace project</h2></div></div>
        {!canCreateProject(role) ? <div className="notice error">Your role cannot create projects.</div> : null}
        {error && <div className="notice error">{error}</div>}
        <form onSubmit={handleSubmit} className="form-grid project-form">
          <label>Project name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label>Project type<input value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value })} required /></label>
          <label>Country<input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required /></label>
          <label>Location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
          <label>Start date<input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label>
          <label>Expected completion<input type="date" value={form.expectedCompletionDate} onChange={(e) => setForm({ ...form, expectedCompletionDate: e.target.value })} /></label>
          <label>Budget amount<input type="number" min="0" step="0.01" value={form.budgetAmount} onChange={(e) => setForm({ ...form, budgetAmount: e.target.value })} /></label>
          <label>Currency<input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} maxLength="3" required /></label>
          <label>Timezone<input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} required /></label>
          <label>Measurement system<select value={form.measurementSystem} onChange={(e) => setForm({ ...form, measurementSystem: e.target.value })}><option value="metric">Metric</option><option value="imperial">Imperial</option></select></label>
          <label>Client/developer name<input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} /></label>
          <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="planning">Planning</option><option value="active">Active</option><option value="on_hold">On hold</option><option value="completed">Completed</option></select></label>
          <button className="primary-button" disabled={loading || !canCreateProject(role)}>{loading ? 'Saving…' : 'Save project'}</button>
        </form>
      </section>
    </AppLayout>
  )
}
