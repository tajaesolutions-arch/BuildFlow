import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AppRedirect } from './components/AppRedirect'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicRoute } from './components/PublicRoute'
import { ROLES } from './lib/roles'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { WorkspaceSetup } from './pages/WorkspaceSetup'
import { Suspended } from './pages/Suspended'
import { NoWorkspace } from './pages/NoWorkspace'
import { NewProject } from './pages/NewProject'
import { Projects } from './pages/Projects'
import { ProjectDetail } from './pages/ProjectDetail'
import { ProjectStructure } from './pages/ProjectStructure'
import { ProjectStages } from './pages/ProjectStages'
import { ProjectTasks } from './pages/ProjectTasks'
import { ProjectInspections } from './pages/ProjectInspections'
import { InspectionDetail } from './pages/InspectionDetail'
import { ProjectPunchList } from './pages/ProjectPunchList'
import { PunchListDetail } from './pages/PunchListDetail'
import {
  ClientDashboard,
  ContractorDashboard,
  CostDashboard,
  MainDashboard,
  PlatformAdminDashboard,
  QADashboard,
  SafetyDashboard,
  SiteDashboard,
} from './pages/Dashboards'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<AppRedirect />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/workspace/setup" element={<ProtectedRoute allowNoWorkspace><WorkspaceSetup /></ProtectedRoute>} />
          <Route path="/suspended" element={<Suspended />} />
          <Route path="/no-workspace" element={<ProtectedRoute allowNoWorkspace><NoWorkspace /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={[ROLES.PLATFORM_ADMIN]}><PlatformAdminDashboard /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={[ROLES.COMPANY_ADMIN, ROLES.DIRECTOR, ROLES.HEAD_PROJECT_MANAGER, ROLES.PROJECT_MANAGER]}><MainDashboard /></ProtectedRoute>} />
          <Route path="/qa-dashboard" element={<ProtectedRoute allowedRoles={[ROLES.QA_INSPECTOR]}><QADashboard /></ProtectedRoute>} />
          <Route path="/contractor-dashboard" element={<ProtectedRoute allowedRoles={[ROLES.CONTRACTOR]}><ContractorDashboard /></ProtectedRoute>} />
          <Route path="/site-dashboard" element={<ProtectedRoute allowedRoles={[ROLES.SITE_SUPERVISOR]}><SiteDashboard /></ProtectedRoute>} />
          <Route path="/cost-dashboard" element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT_COST_CONTROLLER]}><CostDashboard /></ProtectedRoute>} />
          <Route path="/safety-dashboard" element={<ProtectedRoute allowedRoles={[ROLES.SAFETY_OFFICER]}><SafetyDashboard /></ProtectedRoute>} />
          <Route path="/client-dashboard" element={<ProtectedRoute allowedRoles={[ROLES.CLIENT_OWNER_VIEWER]}><ClientDashboard /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute allowedRoles={[ROLES.COMPANY_ADMIN, ROLES.DIRECTOR, ROLES.HEAD_PROJECT_MANAGER, ROLES.PROJECT_MANAGER, ROLES.QA_INSPECTOR, ROLES.CONTRACTOR, ROLES.SITE_SUPERVISOR, ROLES.CLIENT_OWNER_VIEWER, ROLES.ACCOUNTANT_COST_CONTROLLER, ROLES.SAFETY_OFFICER]}><Projects /></ProtectedRoute>} />
          <Route path="/projects/new" element={<ProtectedRoute allowedRoles={[ROLES.COMPANY_ADMIN, ROLES.DIRECTOR, ROLES.HEAD_PROJECT_MANAGER, ROLES.PROJECT_MANAGER]}><NewProject /></ProtectedRoute>} />
          <Route path="/projects/:id" element={<ProtectedRoute allowedRoles={[ROLES.COMPANY_ADMIN, ROLES.DIRECTOR, ROLES.HEAD_PROJECT_MANAGER, ROLES.PROJECT_MANAGER, ROLES.QA_INSPECTOR, ROLES.CONTRACTOR, ROLES.SITE_SUPERVISOR, ROLES.CLIENT_OWNER_VIEWER, ROLES.ACCOUNTANT_COST_CONTROLLER, ROLES.SAFETY_OFFICER]}><ProjectDetail /></ProtectedRoute>} />
          <Route path="/projects/:id/structure" element={<ProtectedRoute allowedRoles={[ROLES.COMPANY_ADMIN, ROLES.DIRECTOR, ROLES.HEAD_PROJECT_MANAGER, ROLES.PROJECT_MANAGER, ROLES.QA_INSPECTOR, ROLES.CONTRACTOR, ROLES.SITE_SUPERVISOR, ROLES.CLIENT_OWNER_VIEWER, ROLES.ACCOUNTANT_COST_CONTROLLER, ROLES.SAFETY_OFFICER]}><ProjectStructure /></ProtectedRoute>} />
          <Route path="/projects/:id/stages" element={<ProtectedRoute allowedRoles={[ROLES.COMPANY_ADMIN, ROLES.DIRECTOR, ROLES.HEAD_PROJECT_MANAGER, ROLES.PROJECT_MANAGER, ROLES.QA_INSPECTOR, ROLES.CONTRACTOR, ROLES.SITE_SUPERVISOR, ROLES.CLIENT_OWNER_VIEWER, ROLES.ACCOUNTANT_COST_CONTROLLER, ROLES.SAFETY_OFFICER]}><ProjectStages /></ProtectedRoute>} />
          <Route path="/projects/:id/tasks" element={<ProtectedRoute allowedRoles={[ROLES.COMPANY_ADMIN, ROLES.DIRECTOR, ROLES.HEAD_PROJECT_MANAGER, ROLES.PROJECT_MANAGER, ROLES.QA_INSPECTOR, ROLES.CONTRACTOR, ROLES.SITE_SUPERVISOR, ROLES.CLIENT_OWNER_VIEWER, ROLES.ACCOUNTANT_COST_CONTROLLER, ROLES.SAFETY_OFFICER]}><ProjectTasks /></ProtectedRoute>} />
          <Route path="/projects/:id/inspections" element={<ProtectedRoute allowedRoles={[ROLES.COMPANY_ADMIN, ROLES.DIRECTOR, ROLES.HEAD_PROJECT_MANAGER, ROLES.PROJECT_MANAGER, ROLES.QA_INSPECTOR, ROLES.CONTRACTOR, ROLES.SITE_SUPERVISOR, ROLES.CLIENT_OWNER_VIEWER, ROLES.ACCOUNTANT_COST_CONTROLLER, ROLES.SAFETY_OFFICER]}><ProjectInspections /></ProtectedRoute>} />
          <Route path="/projects/:id/inspections/:inspectionId" element={<ProtectedRoute allowedRoles={[ROLES.COMPANY_ADMIN, ROLES.DIRECTOR, ROLES.HEAD_PROJECT_MANAGER, ROLES.PROJECT_MANAGER, ROLES.QA_INSPECTOR, ROLES.CONTRACTOR, ROLES.SITE_SUPERVISOR, ROLES.CLIENT_OWNER_VIEWER, ROLES.ACCOUNTANT_COST_CONTROLLER, ROLES.SAFETY_OFFICER]}><InspectionDetail /></ProtectedRoute>} />
          <Route path="/projects/:id/punch-list" element={<ProtectedRoute allowedRoles={[ROLES.COMPANY_ADMIN, ROLES.DIRECTOR, ROLES.HEAD_PROJECT_MANAGER, ROLES.PROJECT_MANAGER, ROLES.QA_INSPECTOR, ROLES.CONTRACTOR, ROLES.SITE_SUPERVISOR, ROLES.CLIENT_OWNER_VIEWER, ROLES.ACCOUNTANT_COST_CONTROLLER, ROLES.SAFETY_OFFICER]}><ProjectPunchList /></ProtectedRoute>} />
          <Route path="/projects/:id/punch-list/:punchListItemId" element={<ProtectedRoute allowedRoles={[ROLES.COMPANY_ADMIN, ROLES.DIRECTOR, ROLES.HEAD_PROJECT_MANAGER, ROLES.PROJECT_MANAGER, ROLES.QA_INSPECTOR, ROLES.CONTRACTOR, ROLES.SITE_SUPERVISOR, ROLES.CLIENT_OWNER_VIEWER, ROLES.ACCOUNTANT_COST_CONTROLLER, ROLES.SAFETY_OFFICER]}><PunchListDetail /></ProtectedRoute>} />
          <Route path="*" element={<AppRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
