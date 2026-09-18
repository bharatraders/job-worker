/**
 * Toast — a lightweight toast notification system.
 * Uses a global event bus so any component can trigger a toast.
 */
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

let toastHandler = null

/** Call this from anywhere to show a toast message. */
export function showToast(message) {
  if (toastHandler) toastHandler(message)
}

export default function ToastHost() {
  const [message, setMessage] = useState('')
  const [visible, setVisible] = useState(false)

  const show = useCallback((msg) => {
    setMessage(msg)
    setVisible(true)
    setTimeout(() => setVisible(false), 2200)
  }, [])

  useEffect(() => {
    toastHandler = show
    return () => { toastHandler = null }
  }, [show])

  if (!message) return null

  return createPortal(
    <div className={`toast ${visible ? 'show' : ''}`}>
      {message}
    </div>,
    document.body
  )
}
