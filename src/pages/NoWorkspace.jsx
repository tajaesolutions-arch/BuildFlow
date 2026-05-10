import { Link } from 'react-router-dom'
export function NoWorkspace() {
  return <main className="auth-shell"><section className="auth-card"><div className="brand-mark">BF</div><h1>No active workspace</h1><p>You do not have an active workspace membership yet.</p><Link className="primary-button" to="/workspace/setup">Create or join workspace</Link></section></main>
}
