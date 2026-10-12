/**
 * Tooltip — a small floating card anchored to the mouse position.
 *
 * Rendered into a fixed-position container so it isn't clipped by any
 * parent's overflow. Content is supplied by the caller as React children.
 */

import { useEffect, useRef, useState } from 'react'

export interface TooltipData {
  /** Screen coordinates (pageX, pageY) where the tooltip should appear. */
  x: number
  y: number
  /** Content to render inside the tooltip. */
  content: React.ReactNode
}

interface TooltipProps {
  data: TooltipData | null
}

const OFFSET_X = 16  // px to the right of the cursor
const OFFSET_Y = 16  // px below the cursor

export default function Tooltip({ data }: TooltipProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [adjusted, setAdjusted] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  })

  // Adjust position so the tooltip never spills off-screen
  useEffect(() => {
    if (!data || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    let x = data.x + OFFSET_X
    let y = data.y + OFFSET_Y

    if (x + rect.width > vw - 8) x = data.x - rect.width - OFFSET_X
    if (y + rect.height > vh - 8) y = data.y - rect.height - OFFSET_Y

    setAdjusted({ x, y })
  }, [data])

  if (!data) return null

  return (
    <div
      ref={ref}
      className="fixed z-50 pointer-events-none"
      style={{
        left: adjusted.x || data.x + OFFSET_X,
        top: adjusted.y || data.y + OFFSET_Y,
        transition: 'left 60ms linear, top 60ms linear',
      }}
    >
      <div className="panel max-w-sm shadow-2xl border-jarvis-cyan/40">
        <div className="px-3 py-2 text-xs font-mono text-jarvis-text">
          {data.content}
        </div>
      </div>
    </div>
  )
}
