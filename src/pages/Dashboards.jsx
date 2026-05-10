import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { DashboardTemplate } from '../components/DashboardTemplate'
import { AppLayout } from '../components/AppLayout'
import { EmptyState } from '../components/EmptyState'
import { KpiCard } from '../components/KpiCard'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import { fetchProjects } from '../lib/projects'
import { fetchContractorDashboard, fetchWorkspaceStages, fetchWorkspaceTasks } from '../lib/projectOperations'
import { fetchQADashboard, fetchWorkspaceQualityMetrics } from '../lib/qualityControl'

function isDueSoon(dateValue) {
  if (!dateValue) return false
  const today = new Date()
  const due = new Date(`${dateValue}T00:00:00`)
  const days = (due - today) / (1000 * 60 * 60 * 24)
  return days >= 0 && days <= 14
}

export function PlatformAdminDashboard() {
  return <DashboardTemplate title="Platform Admin" description="SaaS-level administration is prepared for founder/team operations and is not exposed to normal workspace roles." />
}

export function MainDashboard() {
  const { workspaceContext } = useAuth()
  const workspace = workspaceContext?.workspace
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [stages, setStages] = useState([])
  const [quality, setQuality] = useState({ inspections: [], punchItems: [], tasks: [] })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    if (!workspace?.id) return undefined
    setLoading(true)
    Promise.all([fetchProjects(workspace.id), fetchWorkspaceTasks(workspace.id), fetchWorkspaceStages(workspace.id), fetchWorkspaceQualityMetrics(workspace.id)])
      .then(([projectRows, taskRows, stageRows, qualityRows]) => { if (mounted) { setProjects(projectRows); setTasks(taskRows); setStages(stageRows); setQuality(qualityRows) } })
      .catch((err) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [workspace?.id])

  const stats = useMemo(() => ({
    totalProjects: projects.length,
    activeProjects: projects.filter((project) => project.status === 'active').length,
    tasksDueSoon: tasks.filter((task) => isDueSoon(task.due_date) && !['approved', 'completed'].includes(task.status)).length,
    tasksReadyForReview: tasks.filter((task) => task.status === 'ready_for_review').length,
    delayedStages: stages.filter((stage) => stage.status === 'delayed').length,
    inspectionsScheduled: quality.inspections.filter((inspection) => inspection.status === 'scheduled').length,
    inspectionsFailed: quality.inspections.filter((inspection) => inspection.status === 'failed' || inspection.result === 'failed').length,
    openPunchItems: quality.punchItems.filter((item) => !['passed', 'closed'].includes(item.status)).length,
    urgentDefects: quality.punchItems.filter((item) => item.priority === 'urgent' && !['passed', 'closed'].includes(item.status)).length,
    readyReinspection: quality.punchItems.filter((item) => item.status === 'ready_for_reinspection').length,
  }), [projects, tasks, stages, quality])

  return (
    <AppLayout title="Dashboard" eyebrow="Real workspace operations">
      {error && <div className="notice error">{error}</div>}
      {loading ? <p>Loading dashboard…</p> : <div className="page-stack"><section className="kpi-grid"><KpiCard label="Total projects" value={stats.totalProjects} /><KpiCard label="Active projects" value={stats.activeProjects} /><KpiCard label="Tasks due soon" value={stats.tasksDueSoon} hint="Next 14 days" /><KpiCard label="Ready for review" value={stats.tasksReadyForReview} /><KpiCard label="Inspections scheduled" value={stats.inspectionsScheduled} /><KpiCard label="Inspections failed" value={stats.inspectionsFailed} /><KpiCard label="Open punch items" value={stats.openPunchItems} /><KpiCard label="Urgent defects" value={stats.urgentDefects} /><KpiCard label="Ready reinspect" value={stats.readyReinspection} /><KpiCard label="Delayed stages" value={stats.delayedStages} /></section><section className="dashboard-grid"><article className="card"><div className="section-heading"><div><p className="eyebrow">Projects</p><h2>Current portfolio</h2></div><Link className="secondary-button" to="/projects">Open projects</Link></div>{projects.length ? projects.slice(0, 5).map((project) => <Link className="compact-row link-row" key={project.id} to={`/projects/${project.id}`}><span>{project.name}</span><StatusBadge value={project.status} /></Link>) : <EmptyState title="No projects yet" message="The dashboard uses real Supabase records and shows a clean empty state until projects exist." />}</article><article className="card"><div className="section-heading"><div><p className="eyebrow">Phase 3 quality</p><h2>Attention needed</h2></div></div>{[...quality.inspections, ...quality.punchItems].length ? <>{quality.inspections.filter((item) => ['scheduled', 'in_progress', 'failed'].includes(item.status)).slice(0, 4).map((item) => <Link className="compact-row link-row" key={item.id} to={`/projects/${item.project_id}/inspections/${item.id}`}><span>{item.title}</span><StatusBadge value={item.status} /></Link>)}{quality.punchItems.filter((item) => !['passed', 'closed'].includes(item.status)).slice(0, 4).map((item) => <Link className="compact-row link-row" key={item.id} to={`/projects/${item.project_id}/punch-list/${item.id}`}><span>{item.title}</span><StatusBadge value={item.status} /></Link>)}</> : <EmptyState title="No quality records yet" message="No fake QA metrics are shown. Inspections and punch items will appear when created." />}</article></section></div>}
    </AppLayout>
  )
}

export function QADashboard() {
  const { user } = useAuth()
  const [data, setData] = useState({ inspections: [], tasks: [], punchItems: [] })
  const [error, setError] = useState(null)
  useEffect(() => { if (user?.id) fetchQADashboard(user.id).then(setData).catch((err) => setError(err.message)) }, [user?.id])
  const assigned = data.inspections.filter((inspection) => inspection.assigned_to === user?.id)
  const scheduled = data.inspections.filter((inspection) => inspection.status === 'scheduled')
  const inProgress = data.inspections.filter((inspection) => inspection.status === 'in_progress')
  const failed = data.inspections.filter((inspection) => inspection.status === 'failed' || inspection.result === 'failed')
  const reinspection = data.punchItems.filter((item) => item.status === 'ready_for_reinspection')
  return <AppLayout title="QA Dashboard" eyebrow="Quality control">{error && <div className="notice error">{error}</div>}<section className="kpi-grid"><KpiCard label="Assigned to me" value={assigned.length} /><KpiCard label="Scheduled" value={scheduled.length} /><KpiCard label="In progress" value={inProgress.length} /><KpiCard label="Failed" value={failed.length} /><KpiCard label="Tasks ready" value={data.tasks.length} /><KpiCard label="Reinspection" value={reinspection.length} /></section><section className="dashboard-grid"><article className="card"><div className="section-heading"><div><p className="eyebrow">Inspections</p><h2>Assigned and active QA</h2></div></div>{data.inspections.length ? data.inspections.slice(0, 8).map((inspection) => <Link className="compact-row link-row" key={inspection.id} to={`/projects/${inspection.project_id}/inspections/${inspection.id}`}><span>{inspection.title}<small>{inspection.project?.name ? ` · ${inspection.project.name}` : ''}</small></span><StatusBadge value={inspection.status} /></Link>) : <EmptyState title="No inspections exist" message="Assigned inspections, scheduled work, failed QA, and reinspection requests will appear here when created." />}</article><article className="card"><div className="section-heading"><div><p className="eyebrow">Review queue</p><h2>Tasks and punch items</h2></div></div>{[...data.tasks, ...reinspection].length ? <>{data.tasks.slice(0, 5).map((task) => <Link className="compact-row link-row" key={task.id} to={`/projects/${task.project_id}/tasks?task=${task.id}`}><span>{task.title}</span><StatusBadge value={task.status} /></Link>)}{reinspection.slice(0, 5).map((item) => <Link className="compact-row link-row" key={item.id} to={`/projects/${item.project_id}/punch-list/${item.id}`}><span>{item.title}</span><StatusBadge value={item.status} /></Link>)}</> : <EmptyState title="No QA queue" message="Tasks ready for inspection and punch items needing reinspection will appear here." />}</article></section></AppLayout>
}

export function ContractorDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState({ tasks: [], updates: [], punchItems: [] })
  const [error, setError] = useState(null)
  useEffect(() => { if (user?.id) fetchContractorDashboard(user.id).then(setData).catch((err) => setError(err.message)) }, [user?.id])
  const dueSoon = data.tasks.filter((task) => isDueSoon(task.due_date) && !['approved', 'completed'].includes(task.status))
  const ready = data.tasks.filter((task) => task.status === 'ready_for_review')
  const corrections = data.tasks.filter((task) => ['needs_correction', 'rejected'].includes(task.status))
  const punchDueSoon = data.punchItems.filter((item) => isDueSoon(item.due_date) && !['passed', 'closed'].includes(item.status))
  return (
    <AppLayout title="Contractor Dashboard" eyebrow="Assigned work only">
      {error && <div className="notice error">{error}</div>}
      <section className="kpi-grid"><KpiCard label="My assigned tasks" value={data.tasks.length} /><KpiCard label="Due soon" value={dueSoon.length} /><KpiCard label="Ready for review" value={ready.length} /><KpiCard label="Needs correction" value={corrections.length} /><KpiCard label="Assigned punch" value={data.punchItems.length} /><KpiCard label="Punch due soon" value={punchDueSoon.length} /></section>
      <section className="dashboard-grid"><article className="card"><div className="section-heading"><div><p className="eyebrow">My tasks</p><h2>Assigned task queue</h2></div></div>{data.tasks.length ? data.tasks.slice(0, 8).map((task) => <Link className="compact-row link-row" key={task.id} to={`/projects/${task.project_id}/tasks?task=${task.id}`}><span>{task.title}<small>{task.project?.name ? ` · ${task.project.name}` : ''}</small></span><StatusBadge value={task.status} /></Link>) : <EmptyState title="No assigned tasks" message="You will only see tasks assigned to you. Unrelated projects, budgets, and other contractors’ private tasks are not shown." />}</article><article className="card"><div className="section-heading"><div><p className="eyebrow">Corrections</p><h2>Assigned punch list</h2></div></div>{data.punchItems.length ? data.punchItems.map((item) => <Link className="compact-row link-row" key={item.id} to={`/projects/${item.project_id}/punch-list/${item.id}`}><span>{item.title}<small>{item.due_date ? ` · due ${item.due_date}` : ''}</small></span><StatusBadge value={item.status} /></Link>) : <EmptyState title="No assigned punch items" message="Correction photo and status update CTAs appear when defects are assigned to you." />}</article></section>
    </AppLayout>
  )
}

export function SiteDashboard() {
  return <DashboardTemplate title="Site Supervisor Dashboard" description="Site supervisors can view assigned projects, create inspection requests, task updates, punch list items, and site photos where assigned." />
}

export function CostDashboard() {
  return <DashboardTemplate title="Cost Dashboard" description="Cost controllers can view project context. Full financials are intentionally deferred beyond Phase 2." />
}

export function SafetyDashboard() {
  return <DashboardTemplate title="Safety Dashboard" description="Safety officers can view project context. Full safety modules are intentionally deferred beyond Phase 2." />
}

export function ClientDashboard() {
  const { workspaceContext } = useAuth()
  const workspace = workspaceContext?.workspace
  const [quality, setQuality] = useState({ tasks: [], punchItems: [], attachments: [] })
  const [error, setError] = useState(null)
  useEffect(() => { if (workspace?.id) fetchWorkspaceQualityMetrics(workspace.id).then(setQuality).catch((err) => setError(err.message)) }, [workspace?.id])
  const approvedTasks = quality.tasks.filter((task) => ['approved', 'completed'].includes(task.status))
  const closedPunch = quality.punchItems.filter((item) => item.status === 'closed')
  const approvedPhotos = quality.attachments.filter((attachment) => attachment.attachment_type === 'completion_photo')
  return <AppLayout title="Client Dashboard" eyebrow="Approved progress only">{error && <div className="notice error">{error}</div>}<section className="kpi-grid"><KpiCard label="Approved tasks" value={approvedTasks.length} /><KpiCard label="Closed punch items" value={closedPunch.length} /><KpiCard label="Approved photos" value={approvedPhotos.length} /><KpiCard label="Milestones" value="—" hint="Placeholder" /></section><section className="dashboard-grid"><article className="card"><h2>Approved progress summary</h2>{approvedTasks.length ? approvedTasks.slice(0, 8).map((task) => <div className="compact-row" key={task.id}><span>{task.title}</span><StatusBadge value={task.status} /></div>) : <EmptyState title="No approved progress yet" message="Internal failed inspections, private defects, and contractor disputes are not shown here." />}</article><article className="card"><h2>Approved completion photos</h2>{approvedPhotos.length ? approvedPhotos.map((photo) => <div className="compact-row" key={photo.id}><span>{photo.file_name}</span><StatusBadge value={photo.attachment_type} /></div>) : <EmptyState title="No approved photos" message="Only controlled completion photos appear for client viewers." />}<p>Milestone progress reporting is reserved for a later client reporting module.</p></article></section></AppLayout>
}
