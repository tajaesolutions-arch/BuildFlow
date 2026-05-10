import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getHomeRouteForRole } from '../lib/roles'
import { ConfigurationError } from './ConfigurationError'
import { LoadingScreen } from './LoadingScreen'

export function ProtectedRoute({ children, allowedRoles, allowNoWorkspace = false }) {
  const { user, workspaceContext, loading, isConfigured } = useAuth()
  const location = useLocation()

  if (!isConfigured) return <ConfigurationError />
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (workspaceContext?.isSuspended) return <Navigate to="/suspended" replace />
  if (workspaceContext?.role === 'platform_admin') {
    return allowedRoles?.length && !allowedRoles.includes('platform_admin') ? <Navigate to="/admin" replace /> : children
  }

  if (!workspaceContext?.membership || !workspaceContext?.workspace || !workspaceContext?.role) {
    return allowNoWorkspace ? children : <Navigate to="/workspace/setup" replace />
  }

  if (allowedRoles?.length && !allowedRoles.includes(workspaceContext.role)) {
    return <Navigate to={getHomeRouteForRole(workspaceContext.role)} replace />
  }

  return children
}
