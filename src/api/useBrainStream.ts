/**
 * useBrainStream — React hook that connects to the backend /ws/brain
 * WebSocket and exposes the live event stream.
 *
 * Features:
 *  - Auto-connects on mount, disconnects on unmount
 *  - Reconnects with exponential backoff on unexpected disconnect
 *  - Keeps a rolling buffer of recent events (default 50)
 *  - Exposes connection state and the latest event
 *
 * Design:
 *  - Native WebSocket API — no extra dependency
 *  - Backoff caps at 30s so a permanently-down backend doesn't hammer
 *  - The `hello` message is skipped from the event buffer
 */

import { useEffect, useRef, useState } from 'react'

export interface BrainEvent {
  event_id: string
  ts: string
  kind: string
  message: string
  source: string
  component: string
  severity: string
  correlation_id: string
  payload: string // JSON-encoded string from backend
}

export type ConnectionState = 'connecting' | 'open' | 'reconnecting' | 'closed'

export interface BrainStream {
  state: ConnectionState
  events: BrainEvent[]
  latest: BrainEvent | null
  /** Total events received since the hook mounted */
  count: number
}

// Rolling buffer size
const MAX_EVENTS = 50

// Backoff: 1s, 2s, 4s, 8s, 16s, 30s, 30s...
const BACKOFF_START_MS = 1000
const BACKOFF_MAX_MS = 30000

function getWebSocketUrl(): string {
  // Use the same host as the page; Vite proxies /ws to the backend.
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws/brain`
}

export function useBrainStream(): BrainStream {
  const [state, setState] = useState<ConnectionState>('connecting')
  const [events, setEvents] = useState<BrainEvent[]>([])
  const [latest, setLatest] = useState<BrainEvent | null>(null)
  const [count, setCount] = useState(0)

  // Refs so the reconnect loop can access fresh state without re-running
  const wsRef = useRef<WebSocket | null>(null)
  const backoffRef = useRef<number>(BACKOFF_START_MS)
  const reconnectTimerRef = useRef<number | null>(null)
  const unmountedRef = useRef<boolean>(false)

  useEffect(() => {
    unmountedRef.current = false

    const connect = () => {
      if (unmountedRef.current) return

      const url = getWebSocketUrl()
      console.log('[useBrainStream] Connecting to', url)
      setState((prev) => (prev === 'open' ? 'reconnecting' : 'connecting'))

      let ws: WebSocket
      try {
        ws = new WebSocket(url)
      } catch (err) {
        console.error('[useBrainStream] Failed to create WebSocket:', err)
        scheduleReconnect()
        return
      }
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[useBrainStream] Connected')
        setState('open')
        backoffRef.current = BACKOFF_START_MS
      }

      ws.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data)

          // Skip the hello message
          if (parsed.type === 'hello') {
            console.log('[useBrainStream] Server hello:', parsed)
            return
          }

          const event = parsed as BrainEvent
          console.log('[useBrainStream] Event:', event.kind, event.message)
          setLatest(event)
          setCount((c) => c + 1)
          setEvents((prev) => {
            const next = [event, ...prev]
            return next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next
          })
        } catch (err) {
          console.warn('[useBrainStream] Failed to parse message:', err)
        }
      }

      ws.onerror = (err) => {
        console.warn('[useBrainStream] WebSocket error:', err)
      }

      ws.onclose = (evt) => {
        console.log('[useBrainStream] Closed:', evt.code, evt.reason)
        wsRef.current = null
        if (!unmountedRef.current) {
          setState('reconnecting')
          scheduleReconnect()
        }
      }
    }

    const scheduleReconnect = () => {
      if (unmountedRef.current) return
      const delay = backoffRef.current
      console.log(`[useBrainStream] Reconnecting in ${delay}ms`)
      reconnectTimerRef.current = window.setTimeout(() => {
        backoffRef.current = Math.min(backoffRef.current * 2, BACKOFF_MAX_MS)
        connect()
      }, delay)
    }

    connect()

    return () => {
      unmountedRef.current = true
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
      setState('closed')
    }
  }, [])

  return { state, events, latest, count }
}
