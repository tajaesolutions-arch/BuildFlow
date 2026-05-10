import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getHomeRouteForRole } from '../lib/roles'
import { ConfigurationError } from './ConfigurationError'
import { LoadingScreen } from './LoadingScreen'

export function AppRedirect() {
  const { user, workspaceContext, loading, isConfigured } = useAuth()
  if (!isConfigured) return <ConfigurationError />
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (workspaceContext?.isSuspended) return <Navigate to="/suspended" replace />
  if (!workspaceContext?.role) return <Navigate to="/workspace/setup" replace />
  return <Navigate to={getHomeRouteForRole(workspaceContext.role)} replace />
}
