import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfig } from '../lib/supabaseClient'
import { fetchWorkspaceContext } from '../lib/workspaces'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [workspaceContext, setWorkspaceContext] = useState(null)
  const [loading, setLoading] = useState(supabaseConfig.isConfigured)
  const [error, setError] = useState(null)

  const refreshWorkspaceContext = useCallback(async (nextUser = user) => {
    if (!supabaseConfig.isConfigured || !nextUser) {
      setWorkspaceContext(null)
      return null
    }

    try {
      const context = await fetchWorkspaceContext(nextUser.id)
      setWorkspaceContext(context)
      setError(null)
      return context
    } catch (err) {
      setError(err.message)
      setWorkspaceContext(null)
      return null
    }
  }, [user])

  useEffect(() => {
    if (!supabaseConfig.isConfigured) {
      setLoading(false)
      return undefined
    }

    let mounted = true
    supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!mounted) return
      if (sessionError) setError(sessionError.message)
      setSession(data.session)
      setUser(data.session?.user ?? null)
      if (data.session?.user) await refreshWorkspaceContext(data.session.user)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (nextSession?.user) {
        refreshWorkspaceContext(nextSession.user)
      } else {
        setWorkspaceContext(null)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [refreshWorkspaceContext])

  const value = useMemo(() => ({
    session,
    user,
    workspaceContext,
    loading,
    error,
    isConfigured: supabaseConfig.isConfigured,
    refreshWorkspaceContext,
  }), [session, user, workspaceContext, loading, error, refreshWorkspaceContext])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
