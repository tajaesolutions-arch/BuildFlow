export function ConfigurationError() {
  return (
    <main className="auth-shell">
      <section className="auth-card config-card">
        <div className="brand-mark">BF</div>
        <h1>Supabase is not configured</h1>
        <p>
          BuildFlow needs <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> before auth,
          workspace setup, and protected dashboards can run.
        </p>
        <div className="notice warning">
          Add these variables in your local <code>.env</code> file and in Vercel project settings. Do not add service role keys to the frontend.
        </div>
      </section>
    </main>
  )
}
