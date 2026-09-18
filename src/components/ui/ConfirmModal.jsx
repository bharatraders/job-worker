import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

// Confirm Modal Context
const ConfirmContext = createContext(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}

// Static styles — deliberately NOT Tailwind classes. The old version built
// its button colour via `colors[config.type].btn` template strings
// ("bg-red-600 hover:bg-red-700" etc.), which Tailwind's JIT purge did not
// keep in the built CSS (verified: .bg-red-600 missing from dist bundle).
// The confirm <button> then rendered white text on transparent background —
// invisible — so users only saw Cancel. Inline styles guarantee both
// buttons are always visible regardless of the Tailwind build.
const TYPE_STYLE = {
  danger: { btnBg: '#dc2626', btnHoverBg: '#b91c1c', headerBg: '#fef2f2', iconColor: '#dc2626' },
  warning: { btnBg: '#d97706', btnHoverBg: '#b45309', headerBg: '#fffbeb', iconColor: '#d97706' },
  info: { btnBg: '#2563eb', btnHoverBg: '#1d4ed8', headerBg: '#eff6ff', iconColor: '#2563eb' },
}

export function ConfirmProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState({ title: '', message: '', type: 'danger', confirmText: 'Delete', cancelText: 'Cancel' })
  const resolveRef = useRef(null)
  const [hoverConfirm, setHoverConfirm] = useState(false)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setConfig({
        title: options.title || 'Please confirm',
        message: options.message || 'Are you sure?',
        type: options.type || 'danger',
        confirmText: options.confirmText || (options.type === 'danger' ? 'Delete' : 'Confirm'),
        cancelText: options.cancelText || 'Cancel',
      })
      setHoverConfirm(false)
      setIsOpen(true)
    })
  }, [])

  const close = useCallback((value) => {
    setIsOpen(false)
    if (resolveRef.current) {
      resolveRef.current(value)
      resolveRef.current = null
    }
  }, [])

  const handleConfirm = useCallback(() => close(true), [close])
  const handleCancel = useCallback(() => close(false), [close])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) handleCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleCancel])

  const t = TYPE_STYLE[config.type] || TYPE_STYLE.danger

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && createPortal(
        <div className="modal-overlay" onClick={handleCancel}>
          <div
            style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 440, margin: '0 16px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-label={config.title}
          >
            <div style={{ padding: '16px 24px', background: t.headerBg }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg style={{ width: 24, height: 24, color: t.iconColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>{config.title}</h3>
              </div>
            </div>
            <div style={{ padding: '16px 24px' }}>
              <p style={{ color: '#4b5563', lineHeight: 1.6, margin: 0 }}>{config.message}</p>
            </div>
            <div style={{ padding: '16px 24px', background: '#f9fafb', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={handleCancel}
                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#374151', background: '#fff', border: '1px solid #d1d5db', cursor: 'pointer' }}
              >
                {config.cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                autoFocus
                onMouseEnter={() => setHoverConfirm(true)}
                onMouseLeave={() => setHoverConfirm(false)}
                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#fff', background: hoverConfirm ? t.btnHoverBg : t.btnBg, border: '1px solid ' + (hoverConfirm ? t.btnHoverBg : t.btnBg), cursor: 'pointer', minWidth: 90 }}
              >
                {config.confirmText}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ConfirmContext.Provider>
  )
}

export default function ConfirmModal() {
  return null // Context provider handles everything
}