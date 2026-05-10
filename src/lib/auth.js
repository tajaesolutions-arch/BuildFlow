import { getSupabaseOrThrow, supabase } from './supabaseClient'

export async function getCurrentSession() {
  if (!supabase) return { session: null, error: null }
  const { data, error } = await supabase.auth.getSession()
  return { session: data?.session ?? null, error }
}

export async function signInWithEmail(email, password) {
  return getSupabaseOrThrow().auth.signInWithPassword({ email, password })
}

export async function signUpWithEmail(email, password, fullName) {
  return getSupabaseOrThrow().auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}
