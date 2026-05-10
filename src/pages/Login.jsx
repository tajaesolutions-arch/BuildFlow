import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { signInWithEmail } from '../lib/auth'
import { useAuth } from '../contexts/AuthContext'
import { getHomeRouteForRole } from '../lib/roles'

export function Login() {
  const navigate = useNavigate()
  const { refreshWorkspaceContext } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data, error: authError } = await signInWithEmail(form.email, form.password)
      if (authError) throw authError
      const context = await refreshWorkspaceContext(data.user)
      if (context?.isSuspended) navigate('/suspended', { replace: true })
      else if (!context?.role) navigate('/workspace/setup', { replace: true })
      else navigate(getHomeRouteForRole(context.role), { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="brand-mark">BF</div>
        <h1>Log in to BuildFlow</h1>
        <p>Access your construction workspace securely.</p>
        {error && <div className="notice error">{error}</div>}
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
        <button className="primary-button" disabled={loading}>{loading ? 'Signing in…' : 'Log in'}</button>
        <p className="auth-footer">New to BuildFlow? <Link to="/signup">Create an account</Link></p>
      </form>
    </main>
  )
}
