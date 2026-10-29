/**
 * VoiceButton — the microphone button in the TopBar.
 *
 * Click to start listening. Click again to stop.
 * While listening, pulses cyan.
 * If unsupported, disabled with a tooltip.
 */

import { Mic, MicOff } from 'lucide-react'

interface VoiceButtonProps {
  listening: boolean
  supported: boolean
  onStart: () => void
  onStop: () => void
}

export default function VoiceButton({
  listening,
  supported,
  onStart,
  onStop,
}: VoiceButtonProps) {
  if (!supported) {
    return (
      <button
        disabled
        className="w-8 h-8 rounded-lg flex items-center justify-center text-jarvis-textMuted opacity-40 cursor-not-allowed"
        title="Voice requires Chrome, Edge, or Safari"
      >
        <MicOff className="w-4 h-4" />
      </button>
    )
  }

  return (
    <button
      onClick={listening ? onStop : onStart}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
        listening
          ? 'bg-jarvis-cyan/20 text-jarvis-cyan border border-jarvis-cyan/50 shadow-glow-cyan animate-pulse'
          : 'text-jarvis-textDim hover:text-jarvis-cyan hover:bg-jarvis-cyan/5'
      }`}
      title={listening ? 'Stop listening' : 'Speak to J.A.R.V.I.S.'}
    >
      <Mic className="w-4 h-4" />
    </button>
  )
}
