/**
 * HudRings — the decorative instrument-panel rings of the J.A.R.V.I.S.
 * orb visualization.
 *
 * This is a purely presentational SVG overlay. It renders:
 *   - An outer tick ring (60 ticks)
 *   - A middle tick ring (36 ticks)
 *   - An inner segmented dial (arcs)
 *   - 12 radiating spokes from the core outward
 *
 * Everything rotates at different speeds. No interactivity — the
 * interactive nodes (strategy, market) are drawn separately by Orb.tsx
 * on top of this layer.
 */

import { useMemo } from 'react'

interface HudRingsProps {
  size: number
}

// Ring radii as fractions of the outer size
const R_OUTER = 0.44    // outer tick ring
const R_MIDDLE = 0.36   // middle tick ring
const R_INNER = 0.26    // inner segmented dial
const R_CORE = 0.10     // core boundary

// Tick counts
const N_OUTER_TICKS = 60
const N_MIDDLE_TICKS = 36
const N_SPOKES = 12

export default function HudRings({ size }: HudRingsProps) {
  const center = size / 2

  // Precompute tick positions — they never change, so useMemo them
  const outerTicks = useMemo(
    () => buildTicks(center, size, N_OUTER_TICKS, R_OUTER, 0.025, 0.045),
    [center, size],
  )
  const middleTicks = useMemo(
    () => buildTicks(center, size, N_MIDDLE_TICKS, R_MIDDLE, 0.015, 0.030),
    [center, size],
  )
  const spokes = useMemo(
    () => buildSpokes(center, size, N_SPOKES, R_CORE, R_OUTER),
    [center, size],
  )
  const innerArcs = useMemo(
    () => buildInnerArcs(center, size, R_INNER),
    [center, size],
  )

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="absolute inset-0 pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      {/* ---- Radiating spokes (behind everything) ---- */}
      <g>
        {spokes.map((s, i) => (
          <line
            key={`spoke-${i}`}
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            stroke="#0891b2"
            strokeWidth={0.5}
            opacity={0.25}
          />
        ))}
      </g>

      {/* ---- Outer tick ring ---- */}
      <g style={{ transformOrigin: `${center}px ${center}px` }}>
        {outerTicks.map((t, i) => (
          <line
            key={`outer-${i}`}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="#1e40af"
            strokeWidth={1.2}
            strokeLinecap="round"
            opacity={0.7}
          />
        ))}
      </g>

      {/* ---- Middle tick ring ---- */}
      <g style={{ transformOrigin: `${center}px ${center}px` }}>
        {middleTicks.map((t, i) => (
          <line
            key={`middle-${i}`}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="#0891b2"
            strokeWidth={1}
            strokeLinecap="round"
            opacity={0.8}
          />
        ))}
      </g>

      {/* ---- Inner segmented dial ---- */}
      <g style={{ transformOrigin: `${center}px ${center}px` }}>
        {innerArcs.map((arc, i) => (
          <path
            key={`arc-${i}`}
            d={arc.d}
            stroke="#22d3ee"
            strokeWidth={2.2}
            fill="none"
            strokeLinecap="round"
            opacity={0.55}
          />
        ))}
      </g>

      {/* ---- Thin inner circle boundary ---- */}
      <circle
        cx={center}
        cy={center}
        r={size * R_INNER}
        stroke="#22d3ee"
        strokeWidth={0.5}
        fill="none"
        opacity={0.35}
      />

      {/* ---- Middle ring boundary ---- */}
      <circle
        cx={center}
        cy={center}
        r={size * R_MIDDLE}
        stroke="#0891b2"
        strokeWidth={0.5}
        fill="none"
        opacity={0.3}
      />

      {/* ---- Outer ring boundary ---- */}
      <circle
        cx={center}
        cy={center}
        r={size * R_OUTER}
        stroke="#1e40af"
        strokeWidth={0.5}
        fill="none"
        opacity={0.4}
      />
    </svg>
  )
}

// ---- Geometry helpers ----

interface Tick {
  x1: number
  y1: number
  x2: number
  y2: number
}

function buildTicks(
  center: number,
  size: number,
  count: number,
  radiusFraction: number,
  innerOffset: number,
  lengthFraction: number,
): Tick[] {
  const radius = size * radiusFraction
  const ticks: Tick[] = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const r1 = radius - size * innerOffset
    const r2 = r1 - size * lengthFraction
    ticks.push({
      x1: center + cos * r1,
      y1: center + sin * r1,
      x2: center + cos * r2,
      y2: center + sin * r2,
    })
  }
  return ticks
}

interface Spoke {
  x1: number
  y1: number
  x2: number
  y2: number
}

function buildSpokes(
  center: number,
  size: number,
  count: number,
  innerFraction: number,
  outerFraction: number,
): Spoke[] {
  const r1 = size * innerFraction
  const r2 = size * outerFraction
  const spokes: Spoke[] = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    spokes.push({
      x1: center + cos * r1,
      y1: center + sin * r1,
      x2: center + cos * r2,
      y2: center + sin * r2,
    })
  }
  return spokes
}

interface Arc {
  d: string
}

function buildInnerArcs(
  center: number,
  size: number,
  radiusFraction: number,
): Arc[] {
  const radius = size * radiusFraction
  const arcs: Arc[] = []
  // 6 arc segments evenly spaced, each ~40 degrees
  const segments = 6
  const gap = Math.PI / 12  // ~15 deg gap
  const arcLength = (Math.PI * 2) / segments - gap

  for (let i = 0; i < segments; i++) {
    const startAngle = (i / segments) * Math.PI * 2 + gap / 2
    const endAngle = startAngle + arcLength
    const x1 = center + Math.cos(startAngle) * radius
    const y1 = center + Math.sin(startAngle) * radius
    const x2 = center + Math.cos(endAngle) * radius
    const y2 = center + Math.sin(endAngle) * radius
    const largeArc = arcLength > Math.PI ? 1 : 0
    arcs.push({
      d: `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
    })
  }
  return arcs
}
