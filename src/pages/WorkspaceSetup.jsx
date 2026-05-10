import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createWorkspace } from '../lib/workspaces'

const initialForm = {
  name: '', businessType: 'general_contractor', country: '', currency: 'USD', timezone: 'UTC', measurementSystem: 'metric',
}

export function WorkspaceSetup() {
  const navigate = useNavigate()
  const { user, refreshWorkspaceContext } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await createWorkspace(form, user.id)
      const context = await refreshWorkspaceContext(user)
      navigate(context?.role ? '/dashboard' : '/no-workspace', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell wide">
      <section className="auth-card setup-card">
        <div className="brand-mark">BF</div>
        <h1>Create or join a workspace</h1>
        <p>Create a company workspace now. Join-by-invite is prepared for future invite flows and requires an active membership from an admin.</p>
        {error && <div className="notice error">{error}</div>}
        <form onSubmit={handleSubmit} className="form-grid">
          <label>Workspace name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label>Business type<input value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} required /></label>
          <label>Country<input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required /></label>
          <label>Default currency<input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} maxLength="3" required /></label>
          <label>Default timezone<input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} required /></label>
          <label>Measurement system<select value={form.measurementSystem} onChange={(e) => setForm({ ...form, measurementSystem: e.target.value })}><option value="metric">Metric</option><option value="imperial">Imperial</option></select></label>
          <button className="primary-button" disabled={loading}>{loading ? 'Creating workspace…' : 'Create workspace'}</button>
        </form>
      </section>
    </main>
  )
}
