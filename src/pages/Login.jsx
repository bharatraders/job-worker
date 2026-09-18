/**
 * Login page — email + password via Supabase Auth.
 * Handles: wrong credentials, network failure, inactive account, loading states.
 * No signup link (accounts created via backend script only).
 */
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { FiLock, FiMail } from 'react-icons/fi'

export default function Login() {
  const { login, error: authError, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')

    if (!email.trim()) {
      setLocalError('Enter your email.')
      return
    }
    if (!password) {
      setLocalError('Enter your password.')
      return
    }

    setSubmitting(true)
    const { error } = await login(email.trim(), password)
    setSubmitting(false)

    if (error) {
      // Map common errors to friendly messages
      const msg = error.toLowerCase()
      if (msg.includes('invalid') || msg.includes('credential')) {
        setLocalError('Wrong email or password.')
      } else if (msg.includes('network') || msg.includes('fetch')) {
        setLocalError('Network error. Check your connection.')
      } else {
        setLocalError(error)
      }
    }
  }

  const displayError = localError || authError

  return (
    <div className="fixed inset-0 bg-bg flex items-center justify-center z-[9999] p-4">
      <div className="bg-panel border border-border rounded-xl p-9 w-[340px] max-w-full shadow-lg">
        {/* Brand — text only, no emoji */}
        <div className="text-xl font-extrabold mb-1">Job Work Tracker</div>
        <div className="text-sm text-text-soft mb-7">Sign in to your account</div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3.5">
            <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase tracking-wide">
              <FiMail className="inline mr-1.5 -mt-0.5" size={12} />
              Email
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-border-strong rounded-[7px] text-sm focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-soft"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="mb-3.5">
            <label className="block text-[11px] font-bold text-text-soft mb-1 uppercase tracking-wide">
              <FiLock className="inline mr-1.5 -mt-0.5" size={12} />
              Password
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-border-strong rounded-[7px] text-sm focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-soft"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
            />
          </div>

          {/* Error display */}
          {displayError && (
            <div className="text-red text-sm mb-3 py-2 px-3 bg-red-soft rounded-md">
              {displayError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || loading}
            className="w-full py-2.5 bg-accent text-white border-none rounded-[7px] text-sm font-bold cursor-pointer hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting || loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
