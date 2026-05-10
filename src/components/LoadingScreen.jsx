export function LoadingScreen({ label = 'Loading BuildFlow…' }) {
  return (
    <main className="loading-screen">
      <div className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </main>
  )
}
