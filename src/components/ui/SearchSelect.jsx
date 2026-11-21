import { useState, useRef, useEffect } from 'react'

/**
 * SearchSelect — read-only typeahead selection, in the same style as the
 * Combo used in Issue Fabric → New Entry, but without the "add new" row.
 *
 * Behaves like the old <select> filters it replaces:
 *   - value is an id ('' = nothing selected, placeholder shown)
 *   - onSelect(id) fires when an item is picked, onSelect('') when cleared
 * Clearing the text input does NOT change the selection (a ✕ button is
 * provided to go back to "All" / none).
 *
 * Props:
 *   - list: [{id, name}] — items to search through
 *   - value: currently selected id (or '' for none)
 *   - placeholder: input placeholder text
 *   - onSelect: (id) => void
 *   - className: additional class for the input
 */
export default function SearchSelect({ list, value, placeholder = 'Select...', onSelect, className = '' }) {
  // `list` may be null while the parent's useApiCall is still loading
  const safeList = Array.isArray(list) ? list : []
  const [open, setOpen] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [hl, setHl] = useState(0)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  const selected = safeList.find((x) => x.id === value) || null

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setFilterText('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function openDropdown() {
    setFilterText('')
    setHl(0)
    setOpen(true)
  }

  const q = filterText.trim().toLowerCase()
  const matches = q ? safeList.filter((x) => x.name.toLowerCase().includes(q)) : safeList

  function selectItem(item) {
    setOpen(false)
    setFilterText('')
    onSelect && onSelect(item.id)
  }

  function clearSelection(e) {
    e.stopPropagation()
    setOpen(false)
    setFilterText('')
    onSelect && onSelect('')
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) openDropdown()
      else setHl((h) => Math.min(h + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHl((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && matches[hl]) selectItem(matches[hl])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setFilterText('')
    }
  }

  return (
    <div className="combo" ref={wrapRef}>
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={open ? filterText : (selected ? selected.name : '')}
        onChange={(e) => { setFilterText(e.target.value); setHl(0) }}
        onFocus={openDropdown}
        onClick={openDropdown}
        onKeyDown={handleKeyDown}
        className={`${className}${selected ? ' pr-8' : ''}`}
      />
      {selected && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Clear selection"
          onMouseDown={(e) => { e.preventDefault(); clearSelection(e) }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-soft hover:text-red text-sm leading-none"
        >
          ✕
        </button>
      )}
      {open && (
        <div className="combo-list">
          {matches.map((m, i) => (
            <div
              key={m.id}
              className={`combo-item ${i === hl ? 'hl' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); selectItem(m) }}
              onMouseEnter={() => setHl(i)}
            >
              {m.name}
            </div>
          ))}
          {matches.length === 0 && (
            <div className="combo-item muted">No matches</div>
          )}
        </div>
      )}
    </div>
  )
}
