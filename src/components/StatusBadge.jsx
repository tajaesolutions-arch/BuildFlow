export function StatusBadge({ value, tone }) {
  const label = String(value || 'not_set').replaceAll('_', ' ')
  return <span className={`status-badge ${tone || value || ''}`}>{label}</span>
}
