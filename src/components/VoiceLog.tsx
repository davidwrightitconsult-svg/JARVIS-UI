/**
 * VoiceLog — a floating panel showing recent voice interactions.
 *
 * Auto-dismisses after 6 seconds. Shows:
 *   - What was heard
 *   - What J.A.R.V.I.S. replied
 *   - Error states
 */

import { useEffect } from 'react'

export interface VoiceMessage {
  id: number
  kind: 'heard' | 'reply' | 'error'
  text: string
}

interface VoiceLogProps {
  messages: VoiceMessage[]
  onDismiss: () => void
}

export default function VoiceLog({ messages, onDismiss }: VoiceLogProps) {
  // Auto-dismiss 6 seconds after the last message
  useEffect(() => {
    if (messages.length === 0) return
    const timer = setTimeout(onDismiss, 6000)
    return () => clearTimeout(timer)
  }, [messages, onDismiss])

  if (messages.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md">
      <div className="panel border-jarvis-cyan/40 shadow-glow-cyan">
        <div className="panel-header text-jarvis-cyan text-[10px] uppercase tracking-widest">
          J.A.R.V.I.S. Voice
        </div>
        <div className="panel-body space-y-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`text-xs font-mono ${
                m.kind === 'error'
                  ? 'text-jarvis-red'
                  : m.kind === 'reply'
                    ? 'text-jarvis-cyan'
                    : 'text-jarvis-textDim italic'
              }`}
            >
              {m.kind === 'heard' && '🎤 '}
              {m.kind === 'reply' && '🤖 '}
              {m.kind === 'error' && '⚠️  '}
              {m.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
