/**
 * Settings — system state + component health + Hermes control.
 *
 * Data sources: /api/state, /api/hermes/status, /api/risk/status
 */

import { useEffect, useState } from 'react'
import { Activity, Settings as SettingsIcon, Shield } from 'lucide-react'
import { Panel, Row, StatusDot } from '../components/ui/shared'
import { api } from '../api/client'

interface StateResponse {
  status: string
  mode: string
  execution_locked: boolean
  started_at: string | null
  stopped_at: string | null
  last_command: string | null
  last_command_source: string | null
  last_error: string | null
  components: Record<string, string>
}

interface HermesResponse {
  state: string
  kill_reason: string | null
  runtime: {
    worker_running: boolean
    pending: number
    budget: {
      daily_limit: number
      used: number
      remaining: number
      calls: number
    }
    execution_authorized: boolean
  }
  schedules: {
    name: string
    job_type: string
    interval_seconds: number
    enabled: boolean
    runs: number
    due_in_seconds: number
  }[]
}

interface RiskStatus {
  settings: Record<string, number>
  kill_switch: { engaged: boolean }
  drawdown_halt: { engaged: boolean }
  portfolio: {
    equity: number
    peak_equity: number
    day_start_equity: number
    exposure: number
    open_markets: number
  }
  live_trading: string
  execution_locked: boolean
}

function statusColor(status: string): 'green' | 'amber' | 'red' {
  if (status === 'ONLINE' || status === 'READY' || status === 'OK' || status === 'RUNNING')
    return 'green'
  if (status === 'DISABLED' || status === 'LOCKED') return 'amber'
  return 'red'
}

export default function Settings() {
  const [state, setState] = useState<StateResponse | null>(null)
  const [hermes, setHermes] = useState<HermesResponse | null>(null)
  const [risk, setRisk] = useState<RiskStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [s, h, r] = await Promise.all([
          api.get<StateResponse>('/state'),
          api.get<HermesResponse>('/hermes/status'),
          api.get<RiskStatus>('/risk/status'),
        ])
        if (!cancelled) {
          setState(s.data)
          setHermes(h.data)
          setRisk(r.data)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-jarvis-cyan font-mono text-sm animate-pulse">
        Loading system settings…
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

  if (!state || !hermes || !risk) return null

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-4">
          <Panel title="System State" icon={SettingsIcon}>
            <div className="panel-body space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-jarvis-textDim">Status</span>
                <span className="flex items-center gap-2">
                  <StatusDot status={state.status} />
                  <span className="text-jarvis-text">{state.status}</span>
                </span>
              </div>
              <Row label="Mode" value={state.mode} accent />
              <Row
                label="Execution"
                value={state.execution_locked ? 'LOCKED' : 'UNLOCKED'}
              />
              <Row
                label="Started"
                value={
                  state.started_at
                    ? new Date(state.started_at).toLocaleString()
                    : '—'
                }
              />
              <Row
                label="Last Error"
                value={state.last_error ?? 'none'}
              />
            </div>
          </Panel>
        </div>

        <div className="col-span-4">
          <Panel title="Hermes Scheduler" icon={Activity}>
            <div className="panel-body space-y-2 font-mono text-xs">
              <Row label="State" value={hermes.state} accent />
              <Row
                label="Worker"
                value={hermes.runtime.worker_running ? 'RUNNING' : 'STOPPED'}
              />
              <Row label="Pending Jobs" value={String(hermes.runtime.pending)} />
              <Row
                label="Budget Used"
                value={`${hermes.runtime.budget.used.toLocaleString()} / ${hermes.runtime.budget.daily_limit.toLocaleString()}`}
              />
              <Row
                label="Budget Left"
                value={hermes.runtime.budget.remaining.toLocaleString()}
              />
              <Row label="Calls" value={String(hermes.runtime.budget.calls)} />
            </div>
          </Panel>
        </div>

        <div className="col-span-4">
          <Panel title="Risk Governor" icon={Shield}>
            <div className="panel-body space-y-2 font-mono text-xs">
              <Row
                label="Kill Switch"
                value={risk.kill_switch.engaged ? 'ENGAGED' : 'OFF'}
              />
              <Row
                label="Drawdown Halt"
                value={risk.drawdown_halt.engaged ? 'ENGAGED' : 'OFF'}
              />
              <Row label="Live Trading" value={risk.live_trading} accent />
              <Row
                label="Equity"
                value={`$${risk.portfolio.equity.toFixed(2)}`}
              />
              <Row
                label="Exposure"
                value={`$${risk.portfolio.exposure.toFixed(2)}`}
              />
              <Row
                label="Open Markets"
                value={String(risk.portfolio.open_markets)}
              />
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="Components" icon={Activity} className="flex-1">
        <div className="panel-body grid grid-cols-3 gap-2">
          {Object.entries(state.components).map(([name, status]) => {
            const color = statusColor(status)
            const dotBg =
              color === 'green'
                ? 'bg-jarvis-green'
                : color === 'amber'
                  ? 'bg-jarvis-amber'
                  : 'bg-jarvis-red'
            return (
              <div
                key={name}
                className="flex items-center justify-between px-3 py-2 border border-jarvis-border rounded"
              >
                <span className="text-jarvis-text font-mono text-xs">
                  {name}
                </span>
                <span className="flex items-center gap-2">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotBg}`} />
                  <span className="text-jarvis-textDim font-mono text-[10px]">
                    {status}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </Panel>

      {hermes.schedules.length > 0 && (
        <Panel title="Schedules">
          <div className="panel-body">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-jarvis-textMuted text-[10px] uppercase tracking-wider border-b border-jarvis-border">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Job Type</th>
                  <th className="text-right py-2">Interval</th>
                  <th className="text-right py-2">Runs</th>
                  <th className="text-right py-2">Due In</th>
                </tr>
              </thead>
              <tbody>
                {hermes.schedules.map((s) => (
                  <tr key={s.name} className="border-b border-jarvis-gridline last:border-0">
                    <td className="py-2 text-jarvis-cyan">{s.name}</td>
                    <td className="py-2 text-jarvis-textDim">{s.job_type}</td>
                    <td className="py-2 text-right text-jarvis-textDim">
                      {Math.round(s.interval_seconds)}s
                    </td>
                    <td className="py-2 text-right text-jarvis-textDim">{s.runs}</td>
                    <td className="py-2 text-right text-jarvis-textDim">
                      {s.due_in_seconds.toFixed(1)}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  )
}
