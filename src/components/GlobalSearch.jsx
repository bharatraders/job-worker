/**
 * GlobalSearch — mega-search box in the Topbar. React port of the
 * "Global Search" from jobwork_v3.html.
 *
 * Behaviour mirrors the HTML version:
 * - 180ms debounce, minimum 2 characters
 * - Results grouped by category (max 5 each), newest challans first
 * - Click / Enter jumps straight to the edit screen
 * - Escape or click-outside closes (and clears) the search
 * - ArrowUp / ArrowDown moves through results, Enter activates
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSearch, FiUpload, FiDownload, FiShoppingCart, FiUser, FiBriefcase } from 'react-icons/fi'
import { globalSearch, groupResults } from '../features/search/globalSearch'

const GROUP_ICONS = {
  'Issue Fabric': FiUpload,
  'Receive Material': FiDownload,
  Orders: FiShoppingCart,
  'Job Workers': FiUser,
  Parties: FiBriefcase,
}

export default function GlobalSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState([])
  const [searched, setSearched] = useState(false)
  const [active, setActive] = useState(-1)
  const wrapRef = useRef(null)

  const flat = []
  groups.forEach((g) => g.items.forEach((item) => flat.push(item)))

  // Debounced search
  useEffect(() => {
    if (q.trim().length < 2) {
      setGroups([])
      setSearched(false)
      setActive(-1)
      setLoading(false)
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const results = await globalSearch(q)
        setGroups(groupResults(results))
        setSearched(true)
        setActive(-1)
        setOpen(true)
      } catch {
        setGroups([])
        setSearched(true)
      } finally {
        setLoading(false)
      }
    }, 180)
    return () => clearTimeout(t)
  }, [q])

  // Close on click outside
  useEffect(() => {
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Keep the keyboard-active item visible
  useEffect(() => {
    if (active < 0) return
    wrapRef.current?.querySelector(`[data-gs-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function close(clear = true) {
    setOpen(false)
    setActive(-1)
    if (clear) {
      setQ('')
      setGroups([])
      setSearched(false)
    }
  }

  function go(item) {
    if (!item) return
    close()
    navigate(item.to, { state: item.state })
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      close()
      return
    }
    if (!flat.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => (a + 1) % flat.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a <= 0 ? flat.length - 1 : a - 1))
    } else if (e.key === 'Enter' && active >= 0) {
      go(flat[active])
    }
  }

  const showDropdown = open && q.trim().length >= 2

  return (
    <div ref={wrapRef} className="gs-wrap w-[130px] sm:w-52 lg:w-64">
      <span className="gs-icon">
        <FiSearch size={14} />
      </span>
      <input
        className="gs-input"
        type="text"
        placeholder="Search challan, job worker, party..."
        autoComplete="off"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => {
          if (q.trim().length >= 2) setOpen(true)
        }}
        onKeyDown={onKeyDown}
      />
      {showDropdown && (
        <div className="gs-results">
          {loading && !searched ? (
            <div className="gs-loading">Searching…</div>
          ) : flat.length === 0 ? (
            <div className="gs-no-results">
              No results for “<b>{q.trim()}</b>”
            </div>
          ) : (
            groups.map((g) => {
              const Icon = GROUP_ICONS[g.label] || FiSearch
              return (
                <div key={g.label}>
                  <div className="gs-group-label">{g.label}</div>
                  {g.items.map((item) => {
                    const idx = flat.indexOf(item)
                    return (
                      <button
                        key={item.key}
                        type="button"
                        data-gs-idx={idx}
                        className={`gs-item${idx === active ? ' active' : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          go(item)
                        }}
                        onMouseEnter={() => setActive(idx)}
                      >
                        <span className="gs-item-icon">
                          <Icon size={15} />
                        </span>
                        <span className="gs-item-text">
                          <span className="gs-item-main">{item.main}</span>
                          <span className="gs-item-sub">{item.sub}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
