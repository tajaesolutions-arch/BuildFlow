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
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    if (!workspace?.id) return undefined
    setLoading(true)
    Promise.all([fetchProjects(workspace.id), fetchWorkspaceTasks(workspace.id), fetchWorkspaceStages(workspace.id)])
      .then(([projectRows, taskRows, stageRows]) => { if (mounted) { setProjects(projectRows); setTasks(taskRows); setStages(stageRows) } })
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
    highPriorityOpen: tasks.filter((task) => ['high', 'urgent'].includes(task.priority) && !['approved', 'completed'].includes(task.status)).length,
  }), [projects, tasks, stages])

  return (
    <AppLayout title="Dashboard" eyebrow="Real workspace operations">
      {error && <div className="notice error">{error}</div>}
      {loading ? <p>Loading dashboard…</p> : <div className="page-stack"><section className="kpi-grid"><KpiCard label="Total projects" value={stats.totalProjects} /><KpiCard label="Active projects" value={stats.activeProjects} /><KpiCard label="Tasks due soon" value={stats.tasksDueSoon} hint="Next 14 days" /><KpiCard label="Ready for review" value={stats.tasksReadyForReview} /><KpiCard label="Delayed stages" value={stats.delayedStages} hint="From real stage records" /><KpiCard label="High priority open" value={stats.highPriorityOpen} /></section><section className="dashboard-grid"><article className="card"><div className="section-heading"><div><p className="eyebrow">Projects</p><h2>Current portfolio</h2></div><Link className="secondary-button" to="/projects">Open projects</Link></div>{projects.length ? projects.slice(0, 5).map((project) => <Link className="compact-row link-row" key={project.id} to={`/projects/${project.id}`}><span>{project.name}</span><StatusBadge value={project.status} /></Link>) : <EmptyState title="No projects yet" message="The dashboard uses real Supabase records and shows a clean empty state until projects exist." />}</article><article className="card"><div className="section-heading"><div><p className="eyebrow">Task operations</p><h2>Attention needed</h2></div></div>{tasks.length ? tasks.filter((task) => ['ready_for_review', 'needs_correction', 'rejected'].includes(task.status) || isDueSoon(task.due_date)).slice(0, 6).map((task) => <Link className="compact-row link-row" key={task.id} to={`/projects/${task.project_id}/tasks?task=${task.id}`}><span>{task.title}</span><StatusBadge value={task.status} /></Link>) : <EmptyState title="No tasks yet" message="Create tasks inside a project to start tracking due dates, reviews, corrections, and approvals." />}</article></section></div>}
    </AppLayout>
  )
}

export function QADashboard() {
  return <DashboardTemplate title="QA Dashboard" description="Quality inspection workspace for upcoming inspection and punch-list modules. QA inspectors can view assigned projects and task context without broad admin permissions." />
}

export function ContractorDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState({ tasks: [], updates: [] })
  const [error, setError] = useState(null)
  useEffect(() => { if (user?.id) fetchContractorDashboard(user.id).then(setData).catch((err) => setError(err.message)) }, [user?.id])
  const dueSoon = data.tasks.filter((task) => isDueSoon(task.due_date) && !['approved', 'completed'].includes(task.status))
  const ready = data.tasks.filter((task) => task.status === 'ready_for_review')
  const corrections = data.tasks.filter((task) => ['needs_correction', 'rejected'].includes(task.status))
  return (
    <AppLayout title="Contractor Dashboard" eyebrow="Assigned work only">
      {error && <div className="notice error">{error}</div>}
      <section className="kpi-grid"><KpiCard label="My assigned tasks" value={data.tasks.length} /><KpiCard label="Due soon" value={dueSoon.length} /><KpiCard label="Ready for review" value={ready.length} /><KpiCard label="Needs correction" value={corrections.length} /></section>
      <section className="dashboard-grid"><article className="card"><div className="section-heading"><div><p className="eyebrow">My tasks</p><h2>Assigned task queue</h2></div></div>{data.tasks.length ? data.tasks.slice(0, 8).map((task) => <Link className="compact-row link-row" key={task.id} to={`/projects/${task.project_id}/tasks?task=${task.id}`}><span>{task.title}<small>{task.project?.name ? ` · ${task.project.name}` : ''}</small></span><StatusBadge value={task.status} /></Link>) : <EmptyState title="No assigned tasks" message="You will only see tasks assigned to you. Unrelated projects, budgets, and other contractors’ private tasks are not shown." />}</article><article className="card"><div className="section-heading"><div><p className="eyebrow">Recent updates</p><h2>Task notes</h2></div></div>{data.updates.length ? data.updates.map((update) => <div className="compact-row" key={update.id}><span>{update.message}</span><small>{new Date(update.created_at).toLocaleString()}</small></div>) : <EmptyState title="No updates yet" message="Task notes and status updates for assigned work will appear here." />}</article></section>
    </AppLayout>
  )
}

export function SiteDashboard() {
  return <DashboardTemplate title="Site Supervisor Dashboard" description="Site supervisors can view assigned projects, update permitted task progress, and add field updates where RLS allows." />
}

export function CostDashboard() {
  return <DashboardTemplate title="Cost Dashboard" description="Cost controllers can view project context. Full financials are intentionally deferred beyond Phase 2." />
}

export function SafetyDashboard() {
  return <DashboardTemplate title="Safety Dashboard" description="Safety officers can view project context. Full safety modules are intentionally deferred beyond Phase 2." />
}

export function ClientDashboard() {
  return <DashboardTemplate title="Client Dashboard" description="Client and owner view is read-only and limited to approved progress placeholders until dedicated client reporting is built." />
}
