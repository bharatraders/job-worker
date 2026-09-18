/**
 * AuthContext — holds the current user's session, profile (role, is_active),
 * and loading/error state. Provides login/logout and a `requireRole` guard.
 *
 * This replaces the old APP_PASSWORD + localStorage flag entirely.
 * The session is managed by Supabase Auth; the profile row adds role + is_active.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { normalizeError } from '../lib/errors'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // On mount: check for existing session, then load profile
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (err) {
      setError(normalizeError(err))
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  // Sign in with email + password. Returns { error } on failure.
  async function login(email, password) {
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(normalizeError(error))
      return { error: normalizeError(error) }
    }
    // Session change listener will load the profile
    return {}
  }

  // Sign out
  async function logout() {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  // Guard: returns true if user has the required role (or is owner).
  // Owner can access everything; worker role is checked explicitly.
  function hasRole(requiredRole) {
    if (!profile) return false
    if (profile.role === 'owner') return true
    return profile.role === requiredRole
  }

  const value = {
    session,
    profile,
    loading,
    error,
    login,
    logout,
    hasRole,
    isAuthenticated: !!session && !!profile,
    isActive: profile?.is_active === true,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
