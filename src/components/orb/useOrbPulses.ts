/**
 * useOrbPulses — translates events from the brain stream into a list
 * of visual pulses that the Orb renders.
 *
 * Design:
 *  - Signal-weighted: COMMAND / MARKET_SCAN / trade events always pulse.
 *    Routine HEALTH_CHECK events only pulse in "show all" mode.
 *  - Coalesced: at most one pulse per 400ms, so bursts don't overwhelm.
 *  - Self-expiring: each pulse has a lifetime; a cleanup loop drops them.
 *
 * Pulses are pure data — the Orb is responsible for rendering them.
 */

import { useEffect, useRef, useState } from 'react'
import type { BrainEvent } from '../../api/useBrainStream'

export type PulseKind =
  | 'core-cyan'      // success / command
  | 'core-red'       // failure
  | 'ring-out'       // job succeeded — ring expanding outward
  | 'market-wave'    // market scan — wave through market ring
  | 'kill-red'       // kill switch — full orb tint

export interface OrbPulse {
  id: number
  kind: PulseKind
  /** Performance.now() at the moment the pulse started. */
  startedAt: number
  /** How long the pulse should live, in ms. */
  durationMs: number
  /** Optional label for debugging. */
  reason: string
}

export type DensityMode = 'signals' | 'all'

// Pulse lifetimes
const LIFETIMES: Record<PulseKind, number> = {
  'core-cyan':    500,
  'core-red':     700,
  'ring-out':     900,
  'market-wave':  1200,
  'kill-red':     2000,
}

// Coalescing window — no pulse may start within this many ms of the last
const COALESCE_MS = 400

// Events that ALWAYS pulse regardless of density mode
const SIGNAL_KINDS = new Set([
  'COMMAND',
  'MARKET_SCAN',
  'TRADE_OPENED',
  'TRADE_CLOSED',
  'KILL_SWITCH',
  'LIFECYCLE',
])

// Events that only pulse when densityMode === 'all'
const ALL_EVENTS_WHITELIST = new Set([
  'HERMES_JOB',
  'HERMES_CONTROL',
  'HERMES_SCHEDULE',
])

function classifyEvent(event: BrainEvent): PulseKind | null {
  const kind = event.kind
  const msg = (event.message || '').toUpperCase()

  // Kill switch takes priority
  if (kind === 'KILL_SWITCH' || msg.includes('KILL')) {
    return 'kill-red'
  }

  // Command → quick core flash
  if (kind === 'COMMAND') {
    return 'core-cyan'
  }

  // Market scan → wave through market ring
  if (kind === 'MARKET_SCAN' || msg.includes('MARKET_SCAN')) {
    return 'market-wave'
  }

  // Trade events → core pulse
  if (kind === 'TRADE_OPENED' || kind === 'TRADE_CLOSED') {
    return 'core-cyan'
  }

  // Hermes job: differentiate by phase
  if (kind === 'HERMES_JOB') {
    if (msg.includes('FAILED') || msg.includes('ERROR')) {
      return 'core-red'
    }
    if (msg.includes('SUCCEEDED')) {
      return 'ring-out'
    }
    if (msg.includes('RUNNING') || msg.includes('queued')) {
      // Subtle — just skip unless in "all" mode. The successes are what matter.
      return null
    }
  }

  // Lifecycle → gentle core
  if (kind === 'LIFECYCLE') {
    return 'core-cyan'
  }

  // Unknown: no pulse
  return null
}

export function useOrbPulses(
  latestEvent: BrainEvent | null,
  densityMode: DensityMode = 'signals',
): OrbPulse[] {
  const [pulses, setPulses] = useState<OrbPulse[]>([])
  const nextIdRef = useRef<number>(0)
  const lastPulseAtRef = useRef<number>(0)

  // Watch for new events and start pulses
  useEffect(() => {
    if (!latestEvent) return

    // Density filtering
    const isSignal = SIGNAL_KINDS.has(latestEvent.kind)
    const isWhitelisted = ALL_EVENTS_WHITELIST.has(latestEvent.kind)
    if (densityMode === 'signals' && !isSignal) return
    if (densityMode === 'all' && !isSignal && !isWhitelisted) return

    // Coalescing
    const now = performance.now()
    if (now - lastPulseAtRef.current < COALESCE_MS) return

    const kind = classifyEvent(latestEvent)
    if (!kind) return

    const pulse: OrbPulse = {
      id: nextIdRef.current++,
      kind,
      startedAt: now,
      durationMs: LIFETIMES[kind],
      reason: `${latestEvent.kind}: ${latestEvent.message}`,
    }

    lastPulseAtRef.current = now
    setPulses((prev) => [...prev, pulse])
  }, [latestEvent, densityMode])

  // Cleanup expired pulses
  useEffect(() => {
    let rafId = 0
    const tick = () => {
      const now = performance.now()
      setPulses((prev) => {
        const alive = prev.filter(
          (p) => now - p.startedAt < p.durationMs,
        )
        return alive.length === prev.length ? prev : alive
      })
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return pulses
}
