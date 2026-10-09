/**
 * JARVIS API client.
 *
 * All requests go through `/api/*` and are proxied by Vite to the
 * JARVIS backend at http://127.0.0.1:8000 (see vite.config.ts).
 * This avoids CORS and keeps the frontend code environment-agnostic.
 */

import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
  },
})

export interface DashboardResponse {
  at: string
  system: {
    status: string
    name: string
    mode: string
    execution_locked: boolean
    components: Record<string, string>
    timestamp: string
    last_error: string | null
    live_execution: boolean
    claude: boolean
    hermes: string
  }
  scanner: {
    venue?: string
    markets?: number
    observed_at?: string
    rows?: ScannerRow[]
    error?: string
  }
  gate: {
    gate_version?: string
    strategies?: GateStrategy[]
    approved_for_paper?: string[]
    forward_test?: string[]
    not_approved?: string[]
    live_approved?: string[]
    summary?: string
    note?: string
    execution_locked?: boolean
  }
  risk: {
    risk_version?: string
    settings?: Record<string, number>
    kill_switch?: { engaged: boolean }
    drawdown_halt?: { engaged: boolean }
    portfolio?: { equity: number; peak_equity: number; day_start_equity: number; exposure: number; open_markets: number }
    live_trading?: string
    execution_locked?: boolean
  }
  portfolio: {
    ledger_version?: string
    mode?: string
    bankroll?: number
    equity?: number
    cash?: number
    at_risk?: number
    total_pnl?: number
    total_return?: number
    daily_pnl?: number
    peak_equity?: number
    drawdown?: number
    max_drawdown?: number
    open_positions?: number
    closed_trades?: number
    win_rate?: number | null
    best_trade?: number | null
    worst_trade?: number | null
    equity_days?: { day: string; start_equity: number; end_equity: number }[]
    positions?: Position[]
    closed?: unknown[]
    live_trading?: string
    execution_locked?: boolean
  }
  activity: ActivityItem[]
  paper: Record<string, unknown>
  library: Record<string, unknown>
  book_strategies: {
    registered: number
    tested: number
    names: string[]
    items: BookStrategyItem[]
    note: string
  }
  live_trading: string
  execution_locked: boolean
}

export interface ScannerRow {
  market_id: string
  question: string
  outcome: string
  price: number
  change_24h: number | null
  volume_24h: number
  decision: string
  signals: string[]
  edge_status: string
}

export interface GateStrategy {
  strategy: string
  status: string
  reason: string
  evidence?: Record<string, unknown>
}

export interface Position {
  id: number
  label: string
  entry_price: number
  stake: number
  current_price?: number
  pnl?: number
}

export interface ActivityItem {
  at: string
  type: string
  what: string
  result: string
}

export interface BookStrategyItem {
  name: string
  key: string
  kind: string
  source: string
  source_status: string
}

export interface VersionResponse {
  name: string
  version: string
  phase: string
}

export interface HealthResponse {
  status: string
  name: string
  mode: string
  execution_locked: boolean
  components: Record<string, string>
  timestamp: string
  last_error: string | null
  live_execution: boolean
  claude: boolean
  hermes: string
}

export async function getVersion(): Promise<VersionResponse> {
  const { data } = await api.get<VersionResponse>('/version')
  return data
}

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>('/health')
  return data
}

export async function getDashboard(): Promise<DashboardResponse> {
  const { data } = await api.get<DashboardResponse>('/dashboard')
  return data
}
