import { DashboardTemplate } from '../components/DashboardTemplate'

export function PlatformAdminDashboard() {
  return <DashboardTemplate title="Platform Admin" description="SaaS-level administration is prepared for founder/team operations and is not exposed to normal workspace roles." />
}

export function MainDashboard() {
  return <DashboardTemplate title="Dashboard" description="Executive workspace overview for company admins, directors, and project management leaders." />
}

export function QADashboard() {
  return <DashboardTemplate title="QA Dashboard" description="Quality inspection workspace for upcoming inspection and punch-list modules." />
}

export function ContractorDashboard() {
  return <DashboardTemplate title="Contractor Dashboard" description="Contractor workspace with limited project context and no broad default access." />
}

export function SiteDashboard() {
  return <DashboardTemplate title="Site Supervisor Dashboard" description="Site operations placeholder for daily reports, field updates, and coordination." />
}

export function CostDashboard() {
  return <DashboardTemplate title="Cost Dashboard" description="Cost control placeholder for budgets, expenses, approvals, and finance reporting." />
}

export function SafetyDashboard() {
  return <DashboardTemplate title="Safety Dashboard" description="Safety operations placeholder for incidents, audits, permits, and toolbox talks." />
}

export function ClientDashboard() {
  return <DashboardTemplate title="Client Dashboard" description="Client and owner view prepared for read-only project reporting and handover visibility." />
}
