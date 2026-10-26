/**
 * Trades — paper trading history + open positions + equity curve.
 */

import { useEffect, useState } from 'react'
import { TrendingDown, TrendingUp, Zap } from 'lucide-react'
import { Panel, Row } from '../components/ui/shared'
import { api } from '../api/client'

interface PaperStrategy {
  strategy: string
  trades: number
  wins: number
  pnl: number
  staked: number
  avg_per_share: number
  avg_r: number
  avg_entry_spread: number
  exits: Record<string, number>
  days: number
  resting?: { placed: number; filled: number; expired: number; pending: number }
}

interface PaperResponse {
  paper_version: string
  mode: string
  strategies: PaperStrategy[]
  open: number
  closed: number
  refused: { reason: string; n: number }[]
  last_tick?: Record<string, unknown>
  forward_tests?: unknown[]
}

interface EquityDay {
  day: string
  start_equity: number
  end_equity: number
}

interface PortfolioResponse {
  equity: number
  cash: number
  bankroll: number
  total_pnl: number
  total_return: number
  daily_pnl: number
  peak_equity: number
  drawdown: number
  max_drawdown: number
  open_positions: number
  closed_trades: number
  win_rate: number | null
  best_trade: number | null
  worst_trade: number | null
  equity_days: EquityDay[]
}

export default function Trades() {
  const [paper, setPaper] = useState<PaperResponse | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [p, port] = await Promise.all([
          api.get<PaperResponse>('/paper'),
          api.get<PortfolioResponse>('/portfolio'),
        ])
        if (!cancelled) {
          setPaper(p.data)
          setPortfolio(port.data)
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
    load()
    const interval = setInterval(load, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-jarvis-cyan font-mono text-sm animate-pulse">
        Loading trades…
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

  if (!portfolio || !paper) return null

  const pnlColor =
    portfolio.total_pnl >= 0 ? 'text-jarvis-green' : 'text-jarvis-red'
  const PnlIcon = portfolio.total_pnl >= 0 ? TrendingUp : TrendingDown

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Top metrics */}
      <div className="grid grid-cols-5 gap-4">
        <MetricCard
          label="Equity"
          value={`$${portfolio.equity.toFixed(2)}`}
          accent
        />
        <MetricCard
          label="Total P&L"
          value={`$${portfolio.total_pnl.toFixed(2)}`}
          color={pnlColor}
        />
        <MetricCard
          label="Win Rate"
          value={
            portfolio.win_rate === null
              ? '—'
              : `${(portfolio.win_rate * 100).toFixed(1)}%`
          }
        />
        <MetricCard
          label="Best Trade"
          value={
            portfolio.best_trade === null
              ? '—'
              : `$${portfolio.best_trade.toFixed(2)}`
          }
          color="text-jarvis-green"
        />
        <MetricCard
          label="Worst Trade"
          value={
            portfolio.worst_trade === null
              ? '—'
              : `$${portfolio.worst_trade.toFixed(2)}`
          }
          color="text-jarvis-red"
        />
      </div>

      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left: Strategy performance */}
        <div className="col-span-7 flex flex-col gap-4">
          <Panel title="Strategy Performance" icon={Zap} className="flex-1">
            <div className="panel-body space-y-4">
              {paper.strategies.length === 0 ? (
                <div className="text-jarvis-textMuted text-xs font-mono text-center py-8">
                  No strategies have traded yet.
                </div>
              ) : (
                paper.strategies.map((s) => {
                  const winRate = s.trades > 0 ? s.wins / s.trades : 0
                  const pnlPositive = s.pnl >= 0
                  return (
                    <div
                      key={s.strategy}
                      className="border border-jarvis-border rounded p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-jarvis-cyan font-mono text-sm">
                          {s.strategy}
                        </span>
                        <span
                          className={`font-mono text-sm ${
                            pnlPositive ? 'text-jarvis-green' : 'text-jarvis-red'
                          }`}
                        >
                          {pnlPositive ? '+' : ''}${s.pnl.toFixed(2)}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                        <div>
                          <div className="text-jarvis-textMuted text-[10px]">
                            TRADES
                          </div>
                          <div className="text-jarvis-text">{s.trades}</div>
                        </div>
                        <div>
                          <div className="text-jarvis-textMuted text-[10px]">
                            WINS
                          </div>
                          <div className="text-jarvis-text">
                            {s.wins} ({(winRate * 100).toFixed(0)}%)
                          </div>
                        </div>
                        <div>
                          <div className="text-jarvis-textMuted text-[10px]">
                            AVG R
                          </div>
                          <div
                            className={
                              s.avg_r >= 0 ? 'text-jarvis-green' : 'text-jarvis-red'
                            }
                          >
                            {s.avg_r.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-jarvis-textMuted text-[10px]">
                            DAYS
                          </div>
                          <div className="text-jarvis-text">{s.days}</div>
                        </div>
                      </div>
                      {s.exits && Object.keys(s.exits).length > 0 && (
                        <div className="flex gap-3 text-[10px] font-mono text-jarvis-textDim pt-1 border-t border-jarvis-gridline">
                          <span className="uppercase tracking-wider">Exits:</span>
                          {Object.entries(s.exits).map(([k, v]) => (
                            <span key={k}>
                              {k}={v}
                            </span>
                          ))}
                        </div>
                      )}
                      {s.resting && (
                        <div className="flex gap-3 text-[10px] font-mono text-jarvis-textDim">
                          <span className="uppercase tracking-wider">Resting:</span>
                          <span>placed={s.resting.placed}</span>
                          <span>filled={s.resting.filled}</span>
                          <span>expired={s.resting.expired}</span>
                          <span>pending={s.resting.pending}</span>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </Panel>

          {paper.refused.length > 0 && (
            <Panel title="Refused Orders">
              <div className="panel-body space-y-1 font-mono text-xs">
                {paper.refused.map((r, i) => (
                  <div
                    key={i}
                    className="flex justify-between py-1 border-b border-jarvis-gridline last:border-0"
                  >
                    <span className="text-jarvis-text truncate flex-1 mr-4">
                      {r.reason}
                    </span>
                    <span className="text-jarvis-amber shrink-0">×{r.n}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* Right: Portfolio + Equity curve */}
        <div className="col-span-5 flex flex-col gap-4">
          <Panel title="Portfolio">
            <div className="panel-body space-y-2 font-mono text-xs">
              <Row label="Bankroll" value={`$${portfolio.bankroll.toFixed(2)}`} />
              <Row
                label="Equity"
                value={`$${portfolio.equity.toFixed(2)}`}
                accent
              />
              <Row label="Cash" value={`$${portfolio.cash.toFixed(2)}`} />
              <Row
                label="Peak Equity"
                value={`$${portfolio.peak_equity.toFixed(2)}`}
              />
              <Row
                label="Drawdown"
                value={`${(portfolio.drawdown * 100).toFixed(2)}%`}
              />
              <Row
                label="Max Drawdown"
                value={`${(portfolio.max_drawdown * 100).toFixed(2)}%`}
              />
              <Row
                label="Total Return"
                value={`${(portfolio.total_return * 100).toFixed(2)}%`}
                accent
              />
            </div>
          </Panel>

          <Panel title="Equity Curve" className="flex-1">
            <div className="panel-body">
              {portfolio.equity_days.length === 0 ? (
                <div className="text-jarvis-textMuted text-xs font-mono text-center py-8">
                  No equity history yet.
                </div>
              ) : (
                <EquityCurve days={portfolio.equity_days} />
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  accent = false,
  color,
}: {
  label: string
  value: string
  accent?: boolean
  color?: string
}) {
  return (
    <div className="panel">
      <div className="panel-body">
        <div className="text-jarvis-textDim text-[10px] uppercase tracking-wider font-mono mb-1">
          {label}
        </div>
        <div
          className={`font-mono text-lg ${
            color ?? (accent ? 'text-jarvis-cyan' : 'text-jarvis-text')
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  )
}

function EquityCurve({ days }: { days: EquityDay[] }) {
  if (days.length === 0) return null
  const values = days.map((d) => d.end_equity)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const width = 300
  const height = 120
  const padding = 8
  const innerW = width - padding * 2
  const innerH = height - padding * 2

  const points = days.map((d, i) => {
    const x = padding + (i / Math.max(1, days.length - 1)) * innerW
    const y = padding + innerH - ((d.end_equity - min) / range) * innerH
    return `${x},${y}`
  })

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <line
        x1={padding}
        y1={padding + innerH}
        x2={width - padding}
        y2={padding + innerH}
        stroke="#1a2f4a"
        strokeWidth={1}
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="#22d3ee"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <text
        x={padding}
        y={height - 2}
        fill="#475569"
        fontSize={8}
        fontFamily="monospace"
      >
        {days[0]?.day}
      </text>
      <text
        x={width - padding}
        y={height - 2}
        textAnchor="end"
        fill="#475569"
        fontSize={8}
        fontFamily="monospace"
      >
        {days[days.length - 1]?.day}
      </text>
    </svg>
  )
}
