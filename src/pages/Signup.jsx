import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { signUpWithEmail } from '../lib/auth'

export function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error: authError } = await signUpWithEmail(form.email, form.password, form.fullName)
      if (authError) throw authError
      setMessage('Account created. Check your email if confirmation is enabled, then create or join a workspace.')
      navigate('/workspace/setup')
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
        <h1>Create your account</h1>
        <p>Start with a clean workspace. No demo data will be generated.</p>
        {error && <div className="notice error">{error}</div>}
        {message && <div className="notice success">{message}</div>}
        <label>Full name<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label>
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label>Password<input type="password" minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
        <button className="primary-button" disabled={loading}>{loading ? 'Creating…' : 'Sign up'}</button>
        <p className="auth-footer">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </main>
  )
}
