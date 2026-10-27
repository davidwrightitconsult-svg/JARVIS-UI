/**
 * Strategies — full book strategy registry with filtering and detail view.
 *
 * Data source: /api/strategies
 * Layout: filter bar + grid of strategy cards + click-to-open detail panel
 * (reuses the existing DetailPanel component from Phase 8c).
 */

import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Filter, Search } from 'lucide-react'
import { Panel } from '../components/ui/shared'
import DetailPanel, { type SelectedItem } from '../components/DetailPanel'
import { getStrategyRegistry, type StrategyDefinition } from '../api/client'

type StatusFilter = 'all' | 'verified' | 'untested' | 'testing'

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'ALL',
  verified: 'VERIFIED',
  untested: 'NOT TESTED',
  testing: 'TESTING',
}

function statusBucket(status: string): StatusFilter {
  if (status === 'VERIFIED' || status === 'APPROVED') return 'verified'
  if (status === 'FORWARD_TEST' || status === 'TESTING' || status === 'PROCESSING')
    return 'testing'
  return 'untested'
}

function statusColor(status: string): string {
  const bucket = statusBucket(status)
  if (bucket === 'verified') return 'text-jarvis-green'
  if (bucket === 'testing') return 'text-jarvis-purple'
  return 'text-jarvis-textDim'
}

function statusDot(status: string): string {
  const bucket = statusBucket(status)
  if (bucket === 'verified') return 'bg-jarvis-green'
  if (bucket === 'testing') return 'bg-jarvis-purple'
  return 'bg-jarvis-cyan'
}

export default function Strategies() {
  const [strategies, setStrategies] = useState<StrategyDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<SelectedItem | null>(null)

  useEffect(() => {
    let cancelled = false
    getStrategyRegistry()
      .then((reg) => {
        if (!cancelled) {
          setStrategies(reg.strategies)
          setLoading(false)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unknown error')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  // ESC closes detail panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return strategies.filter((s) => {
      if (filter !== 'all' && statusBucket(s.status) !== filter) return false
      if (q) {
        const haystack = `${s.name} ${s.rule} ${s.source} ${s.books.join(' ')}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [strategies, filter, search])

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: strategies.length,
      verified: 0,
      testing: 0,
      untested: 0,
    }
    for (const s of strategies) {
      c[statusBucket(s.status)] += 1
    }
    return c
  }, [strategies])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-jarvis-cyan font-mono text-sm animate-pulse">
        Loading strategy registry…
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
    <>
      <div className="h-full flex flex-col gap-4">
        {/* Filter bar */}
        <Panel title={`Strategy Registry (${filtered.length} of ${strategies.length})`} icon={BookOpen}>
          <div className="panel-body flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-jarvis-textDim" />
              <input
                type="text"
                placeholder="Search by name, rule, or source…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-xs font-mono text-jarvis-text placeholder-jarvis-textMuted w-full"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-jarvis-textDim" />
              {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-2 py-1 rounded border text-[10px] font-mono transition-colors ${
                    filter === key
                      ? 'border-jarvis-cyan/50 text-jarvis-cyan bg-jarvis-cyan/10'
                      : 'border-jarvis-border text-jarvis-textDim hover:text-jarvis-cyan'
                  }`}
                >
                  {STATUS_LABELS[key]} ({counts[key]})
                </button>
              ))}
            </div>
          </div>
        </Panel>

        {/* Grid of strategy cards */}
        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="text-jarvis-textDim text-xs font-mono text-center py-12">
              No strategies match your filter.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((s) => (
                <StrategyCard
                  key={s.key}
                  strategy={s}
                  onClick={() =>
                    setSelected({ kind: 'strategy', data: s })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <DetailPanel item={selected} onClose={() => setSelected(null)} />
    </>
  )
}

function StrategyCard({
  strategy,
  onClick,
}: {
  strategy: StrategyDefinition
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="panel text-left p-3 hover:border-jarvis-cyan/50 hover:bg-jarvis-cyan/5 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-jarvis-cyan text-sm font-mono font-bold truncate">
            {strategy.name}
          </div>
          <div className="text-jarvis-textDim text-[10px] font-mono mt-0.5">
            {strategy.kind}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusDot(strategy.status)}`} />
          <span className={`text-[9px] font-mono ${statusColor(strategy.status)}`}>
            {strategy.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <p className="text-jarvis-text text-[11px] font-mono leading-relaxed line-clamp-3 mb-2">
        {strategy.rule}
      </p>

      <div className="flex items-center gap-1 text-[10px] font-mono text-jarvis-textMuted">
        <BookOpen className="w-3 h-3 shrink-0" />
        <span className="truncate">
          {strategy.books && strategy.books.length > 0
            ? strategy.books[0].split(',')[0]
            : strategy.source}
        </span>
      </div>
    </button>
  )
}
