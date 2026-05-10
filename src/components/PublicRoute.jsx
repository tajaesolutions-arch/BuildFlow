import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getHomeRouteForRole } from '../lib/roles'
import { ConfigurationError } from './ConfigurationError'
import { LoadingScreen } from './LoadingScreen'

export function PublicRoute({ children }) {
  const { user, workspaceContext, loading, isConfigured } = useAuth()
  if (!isConfigured) return <ConfigurationError />
  if (loading) return <LoadingScreen />
  if (!user) return children
  if (workspaceContext?.isSuspended) return <Navigate to="/suspended" replace />
  if (!workspaceContext?.membership || !workspaceContext?.workspace || !workspaceContext?.role) return <Navigate to="/workspace/setup" replace />
  return <Navigate to={getHomeRouteForRole(workspaceContext.role)} replace />
}
