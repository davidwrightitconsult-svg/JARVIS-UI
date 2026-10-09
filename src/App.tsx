import { useEffect, useState } from 'react'
import {
  Activity,
  BarChart3,
  BookOpen,
  Brain as BrainIcon,
  Home,
  LineChart,
  ScrollText,
  Settings as SettingsIcon,
  Shield,
  Zap,
} from 'lucide-react'
import { getDashboard, type DashboardResponse } from './api/client'
import { useBrainStream } from './api/useBrainStream'
import Orb from './components/Orb'
function StatusDot({ status }: { status: string }) {
  const color =
    status === 'HEALTHY' || status === 'ONLINE'
      ? 'bg-jarvis-green'
      : status === 'DEGRADED'
      ? 'bg-jarvis-amber'
      : 'bg-jarvis-red'

  return (
    <span className="relative flex h-2 w-2">
      <span className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-75 animate-ping`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  )
}

function Sidebar() {
  const items = [
    { icon: Home, label: 'Home', active: true },
    { icon: LineChart, label: 'Markets' },
    { icon: Zap, label: 'Trades' },
    { icon: BrainIcon, label: 'Strategies' },
    { icon: ScrollText, label: 'Research' },
    { icon: BookOpen, label: 'Library' },
    { icon: SettingsIcon, label: 'Settings' },
  ]

  return (
    <aside className="w-16 bg-jarvis-panel border-r border-jarvis-border flex flex-col items-center py-4 gap-1">
      <div className="mb-6">
        <div className="w-10 h-10 rounded-lg bg-jarvis-bg border border-jarvis-cyan/30 flex items-center justify-center shadow-glow-sm">
          <BrainIcon className="w-5 h-5 text-jarvis-cyan" />
        </div>
      </div>
      {items.map((item, idx) => (
        <button
          key={idx}
          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-colors ${
            item.active
              ? 'bg-jarvis-cyan/10 text-jarvis-cyan border border-jarvis-cyan/30'
              : 'text-jarvis-textDim hover:text-jarvis-cyan hover:bg-jarvis-cyan/5'
          }`}
          title={item.label}
        >
          <item.icon className="w-5 h-5" />
        </button>
      ))}
    </aside>
  )
}

function TopBar({ data }: { data: DashboardResponse | null }) {
  const status = data?.system?.status ?? 'DISCONNECTED'
  const mode = data?.system?.mode ?? '—'
  const timestamp = data?.at ? new Date(data.at).toLocaleString() : '—'

  return (
    <header className="h-14 bg-jarvis-panel border-b border-jarvis-border flex items-center px-6 gap-6">
      <div className="flex items-center gap-3">
        <span className="font-mono text-jarvis-cyan text-lg font-bold tracking-widest">
          J.A.R.V.I.S.
        </span>
        <span className="text-jarvis-textMuted text-xs font-mono">
          Autonomous Trading Platform
        </span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-6 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-jarvis-textMuted">MODE</span>
          <span className="text-jarvis-cyan">{mode}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-jarvis-textMuted">STATUS</span>
          <StatusDot status={status} />
          <span className="text-jarvis-text">{status}</span>
        </div>
        <div className="text-jarvis-textDim">{timestamp}</div>
      </div>
    </header>
  )
}

function Panel({
  title,
  icon: Icon,
  children,
  className = '',
}: {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`panel flex flex-col overflow-hidden ${className}`}>
      <div className="panel-header flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-jarvis-cyan" />}
        <span>{title}</span>
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}

function Row({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-jarvis-textMuted">{label}</span>
      <span className={accent ? 'text-jarvis-cyan font-bold' : 'text-jarvis-text'}>{value}</span>
    </div>
  )
}

function App() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const brainStream = useBrainStream()
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
    const interval = setInterval(fetchData, 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="h-screen w-screen flex flex-col bg-jarvis-bg text-jarvis-text overflow-hidden">
      <TopBar data={data} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex items-center justify-center h-full text-jarvis-cyan font-mono text-sm animate-pulse">
              Connecting to J.A.R.V.I.S. control plane…
            </div>
          )}

          {error && (
            <div className="panel max-w-lg mx-auto mt-12">
              <div className="panel-header text-jarvis-red">Connection Error</div>
              <div className="panel-body text-sm">
                <p className="text-jarvis-textDim mb-2">Could not reach the JARVIS backend.</p>
                <p className="font-mono text-xs text-jarvis-red">{error}</p>
              </div>
            </div>
          )}

          {data && (
            <div className="grid grid-cols-12 gap-4 h-full">
              <div className="col-span-3 flex flex-col gap-4">
                <Panel title="Portfolio Overview" icon={BarChart3}>
                  <div className="panel-body space-y-3 font-mono text-xs">
                    <Row label="Balance" value={`$${(data.portfolio.equity ?? 0).toFixed(2)}`} accent />
                    <Row label="Total P&L" value={`$${(data.portfolio.total_pnl ?? 0).toFixed(2)}`} />
                    <Row label="Daily P&L" value={`$${(data.portfolio.daily_pnl ?? 0).toFixed(2)}`} />
                    <Row label="Open Positions" value={String(data.portfolio.open_positions ?? 0)} />
                    <Row label="Closed Trades" value={String(data.portfolio.closed_trades ?? 0)} />
                    <Row label="Max Drawdown" value={`${((data.portfolio.max_drawdown ?? 0) * 100).toFixed(2)}%`} />
                  </div>
                </Panel>
                <Panel title="Risk" icon={Shield}>
                  <div className="panel-body space-y-3 font-mono text-xs">
                    <Row label="Kill Switch" value={data.risk.kill_switch?.engaged ? 'ENGAGED' : 'OFF'} />
                    <Row label="Drawdown Halt" value={data.risk.drawdown_halt?.engaged ? 'ENGAGED' : 'OFF'} />
                    <Row label="Live Trading" value={data.risk.live_trading ?? '—'} accent />
                  </div>
                </Panel>
              </div>

              <div className="col-span-6">
                <Panel title="The Global Brain" icon={BrainIcon} className="h-full">
                  <div className="w-full h-full">
                    <Orb
                      strategies={data.book_strategies.items.map((s) => ({
                        key: s.key,
                        name: s.name,
                        status: s.source_status,
                      }))}
                      markets={(data.scanner.rows ?? []).map((m) => ({
                        id : m.market_id,
                        question: m.question,
                        change_24h: m.change_24h,
                      }))}      
                    />
                  </div> 
                </Panel>
              </div>

              <div className="col-span-3 flex flex-col gap-4">
                <Panel title="Market Scanner" icon={Activity} className="flex-1">
                  <div className="panel-body font-mono text-xs space-y-2">
                    <Row label="Venue" value={data.scanner.venue ?? '—'} />
                    <Row label="Markets" value={String(data.scanner.markets ?? 0)} />
                    <Row label="Observed" value={data.scanner.observed_at ? new Date(data.scanner.observed_at).toLocaleTimeString() : '—'} />
                    <div className="pt-2 border-t border-jarvis-border">
                      <p className="text-jarvis-textMuted text-[10px] uppercase tracking-wider mb-1">Top Markets</p>
                      {(data.scanner.rows ?? []).slice(0, 5).map((row) => (
                        <div key={row.market_id} className="py-1 border-b border-jarvis-gridline last:border-0">
                          <div className="flex justify-between gap-2">
                            <span className="text-jarvis-text truncate flex-1">{row.question}</span>
                            <span className="text-jarvis-cyan shrink-0">{(row.price * 100).toFixed(1)}%</span>
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
                      <div key={s.key} className="p-2 border border-jarvis-border rounded bg-jarvis-bg/50">
                        <div className="text-jarvis-cyan text-xs font-mono truncate">{s.name}</div>
                        <div className="text-jarvis-textMuted text-[10px] mt-1">{s.kind}</div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>

              <div className="col-span-6">
                <Panel title="Recent Activity" icon={Activity}>
                  <div className="panel-body font-mono text-xs space-y-1">
                    {data.activity.slice(0, 8).map((a, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 border-b border-jarvis-gridline last:border-0">
                        <span className="text-jarvis-textMuted w-20 shrink-0">
                          {new Date(a.at).toLocaleTimeString()}
                        </span>
                        <span className="text-jarvis-cyan w-20 shrink-0">{a.type}</span>
                        <span className="text-jarvis-text flex-1 truncate">{a.what}</span>
                        <span className={a.result === 'SUCCEEDED' ? 'text-jarvis-green' : 'text-jarvis-amber'}>
                          {a.result}
                        </span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
