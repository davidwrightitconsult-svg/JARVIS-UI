/**
 * DetailPanel — a slide-in panel from the right showing the full
 * details of a selected strategy or market node.
 *
 * Rendered at the App level so it can overlay the full dashboard.
 */

import { X } from 'lucide-react'
import type { StrategyDefinition } from '../api/client'

export interface MarketDetail {
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

export type SelectedItem =
  | { kind: 'strategy'; data: StrategyDefinition }
  | { kind: 'market'; data: MarketDetail }

interface DetailPanelProps {
  item: SelectedItem | null
  onClose: () => void
}

export default function DetailPanel({ item, onClose }: DetailPanelProps) {
  if (item === null) return null

  return (
    <div
      className="fixed top-14 right-0 bottom-0 z-40 w-[420px] panel border-l border-jarvis-cyan/30 flex flex-col"
      style={{
        animation: 'panel-slide-in 220ms ease-out',
      }}
    >
      <div className="panel-header flex items-center gap-2">
        <span className="text-jarvis-cyan font-mono text-sm">
          {item.kind === 'strategy' ? item.data.name : 'Market'}
        </span>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="w-6 h-6 rounded flex items-center justify-center text-jarvis-textDim hover:text-jarvis-red hover:bg-jarvis-red/10 transition-colors"
          title="Close (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
        {item.kind === 'strategy' ? (
          <StrategyDetailBody data={item.data} />
        ) : (
          <MarketDetailBody data={item.data} />
        )}
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-jarvis-textMuted text-[10px] uppercase tracking-wider mb-2">
        {title}
      </div>
      <div className="text-jarvis-text space-y-1">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-jarvis-textMuted">{label}</span>
      <span className="text-jarvis-text text-right">{value}</span>
    </div>
  )
}

function StrategyDetailBody({ data }: { data: StrategyDefinition }) {
  const statusColor =
    data.status === 'VERIFIED' || data.status === 'APPROVED'
      ? 'text-jarvis-green'
      : data.status === 'FAILED' || data.status === 'REJECTED'
        ? 'text-jarvis-red'
        : data.status === 'FORWARD_TEST'
          ? 'text-jarvis-purple'
          : 'text-jarvis-cyan'

  return (
    <>
      <Section title="Definition">
        <p className="leading-relaxed text-jarvis-text/90">{data.rule}</p>
      </Section>

      <Section title="Source">
        {data.books && data.books.length > 0 && (
          <p className="text-jarvis-textDim italic">
            {data.books.join(' · ')}
          </p>
        )}
        <p className="text-jarvis-textMuted mt-1">{data.source}</p>
      </Section>

      {data.adaptation && data.adaptation !== 'None' && (
        <Section title="Adaptation">
          <p className="text-jarvis-textDim">{data.adaptation}</p>
        </Section>
      )}

      <Section title="Parameters">
        {Object.entries(data.params).map(([k, v]) => (
          <Row key={k} label={k} value={String(v)} />
        ))}
      </Section>

      <Section title="Exit Rules">
        {data.exit.stop !== null && (
          <Row label="stop" value={data.exit.stop} />
        )}
        {data.exit.target !== null && (
          <Row label="target" value={data.exit.target} />
        )}
        {data.exit.max_hold !== null && (
          <Row label="max_hold" value={`${data.exit.max_hold}h`} />
        )}
        {data.exit.rule && <Row label="rule" value={data.exit.rule} />}
      </Section>

      <Section title="Status">
        <span className={statusColor}>● {data.status}</span>
      </Section>

      <Section title="Actions">
        <button
          disabled
          className="w-full px-3 py-2 rounded border border-jarvis-border text-jarvis-textMuted cursor-not-allowed text-left"
          title="Activation is gated by the Risk Governor"
        >
          Activate for paper trading
        </button>
        <p className="text-jarvis-textMuted text-[10px] mt-2 leading-relaxed">
          The Risk Governor gates activation. No strategy is currently approved.
        </p>
      </Section>
    </>
  )
}

function MarketDetailBody({ data }: { data: MarketDetail }) {
  const changeColor =
    data.change_24h === null
      ? 'text-jarvis-textMuted'
      : data.change_24h > 0
        ? 'text-jarvis-green'
        : data.change_24h < 0
          ? 'text-jarvis-red'
          : 'text-jarvis-text'

  return (
    <>
      <Section title="Market">
        <p className="leading-relaxed text-jarvis-text/90">
          {data.question}
        </p>
        <p className="text-jarvis-textMuted text-[10px] mt-1">
          Outcome: {data.outcome} · ID: {data.market_id}
        </p>
      </Section>

      <Section title="Pricing">
        <Row label="Price" value={`${(data.price * 100).toFixed(1)}%`} />
        <Row
          label="24h Change"
          value={
            <span className={changeColor}>
              {data.change_24h === null
                ? '—'
                : `${(data.change_24h * 100).toFixed(2)}%`}
            </span>
          }
        />
        <Row
          label="Volume (24h)"
          value={`$${data.volume_24h.toLocaleString()}`}
        />
      </Section>

      <Section title="Signals">
        {data.signals.length === 0 ? (
          <span className="text-jarvis-textMuted">No active signals</span>
        ) : (
          data.signals.map((s) => (
            <div key={s} className="text-jarvis-cyan">
              ● {s}
            </div>
          ))
        )}
      </Section>

      <Section title="Decision">
        <Row label="Decision" value={data.decision} />
        <Row label="Edge status" value={data.edge_status} />
      </Section>
    </>
  )
}
