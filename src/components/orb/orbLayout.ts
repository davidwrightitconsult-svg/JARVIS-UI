/**
 * Orb layout: pure TypeScript math for positioning nodes on three
 * concentric shells. No Three.js, no WebGL — just spherical math.
 *
 * Each node carries:
 *   - 3D unit position (used to compute screen x/y + depth)
 *   - color + size + label for rendering
 *   - drift parameters for animation
 */

export type ShellKind = 'strategy' | 'market' | 'ambient'

export interface OrbNode {
  id: string
  shell: ShellKind
  /** Unit vector position on the sphere (before scaling by radius) */
  ux: number
  uy: number
  uz: number
  /** Shell radius in "units" (converted to pixels by the renderer) */
  radius: number
  label: string
  status: string
  color: string
  /** Diameter in pixels */
  diameter: number
  /** Glow radius in pixels */
  glow: number
  driftPhase: number
  driftSpeed: number
}

export interface OrbSource {
  strategies: { key: string; name: string; status: string }[]
  markets: { id: string; question: string; change_24h: number | null }[]
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

/** Fibonacci-distributed unit vector at index i of n. */
function fibUnit(i: number, n: number): { ux: number; uy: number; uz: number } {
  const y = 1 - (2 * (i + 0.5)) / n
  const r = Math.sqrt(Math.max(0, 1 - y * y))
  const theta = GOLDEN_ANGLE * i
  return {
    ux: Math.cos(theta) * r,
    uy: y,
    uz: Math.sin(theta) * r,
  }
}

/**
 * A point randomly distributed INSIDE a sphere volume.
 * Used for the ambient shells so the orb looks solid from every angle.
 * Returns a unit-space position where |p| <= 1.
 */
function volumePoint(): { ux: number; uy: number; uz: number } {
  while (true) {
    const x = Math.random() * 2 - 1
    const y = Math.random() * 2 - 1
    const z = Math.random() * 2 - 1
    const len2 = x * x + y * y + z * z
    if (len2 <= 1 && len2 > 0) {
      return { ux: x, uy: y, uz: z }
    }
  }
}

function strategyColor(status: string): string {
  switch (status) {
    case 'VERIFIED':
    case 'APPROVED':
    case 'SUCCEEDED':
      return '#10b981'  // green
    case 'FAILED':
    case 'REJECTED':
      return '#ef4444'  // red
    case 'TESTING':
    case 'PROCESSING':
    case 'FORWARD_TEST':
      return '#a855f7'  // purple
    case 'NOT_VERIFIED':
    default:
      return '#22d3ee'  // cyan
  }
}

function marketColor(change: number | null): string {
  if (change === null) return '#f59e0b'     // amber - "watching"
  if (change > 0.005) return '#10b981'      // green - "bullish"
  if (change < -0.005) return '#ef4444'     // red - "bearish"
  return '#fbbf24'                          // light amber - "flat"
}

/**
 * Build the complete set of nodes for the orb.
 *
 * Shell radii (in layout units — the renderer multiplies by a scale):
 *   strategy: 1.0  (inner)
 *   market:   1.7  (middle)
 *   ambient:  2.6  (outer)
 */
export function buildOrbNodes(source: OrbSource): OrbNode[] {
  const nodes: OrbNode[] = []

  // ---- Strategy shell ----
  const strategyRadius = 1.0
  const nStrat = source.strategies.length
  source.strategies.forEach((s, i) => {
    const { ux, uy, uz } = fibUnit(i, nStrat)
    nodes.push({
      id: `s-${i}`,
      shell: 'strategy',
      ux, uy, uz,
      radius: strategyRadius,
      label: s.name,
      status: s.status,
      color: strategyColor(s.status),
      diameter: 10,
      glow: 24,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.3 + Math.random() * 0.2,
    })
  })

  // ---- Market shell ----
  const marketRadius = 1.7
  const nMarket = Math.min(source.markets.length, 25)
  source.markets.slice(0, nMarket).forEach((m, i) => {
    const { ux, uy, uz } = fibUnit(i, nMarket)
    nodes.push({
      id: `m-${i}`,
      shell: 'market',
      ux, uy, uz,
      radius: marketRadius,
      label: m.question,
      status: 'MARKET',
      color: marketColor(m.change_24h),
      diameter: 7,
      glow: 16,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.4 + Math.random() * 0.3,
    })
  })

  // ---- Ambient shell ----
  const ambientOuterRadius = 2.6
  const nAmbientOuter = 100
  for (let i = 0; i < nAmbientOuter; i++) {
    const { ux, uy, uz } = volumePoint()
    nodes.push({
      id: `ao-${i}`,
      shell: 'ambient',
      ux, uy, uz,
      radius: ambientOuterRadius,
      label: '',
      status: 'AMBIENT',
      color: '#1e40af',
      diameter: 4,
      glow: 8,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.5 + Math.random() * 0.4,
    })
  }
  
  // ---- Inner ambient shell (fills the volume so it never looks flat) ----
  const ambientInnerRadius = 1.35
  const nAmbientInner = 60
  for (let i = 0; i < nAmbientInner; i++) {
    const { ux, uy, uz } = volumePoint()
    nodes.push({
      id: `ai-${i}`,
      shell: 'ambient',
      ux, uy, uz,
      radius: ambientInnerRadius,
      label: '',
      status: 'AMBIENT',
      color: '#0e7490',
      diameter: 3,
      glow: 6,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.6 + Math.random() * 0.4,
    })
  }


  return nodes
}
