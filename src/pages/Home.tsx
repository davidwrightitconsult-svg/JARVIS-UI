/**
 * Home — the main dashboard.
 *
 * Contains: Portfolio Overview, Risk, Market Scanner, Strategy Library,
 * Recent Activity, and the Global Brain orb (with tooltips and detail
 * panel). Every panel shows live data from the backend.
 *
 * The Orb, Tooltip, and DetailPanel wiring has been preserved from the
 * original single-page App.
 */

import { useEffect, useState } from 'react'
import { Activity, BarChart3, Brain as BrainIcon, Shield, Zap } from 'lucide-react'
import { Panel, Row } from '../components/ui/shared'
import Orb, { type HoveredNodeInfo } from '../components/Orb'
import Tooltip, { type TooltipData } from '../components/Tooltip'
import DetailPanel, {
  type SelectedItem,
  type MarketDetail,
} from '../components/DetailPanel'
import { useBrainStream } from '../api/useBrainStream'
import {
  getDashboard,
  getStrategyRegistry,
  type DashboardResponse,
  type StrategyDefinition,
} from '../api/client'

export default function Home() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const brainStream = useBrainStream()
  const [densityMode, setDensityMode] = useState<'signals' | 'all'>('signals')

  const [strategyRegistry, setStrategyRegistry] = useState<
    Record<string, StrategyDefinition>
  >({})

  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [, setHovered] = useState<HoveredNodeInfo | null>(null)
  const [selected, setSelected] = useState<SelectedItem | null>(null)

  // ---- Dashboard polling ----
  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      try {
        const d = await getDashboard()
        if (!cancelled) {
          setData(d)
          setError(null)
          setLoading(false)
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unknown error')
          setLoading(false)
        }
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  // ---- Strategy registry ----
  useEffect(() => {
    let cancelled = false
    getStrategyRegistry()
      .then((reg) => {
        if (cancelled) return
        const byKey: Record<string, StrategyDefinition> = {}
        for (const s of reg.strategies) {
          byKey[s.key] = s
        }
        setStrategyRegistry(byKey)
      })
      .catch((err) => {
        console.warn('Failed to fetch strategy registry:', err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // ---- ESC closes the detail panel ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ---- Node interaction handlers ----
  const handleHoverNode = (info: HoveredNodeInfo | null) => {
    setHovered(info)
    if (!info || !data) {
      setTooltip(null)
      return
    }

    if (info.kind === 'core') {
      setTooltip({
        x: info.screenX,
        y: info.screenY,
        content: (
          <div className="space-y-1">
            <div className="text-jarvis-cyan font-bold">J.A.R.V.I.S. Core</div>
            <div className="text-jarvis-textMuted text-[10px]">
              Mode: {data.system.mode}
            </div>
            <div className="text-jarvis-textMuted text-[10px]">
              Balance: ${(data.portfolio.equity ?? 0).toFixed(2)}
            </div>
            <div className="text-jarvis-textMuted text-[10px]">
              Open positions: {data.portfolio.open_positions ?? 0}
            </div>
            <div className="text-jarvis-textMuted text-[10px]">
              Strategies: {data.book_strategies.registered}
            </div>
          </div>
        ),
      })
      return
    }

    if (info.kind === 'strategy') {
      const def = strategyRegistry[info.key]
      setTooltip({
        x: info.screenX,
        y: info.screenY,
        content: (
          <div className="space-y-1">
            <div className="text-jarvis-cyan font-bold">{info.label}</div>
            {def?.source && (
              <div className="text-jarvis-textMuted text-[10px] italic">
                {def.source.slice(0, 80)}
                {def.source.length > 80 ? '…' : ''}
              </div>
            )}
            <div className="text-jarvis-textMuted text-[10px]">
              Status: {def?.status ?? 'NOT_VERIFIED'}
            </div>
            <div className="text-jarvis-amber text-[10px] mt-1">
              Click for full details
            </div>
          </div>
        ),
      })
      return
    }

    if (info.kind === 'market') {
      const m = (data.scanner.rows ?? []).find((r) => r.market_id === info.key)
      if (!m) {
        setTooltip(null)
        return
      }
      const changeStr =
        m.change_24h === null
          ? '—'
          : `${m.change_24h > 0 ? '+' : ''}${(m.change_24h * 100).toFixed(2)}%`
      setTooltip({
        x: info.screenX,
        y: info.screenY,
        content: (
          <div className="space-y-1 max-w-xs">
            <div className="text-jarvis-cyan font-bold leading-snug">
              {m.question}
            </div>
            <div className="text-jarvis-textMuted text-[10px]">
              Price: {(m.price * 100).toFixed(1)}%
            </div>
            <div className="text-jarvis-textMuted text-[10px]">
              24h: {changeStr}
            </div>
            <div className="text-jarvis-textMuted text-[10px]">
              Vol: ${m.volume_24h.toLocaleString()}
            </div>
            <div className="text-jarvis-amber text-[10px] mt-1">
              Click for full details
            </div>
          </div>
        ),
      })
    }
  }

  const handleClickNode = (kind: 'strategy' | 'market' | 'core', key: string) => {
    if (!data) return

    if (kind === 'strategy') {
      const def = strategyRegistry[key]
      if (def) setSelected({ kind: 'strategy', data: def })
      return
    }

    if (kind === 'market') {
      const m = (data.scanner.rows ?? []).find((r) => r.market_id === key)
      if (m) {
        const detail: MarketDetail = {
          market_id: m.market_id,
          question: m.question,
          outcome: (m as any).outcome ?? 'Yes',
          price: m.price,
          change_24h: m.change_24h,
          volume_24h: m.volume_24h,
          decision: m.decision,
          signals: m.signals,
          edge_status: m.edge_status,
        }
        setSelected({ kind: 'market', data: detail })
      }
      return
    }

    setSelected(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-jarvis-cyan font-mono text-sm animate-pulse">
        Connecting to J.A.R.V.I.S. control plane…
      </div>
    )
  }

  if (error) {
    return (
      <div className="panel max-w-lg mx-auto mt-12">
        <div className="panel-header text-jarvis-red">Connection Error</div>
        <div className="panel-body text-sm">
          <p className="text-jarvis-textDim mb-2">
            Could not reach the JARVIS backend.
          </p>
          <p className="font-mono text-xs text-jarvis-red">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <>
      <div className="grid grid-cols-12 gap-4 h-full">
        <div className="col-span-3 flex flex-col gap-4">
          <Panel title="Portfolio Overview" icon={BarChart3}>
            <div className="panel-body space-y-3 font-mono text-xs">
              <Row
                label="Balance"
                value={`$${(data.portfolio.equity ?? 0).toFixed(2)}`}
                accent
              />
              <Row
                label="Total P&L"
                value={`$${(data.portfolio.total_pnl ?? 0).toFixed(2)}`}
              />
              <Row
                label="Daily P&L"
                value={`$${(data.portfolio.daily_pnl ?? 0).toFixed(2)}`}
              />
              <Row
                label="Open Positions"
                value={String(data.portfolio.open_positions ?? 0)}
              />
              <Row
                label="Closed Trades"
                value={String(data.portfolio.closed_trades ?? 0)}
              />
              <Row
                label="Max Drawdown"
                value={`${((data.portfolio.max_drawdown ?? 0) * 100).toFixed(2)}%`}
              />
            </div>
          </Panel>

          <Panel title="Risk" icon={Shield}>
            <div className="panel-body space-y-3 font-mono text-xs">
              <Row
                label="Kill Switch"
                value={data.risk.kill_switch?.engaged ? 'ENGAGED' : 'OFF'}
              />
              <Row
                label="Drawdown Halt"
                value={data.risk.drawdown_halt?.engaged ? 'ENGAGED' : 'OFF'}
              />
              <Row
                label="Live Trading"
                value={data.risk.live_trading ?? '—'}
                accent
              />
            </div>
          </Panel>
        </div>

        <div className="col-span-6">
          <div className="panel flex flex-col overflow-hidden h-full">
            <div className="panel-header flex items-center gap-2">
              <BrainIcon className="w-3.5 h-3.5 text-jarvis-cyan" />
              <span>The Global Brain</span>
              <div className="flex-1" />
              <button
                onClick={() =>
                  setDensityMode((m) => (m === 'signals' ? 'all' : 'signals'))
                }
                className="text-[10px] px-2 py-0.5 border border-jarvis-border rounded hover:border-jarvis-cyan/50 hover:text-jarvis-cyan transition-colors"
                title="Toggle between showing only high-signal events or all events"
              >
                {densityMode === 'signals' ? 'SIGNALS' : 'ALL EVENTS'}
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Orb
                strategies={data.book_strategies.items.map((s) => ({
                  key: s.key,
                  name: s.name,
                  status: s.source_status,
                }))}
                markets={(data.scanner.rows ?? []).map((m) => ({
                  id: m.market_id,
                  question: m.question,
                  change_24h: m.change_24h,
                }))}
                latestEvent={brainStream.latest}
                densityMode={densityMode}
                onHoverNode={handleHoverNode}
                onClickNode={handleClickNode}
              />
            </div>
          </div>
        </div>

        <div className="col-span-3 flex flex-col gap-4">
          <Panel title="Market Scanner" icon={Activity} className="flex-1">
            <div className="panel-body font-mono text-xs space-y-2">
              <Row label="Venue" value={data.scanner.venue ?? '—'} />
              <Row label="Markets" value={String(data.scanner.markets ?? 0)} />
              <Row
                label="Observed"
                value={
                  data.scanner.observed_at
                    ? new Date(data.scanner.observed_at).toLocaleTimeString()
                    : '—'
                }
              />
              <div className="pt-2 border-t border-jarvis-border">
                <p className="text-jarvis-textMuted text-[10px] uppercase tracking-wider mb-1">
                  Top Markets
                </p>
                {(data.scanner.rows ?? []).slice(0, 5).map((row) => (
                  <div
                    key={row.market_id}
                    className="py-1 border-b border-jarvis-gridline last:border-0"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="text-jarvis-text truncate flex-1">
                        {row.question}
                      </span>
                      <span className="text-jarvis-cyan shrink-0">
                        {(row.price * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        <div className="col-span-6">
          <Panel title="Strategy Library" icon={Zap}>
            <div className="panel-body grid grid-cols-3 gap-2">
              {data.book_strategies.items.slice(0, 9).map((s) => (
                <div
                  key={s.key}
                  className="p-2 border border-jarvis-border rounded bg-jarvis-bg/50"
                >
                  <div className="text-jarvis-cyan text-xs font-mono truncate">
                    {s.name}
                  </div>
                  <div className="text-jarvis-textMuted text-[10px] mt-1">
                    {s.kind}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="col-span-6">
          <Panel title="Recent Activity" icon={Activity}>
            <div className="panel-body font-mono text-xs space-y-1">
              {data.activity.slice(0, 8).map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 py-1 border-b border-jarvis-gridline last:border-0"
                >
                  <span className="text-jarvis-textMuted w-20 shrink-0">
                    {new Date(a.at).toLocaleTimeString()}
                  </span>
                  <span className="text-jarvis-cyan w-20 shrink-0">{a.type}</span>
                  <span className="text-jarvis-text flex-1 truncate">{a.what}</span>
                  <span
                    className={
                      a.result === 'SUCCEEDED'
                        ? 'text-jarvis-green'
                        : 'text-jarvis-amber'
                    }
                  >
                    {a.result}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Overlays — rendered last so they sit above everything */}
      <Tooltip data={tooltip} />
      <DetailPanel item={selected} onClose={() => setSelected(null)} />
    </>
  )
}
