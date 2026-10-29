/**
 * TopBar — the persistent header showing J.A.R.V.I.S. branding,
 * stream status, mode, system status, and timestamp.
 *
 * Extracted from App.tsx during Phase 8d (router refactor).
 */
import VoiceButton from './VoiceButton'
import { StatusDot } from './ui/shared'
import type { DashboardResponse } from '../api/client'

export default function TopBar({
  data,
  streamState,
  eventCount,
  voiceListening,
  voiceSupported,
  onVoiceStart,
  onVoiceStop,
}: {
  data: DashboardResponse | null
  streamState: string
  eventCount: number
  voiceListening: boolean
  voiceSupported: boolean
  onVoiceStart: () => void
  onVoiceStop: () => void
}) {
  const status = data?.system?.status ?? 'DISCONNECTED'
  const mode = data?.system?.mode ?? '—'
  const timestamp = data?.at ? new Date(data.at).toLocaleString() : '—'

  const streamColor =
    streamState === 'open'
      ? 'text-jarvis-green'
      : streamState === 'connecting' || streamState === 'reconnecting'
        ? 'text-jarvis-amber'
        : 'text-jarvis-red'

  const streamLabel =
    streamState === 'open'
      ? 'LIVE'
      : streamState === 'connecting'
        ? 'CONNECTING'
        : streamState === 'reconnecting'
          ? 'RECONNECTING'
          : 'OFFLINE'

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
          <span className="text-jarvis-textMuted">STREAM</span>
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${streamColor.replace('text-', 'bg-')} ${
                streamState === 'open' ? 'opacity-75 animate-ping' : ''
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${streamColor.replace('text-', 'bg-')}`}
            />
          </span>
          <span className={streamColor}>{streamLabel}</span>
          <span className="text-jarvis-textDim">({eventCount})</span>
        </div>
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
        <VoiceButton
          listening={voiceListening}
          supported={voiceSupported}
          onStart={onVoiceStart}
          onStop={onVoiceStop}
        />
      </div>
    </header>
  )
}
