import { Link, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '../components/AppLayout'
import { EmptyState } from '../components/EmptyState'
import { KpiCard } from '../components/KpiCard'
import { StatusBadge } from '../components/StatusBadge'
import { fetchProjectBundle } from '../lib/projectOperations'

export function ProjectDetail() {
  const { id } = useParams()
  const [bundle, setBundle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchProjectBundle(id).then((data) => mounted && setBundle(data)).catch((err) => mounted && setError(err.message)).finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [id])

  const stats = useMemo(() => {
    const tasks = bundle?.tasks ?? []
    const stages = bundle?.stages ?? []
    return {
      openTasks: tasks.filter((task) => !['approved', 'completed'].includes(task.status)).length,
      readyForReview: tasks.filter((task) => task.status === 'ready_for_review').length,
      averageStageProgress: stages.length ? Math.round(stages.reduce((sum, stage) => sum + Number(stage.progress_percent || 0), 0) / stages.length) : 0,
      delayedStages: stages.filter((stage) => stage.status === 'delayed').length,
    }
  }, [bundle])

  return (
    <AppLayout title={bundle?.project?.name || 'Project'} eyebrow="Project dashboard">
      {error && <div className="notice error">{error}</div>}
      {loading ? <p>Loading project…</p> : bundle ? (
        <div className="page-stack">
          <section className="dashboard-grid">
            <article className="card hero-card"><p className="eyebrow">Overview</p><h2>{bundle.project.name}</h2><p>{bundle.project.project_type} in {bundle.project.location || bundle.project.country || 'an unset location'}.</p><StatusBadge value={bundle.project.status} /></article>
            <article className="card context-card"><h3>Schedule</h3><dl><div><dt>Start</dt><dd>{bundle.project.start_date || 'Not set'}</dd></div><div><dt>Expected completion</dt><dd>{bundle.project.expected_completion_date || 'Not set'}</dd></div><div><dt>Timezone</dt><dd>{bundle.project.timezone || 'Not set'}</dd></div></dl></article>
          </section>
          <section className="kpi-grid"><KpiCard label="Stage progress" value={`${stats.averageStageProgress}%`} hint="Calculated from real stages" /><KpiCard label="Open tasks" value={stats.openTasks} /><KpiCard label="Ready for review" value={stats.readyForReview} /><KpiCard label="Delayed stages" value={stats.delayedStages} /></section>
          <section className="dashboard-grid">
            <article className="card"><div className="section-heading"><div><p className="eyebrow">Project structure</p><h2>Area preview</h2></div><Link className="secondary-button" to={`/projects/${id}/structure`}>Open structure</Link></div>{bundle.areas.length ? <div className="chip-list">{bundle.areas.slice(0, 8).map((area) => <span key={area.id}>{area.area_type}: {area.name}</span>)}</div> : <EmptyState title="No structure yet" message="Add phases, buildings, floors, zones, lots, or custom areas when your project breakdown is ready." />}</article>
            <article className="card"><div className="section-heading"><div><p className="eyebrow">Stage progress</p><h2>Construction lifecycle</h2></div><Link className="secondary-button" to={`/projects/${id}/stages`}>Manage stages</Link></div>{bundle.stages.length ? bundle.stages.slice(0, 6).map((stage) => <div className="compact-row" key={stage.id}><span>{stage.name}</span><strong>{stage.progress_percent}%</strong></div>) : <EmptyState title="No stages yet" message="Default stage suggestions are available, but nothing is inserted until an authorized user applies or creates stages." />}</article>
          </section>
          <section className="dashboard-grid">
            <article className="card"><div className="section-heading"><div><p className="eyebrow">Tasks</p><h2>Open task summary</h2></div><Link className="secondary-button" to={`/projects/${id}/tasks`}>Open tasks</Link></div>{bundle.tasks.length ? bundle.tasks.slice(0, 6).map((task) => <Link className="compact-row link-row" key={task.id} to={`/projects/${id}/tasks?task=${task.id}`}><span>{task.title}</span><StatusBadge value={task.status} /></Link>) : <EmptyState title="No tasks yet" message="Create real construction tasks with assignees, dates, checklist items, and workflow status when ready." />}</article>
            <article className="card"><p className="eyebrow">Safe placeholders</p><h2>Future modules</h2><div className="chip-list muted"><span>Budget summary placeholder</span><span>QA placeholder</span><span>Documents placeholder</span><span>Reports placeholder</span><span>AI placeholder</span></div><p>These modules are intentionally not built in Phase 2.</p></article>
          </section>
          <section className="card"><div className="section-heading"><div><p className="eyebrow">Recent activity</p><h2>Project activity</h2></div></div>{bundle.activity.length ? bundle.activity.map((item) => <div className="compact-row" key={item.id}><span>{item.action.replaceAll('_', ' ')}</span><small>{new Date(item.created_at).toLocaleString()}</small></div>) : <EmptyState title="No activity yet" message="Phase 2 actions will appear here once users create areas, stages, tasks, checklist updates, and task notes." />}</section>
        </div>
      ) : null}
    </AppLayout>
  )
}
