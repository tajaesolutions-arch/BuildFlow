import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { EmptyState } from '../components/EmptyState'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import { addTaskUpdate, canEditAssignedTask, canManageProjectOperations, createTask, fetchProjectBundle, fetchTaskDetail, getAllowedTaskStatuses, TASK_PRIORITIES, TASK_STATUSES, updateChecklistItem, updateTask } from '../lib/projectOperations'

const initialTask = { title: '', description: '', trade: '', priority: 'medium', projectAreaId: '', stageId: '', assignedTo: '', assignedCompany: '', startDate: '', dueDate: '', checklist: '' }

export function ProjectTasks() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, workspaceContext } = useAuth()
  const role = workspaceContext?.role
  const [bundle, setBundle] = useState({ project: null, areas: [], stages: [], tasks: [] })
  const [form, setForm] = useState(initialTask)
  const [filters, setFilters] = useState({ status: '', priority: '', trade: '', assignee: '', area: '', stage: '' })
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState(null)
  const canManage = canManageProjectOperations(role)

  async function load() { const data = await fetchProjectBundle(id); setBundle(data) }
  useEffect(() => { load().catch((err) => setError(err.message)) }, [id])
  useEffect(() => { const taskId = searchParams.get('task'); if (taskId) fetchTaskDetail(taskId).then(setSelected).catch((err) => setError(err.message)) }, [searchParams])

  const filteredTasks = useMemo(() => bundle.tasks.filter((task) => (!filters.status || task.status === filters.status) && (!filters.priority || task.priority === filters.priority) && (!filters.trade || task.trade === filters.trade) && (!filters.assignee || task.assigned_to === filters.assignee) && (!filters.area || task.project_area_id === filters.area) && (!filters.stage || task.stage_id === filters.stage)), [bundle.tasks, filters])
  const trades = [...new Set(bundle.tasks.map((task) => task.trade).filter(Boolean))]
  const assignees = [...new Set(bundle.tasks.map((task) => task.assigned_to).filter(Boolean))]

  async function handleCreate(event) {
    event.preventDefault(); setError(null)
    try {
      await createTask({ workspaceId: bundle.project.workspace_id, projectId: id, userId: user.id, task: form, checklistItems: form.checklist.split('\n') })
      setForm(initialTask); await load()
    } catch (err) { setError(err.message) }
  }

  async function changeStatus(task, status) {
    setError(null)
    try { await updateTask({ workspaceId: task.workspace_id, projectId: task.project_id, userId: user.id, taskId: task.id, patch: { status } }); await load(); if (selected?.task?.id === task.id) setSelected(await fetchTaskDetail(task.id)) } catch (err) { setError(err.message) }
  }

  async function saveNote(event) {
    event.preventDefault(); if (!note.trim() || !selected) return
    try { await addTaskUpdate({ workspaceId: selected.task.workspace_id, projectId: selected.task.project_id, taskId: selected.task.id, userId: user.id, message: note }); setNote(''); setSelected(await fetchTaskDetail(selected.task.id)) } catch (err) { setError(err.message) }
  }

  async function toggleChecklist(item) {
    try { await updateChecklistItem({ workspaceId: item.workspace_id, projectId: item.project_id, taskId: item.task_id, itemId: item.id, userId: user.id, isCompleted: !item.is_completed }); setSelected(await fetchTaskDetail(item.task_id)) } catch (err) { setError(err.message) }
  }

  function openTask(task) { setSearchParams({ task: task.id }) }

  return (
    <AppLayout title="Construction Tasks" eyebrow={bundle.project?.name || 'Task workflow'}>
      <section className="page-actions"><Link className="secondary-button" to={`/projects/${id}`}>Back to project</Link><Link className="secondary-button" to={`/projects/${id}/stages`}>Open stages</Link></section>
      {error && <div className="notice error">{error}</div>}
      <section className="card"><div className="section-heading"><div><p className="eyebrow">Filters</p><h2>Task list</h2></div></div><div className="filters-grid"><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option>{TASK_STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select><select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}><option value="">All priorities</option>{TASK_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select><select value={filters.trade} onChange={(e) => setFilters({ ...filters, trade: e.target.value })}><option value="">All trades</option>{trades.map((trade) => <option key={trade} value={trade}>{trade}</option>)}</select><select value={filters.assignee} onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}><option value="">All assignees</option>{assignees.map((assignee) => <option key={assignee} value={assignee}>{assignee.slice(0, 8)}…</option>)}</select><select value={filters.area} onChange={(e) => setFilters({ ...filters, area: e.target.value })}><option value="">All areas</option>{bundle.areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select><select value={filters.stage} onChange={(e) => setFilters({ ...filters, stage: e.target.value })}><option value="">All stages</option>{bundle.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></div>{filteredTasks.length ? <div className="task-list">{filteredTasks.map((task) => { const allowed = getAllowedTaskStatuses(role, task, user.id); return <article className="task-card" key={task.id}><button className="task-open" onClick={() => openTask(task)}><strong>{task.title}</strong><span>{task.project_area?.name || 'No area'} · {task.stage?.name || 'No stage'}</span></button><StatusBadge value={task.status} /><StatusBadge value={task.priority} /><span>{task.trade || 'No trade'}</span><span>Due {task.due_date || 'not set'}</span>{allowed.length ? <select value={task.status} onChange={(e) => changeStatus(task, e.target.value)}>{allowed.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select> : null}</article> })}</div> : <EmptyState title="No matching tasks" message="No fake tasks are shown. Create real tasks or adjust filters." />}</section>
      <section className="dashboard-grid"><article className="card"><div className="section-heading"><div><p className="eyebrow">Authorized task setup</p><h2>Add task</h2></div></div>{canManage ? <form className="form-grid" onSubmit={handleCreate}><label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label><label>Trade<input value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })} /></label><label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{TASK_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label><label>Project area<select value={form.projectAreaId} onChange={(e) => setForm({ ...form, projectAreaId: e.target.value })}><option value="">No area</option>{bundle.areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label><label>Stage<select value={form.stageId} onChange={(e) => setForm({ ...form, stageId: e.target.value })}><option value="">No stage</option>{bundle.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label><label>Assigned user ID<input value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} placeholder="UUID from workspace member" /></label><label>Assigned company<input value={form.assignedCompany} onChange={(e) => setForm({ ...form, assignedCompany: e.target.value })} /></label><label>Start date<input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label><label>Due date<input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label><label>Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label className="full-width">Checklist items<textarea value={form.checklist} onChange={(e) => setForm({ ...form, checklist: e.target.value })} placeholder="One checklist item per line" /></label><button className="primary-button">Save task</button></form> : <div className="notice warning">Your role can only update permitted assigned task progress and notes.</div>}</article><article className="card"><div className="section-heading"><div><p className="eyebrow">Task detail</p><h2>{selected?.task?.title || 'Select a task'}</h2></div></div>{selected ? <div className="task-detail"><p>{selected.task.description || 'No description provided.'}</p><div className="chip-list"><StatusBadge value={selected.task.status} /><StatusBadge value={selected.task.approval_status} /><StatusBadge value={selected.task.priority} /></div>{canManage ? <div className="manager-edit-grid"><label>Title<input defaultValue={selected.task.title} onBlur={(e) => e.target.value !== selected.task.title && updateTask({ workspaceId: selected.task.workspace_id, projectId: selected.task.project_id, userId: user.id, taskId: selected.task.id, patch: { title: e.target.value } }).then(() => load()).catch((err) => setError(err.message))} /></label><label>Priority<select defaultValue={selected.task.priority} onChange={(e) => updateTask({ workspaceId: selected.task.workspace_id, projectId: selected.task.project_id, userId: user.id, taskId: selected.task.id, patch: { priority: e.target.value } }).then(() => load()).catch((err) => setError(err.message))}>{TASK_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label><label>Due date<input type="date" defaultValue={selected.task.due_date || ''} onBlur={(e) => updateTask({ workspaceId: selected.task.workspace_id, projectId: selected.task.project_id, userId: user.id, taskId: selected.task.id, patch: { due_date: e.target.value || null } }).then(() => load()).catch((err) => setError(err.message))} /></label></div> : null}<h3>Checklist</h3>{selected.checklist.length ? selected.checklist.map((item) => <label className="check-row" key={item.id}><input type="checkbox" checked={item.is_completed} disabled={!(canManage || canEditAssignedTask(role, selected.task, user.id))} onChange={() => toggleChecklist(item)} />{item.label}</label>) : <p>No checklist items.</p>}<h3>Updates / notes</h3><form onSubmit={saveNote} className="note-form"><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a task note or status update" /><button className="secondary-button">Add update</button></form>{selected.updates.map((update) => <div className="compact-row" key={update.id}><span>{update.message}</span><small>{new Date(update.created_at).toLocaleString()}</small></div>)}</div> : <EmptyState title="No task selected" message="Open a task to view checklist items, updates, and status workflow controls." />}</article></section>
    </AppLayout>
  )
}
