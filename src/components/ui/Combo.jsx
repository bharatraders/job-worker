import { useState, useRef, useEffect } from 'react'

/**
 * Combo box component — search + inline add new.
 * Mirrors the renderCombo() function from jobwork_v3.html.
 *
 * Props:
 *   - list: [{id, name}] — items to search through
 *   - value: currently selected id (or '' for none)
 *   - placeholder: input placeholder text
 *   - onSelect: (id) => void — called when an item is selected
 *   - onAddNew: (name) => string|null — called when user clicks "+ Add", should return new id
 *   - onChange: (value) => void — called when the input value changes (optional)
 *   - className: additional class for the input
 */
export default function Combo({ list, value, placeholder = 'Search or add new...', onSelect, onAddNew, onChange, className = '' }) {
  // `list` may be null while the parent's useApiCall is still loading
  // (e.g. History → Edit challan navigates before jobWorkers/fabrics resolve).
  // Coerce to [] so .find/.filter/.some below never throw "can't access
  // property find of null". Fixes the History->edit crash.
  const safeList = Array.isArray(list) ? list : []
  const [inputValue, setInputValue] = useState('')
  const [currentId, setCurrentId] = useState(value || '')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [filterText, setFilterText] = useState('')
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  // Sync with external value changes
  useEffect(() => {
    setCurrentId(value || '')
    const selected = safeList.find(x => x.id === value)
    setInputValue(selected ? selected.name : '')
  }, [value, list])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const matches = safeList.filter(x => x.name.toLowerCase().includes(filterText.toLowerCase()))
  const exactMatch = safeList.some(x => x.name.trim().replace(/\s+/g, ' ').toLowerCase() === filterText.trim().replace(/\s+/g, ' ').toLowerCase())

  function handleInputChange(e) {
    const val = e.target.value
    setInputValue(val)
    setCurrentId('')
    setFilterText(val)
    setDropdownOpen(true)
    onChange && onChange(val)
  }

  function handleFocus() {
    setDropdownOpen(true)
    if (inputValue === '') setFilterText('')
  }

  function selectItem(item) {
    setInputValue(item.name)
    setCurrentId(item.id)
    setDropdownOpen(false)
    onSelect && onSelect(item.id)
  }

  async function handleAddNew() {
    const name = filterText.trim().replace(/\s+/g, ' ')
    if (!name) return

    // Check for duplicate (case-insensitive)
    const existing = safeList.find(x => x.name.trim().replace(/\s+/g, ' ').toLowerCase() === name.toLowerCase())
    if (existing) {
      selectItem(existing)
      return
    }

    if (onAddNew) {
      // onAddNew may be async (API create call) — await it so the resolved
      // id (not a Promise) is stored in the parent form.
      const newId = await onAddNew(name)
      if (newId) {
        setInputValue(name)
        setCurrentId(newId)
        setDropdownOpen(false)
        onSelect && onSelect(newId)
      }
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && filterText.trim() && !exactMatch && onAddNew) {
      e.preventDefault()
      handleAddNew()
    }
    if (e.key === 'Escape') {
      setDropdownOpen(false)
    }
  }

  return (
    <div className="combo" ref={wrapRef}>
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        className={className}
      />
      {dropdownOpen && (
        <div className="combo-list">
          {matches.map(m => (
            <div key={m.id} className="combo-item" onMouseDown={() => selectItem(m)}>
              {m.name}
            </div>
          ))}
          {filterText.trim() && !exactMatch && onAddNew && (
            <div className="combo-item add-new" onMouseDown={handleAddNew}>
              + Add "{filterText.trim().replace(/\s+/g, ' ')}"
            </div>
          )}
          {matches.length === 0 && (!filterText.trim() || exactMatch) && (
            <div className="combo-item muted">No matches</div>
          )}
        </div>
      )}
    </div>
  )
}
