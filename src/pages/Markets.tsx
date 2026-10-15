/**
 * Markets — full market scanner with sorting and filtering.
 */

import { useEffect, useMemo, useState } from 'react'
import { Search, TrendingUp, TrendingDown } from 'lucide-react'
import { Panel } from '../components/ui/shared'
import { getDashboard, type ScannerRow } from '../api/client'

type SortKey = 'volume' | 'price' | 'change' | 'question'

export default function Markets() {
  const [rows, setRows] = useState<ScannerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('volume')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const d = await getDashboard()
        if (!cancelled) {
          setRows(d.scanner.rows ?? [])
          setLoading(false)
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unknown error')
          setLoading(false)
        }
      }
    }
    load()
    const interval = setInterval(load, 15000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const list = q
      ? rows.filter((r) => r.question.toLowerCase().includes(q))
      : rows
    const sorted = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'volume':
          return b.volume_24h - a.volume_24h
        case 'price':
          return b.price - a.price
        case 'change':
          return (b.change_24h ?? 0) - (a.change_24h ?? 0)
        case 'question':
          return a.question.localeCompare(b.question)
      }
    })
    return sorted
  }, [rows, search, sortKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-jarvis-cyan font-mono text-sm animate-pulse">
        Loading markets…
      </div>
    )
  }

  if (error) {
    return (
      <div className="panel max-w-lg mx-auto mt-12">
        <div className="panel-header text-jarvis-red">Error</div>
        <div className="panel-body text-sm font-mono">{error}</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <Panel title={`Markets (${filtered.length})`} icon={TrendingUp} className="flex-1">
        {/* Controls */}
        <div className="panel-header flex items-center gap-4 border-b border-jarvis-border">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-3.5 h-3.5 text-jarvis-textMuted" />
            <input
              type="text"
              placeholder="Search markets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-mono text-jarvis-text placeholder-jarvis-textMuted w-full"
            />
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-jarvis-textMuted">SORT</span>
            {(['volume', 'price', 'change', 'question'] as SortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setSortKey(k)}
                className={`px-2 py-0.5 rounded border transition-colors ${
                  sortKey === k
                    ? 'border-jarvis-cyan/50 text-jarvis-cyan bg-jarvis-cyan/10'
                    : 'border-jarvis-border text-jarvis-textMuted hover:text-jarvis-cyan'
                }`}
              >
                {k.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs font-mono">
            <thead className="sticky top-0 bg-jarvis-panel border-b border-jarvis-border">
              <tr className="text-jarvis-textMuted text-[10px] uppercase tracking-wider">
                <th className="text-left px-3 py-2">Question</th>
                <th className="text-right px-3 py-2">Price</th>
                <th className="text-right px-3 py-2">24h</th>
                <th className="text-right px-3 py-2">Volume</th>
                <th className="text-left px-3 py-2">Decision</th>
                <th className="text-left px-3 py-2">Signals</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const changeColor =
                  row.change_24h === null
                    ? 'text-jarvis-textMuted'
                    : row.change_24h > 0
                      ? 'text-jarvis-green'
                      : row.change_24h < 0
                        ? 'text-jarvis-red'
                        : 'text-jarvis-text'
                return (
                  <tr
                    key={row.market_id}
                    className="border-b border-jarvis-gridline hover:bg-jarvis-cyan/5 transition-colors"
                  >
                    <td className="px-3 py-2 text-jarvis-text">
                      {row.question}
                    </td>
                    <td className="px-3 py-2 text-right text-jarvis-cyan">
                      {(row.price * 100).toFixed(1)}%
                    </td>
                    <td className={`px-3 py-2 text-right ${changeColor}`}>
                      {row.change_24h === null
                        ? '—'
                        : `${row.change_24h > 0 ? '+' : ''}${(row.change_24h * 100).toFixed(2)}%`}
                    </td>
                    <td className="px-3 py-2 text-right text-jarvis-textDim">
                      ${row.volume_24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-3 py-2 text-jarvis-textMuted">
                      {row.decision}
                    </td>
                    <td className="px-3 py-2">
                      {row.signals.length === 0 ? (
                        <span className="text-jarvis-textMuted">—</span>
                      ) : (
                        <span className="text-jarvis-cyan">
                          {row.signals.join(', ')}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center text-jarvis-textMuted text-xs font-mono py-8">
              No markets match your search.
            </div>
          )}
        </div>
      </Panel>
    </div>
  )
}
