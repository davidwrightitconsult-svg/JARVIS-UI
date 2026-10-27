/**
 * Orb layout: pure TypeScript math for positioning nodes on three
 * concentric shells. No Three.js, no WebGL — just spherical math.
 *
 * Each node carries:
 *   - 3D unit position (used by Orb.tsx to compute screen x/y + depth)
 *   - hex color string
 *   - visual size + glow radius
 *   - drift parameters for organic motion
 *   - strategy identity for interactivity
 */

export type ShellKind = 'strategy' | 'market' | 'ambient'

export interface OrbNode {
  id: number
  shell: ShellKind
  /** Unit vector position on the sphere (before scaling by radius) */
  ux: number
  uy: number
  uz: number
  /** Shell radius in "layout units" (converted to pixels by Orb.tsx) */
  radius: number
  label: string
  status: string
  /** Hex color string, e.g. "#22d3ee" */
  color: string
  /** Diameter in pixels */
  diameter: number
  /** Glow radius in pixels */
  glow: number
  driftPhase: number
  driftSpeed: number
  /** For strategies: the strategy key. For markets: market_id. Empty for ambient. */
  strategyKey: string
  /** For strategies: the strategy name. For markets: the question. Empty for ambient. */
  strategyName: string
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

function strategyColor(status: string): string {
  switch (status) {
    case 'VERIFIED':
    case 'APPROVED':
    case 'SUCCEEDED':
      return '#10b981'
    case 'FAILED':
    case 'REJECTED':
      return '#ef4444'
    case 'TESTING':
    case 'PROCESSING':
    case 'FORWARD_TEST':
      return '#a855f7'
    case 'NOT_VERIFIED':
    default:
      return '#22d3ee'
  }
}

function marketColor(change: number | null): string {
  if (change === null) return '#64748b'
  if (change > 0.005) return '#10b981'
  if (change < -0.005) return '#ef4444'
  return '#f59e0b'
}

/**
 * Build the complete set of nodes for the orb.
 *
 * Shell radii (in layout units — Orb.tsx multiplies by PIXELS_PER_UNIT):
 *   strategy: 2.5  (inner)
 *   market:   4.5  (middle)
 *   ambient:  two shells at 6.5 (outer) and 1.35 (inner halo)
 */
export function buildOrbNodes(source: OrbSource): OrbNode[] {
  const nodes: OrbNode[] = []
  let id = 0

  // ---- Strategy shell ----
  const STRATEGY_RADIUS = 2.5
  const nStrat = source.strategies.length
  source.strategies.forEach((s, i) => {
    const { ux, uy, uz } = fibUnit(i, nStrat)
    nodes.push({
      id: id++,
      shell: 'strategy',
      ux,
      uy,
      uz,
      radius: STRATEGY_RADIUS,
      label: s.name,
      status: s.status,
      color: strategyColor(s.status),
      diameter: 10,
      glow: 24,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.3 + Math.random() * 0.2,
      strategyKey: s.key,
      strategyName: s.name,
    })
  })

  // ---- Market shell ----
  const MARKET_RADIUS = 4.5
  const nMarket = Math.min(source.markets.length, 25)
  source.markets.slice(0, nMarket).forEach((m, i) => {
    const { ux, uy, uz } = fibUnit(i, nMarket)
    nodes.push({
      id: id++,
      shell: 'market',
      ux,
      uy,
      uz,
      radius: MARKET_RADIUS,
      label: m.question,
      status: 'MARKET',
      color: marketColor(m.change_24h),
      diameter: 7,
      glow: 16,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.4 + Math.random() * 0.3,
      strategyKey: m.id,
      strategyName: m.question,
    })
  })

  // ---- Outer ambient shell ----
  const AMBIENT_OUTER_RADIUS = 6.5
  const N_AMBIENT_OUTER = 100
  for (let i = 0; i < N_AMBIENT_OUTER; i++) {
    const { ux, uy, uz } = fibUnit(i, N_AMBIENT_OUTER)
    nodes.push({
      id: id++,
      shell: 'ambient',
      ux,
      uy,
      uz,
      radius: AMBIENT_OUTER_RADIUS,
      label: '',
      status: 'AMBIENT',
      color: '#0e7490',
      diameter: 4,
      glow: 8,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.5 + Math.random() * 0.4,
      strategyKey: '',
      strategyName: '',
    })
  }

  // ---- Inner ambient shell (fills volume so orb doesn't collapse when viewed edge-on) ----
  const AMBIENT_INNER_RADIUS = 1.35
  const N_AMBIENT_INNER = 60
  for (let i = 0; i < N_AMBIENT_INNER; i++) {
    const { ux, uy, uz } = fibUnit(i, N_AMBIENT_INNER)
    nodes.push({
      id: id++,
      shell: 'ambient',
      ux,
      uy,
      uz,
      radius: AMBIENT_INNER_RADIUS,
      label: '',
      status: 'AMBIENT',
      color: '#0891b2',
      diameter: 3,
      glow: 6,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.6 + Math.random() * 0.4,
      strategyKey: '',
      strategyName: '',
    })
  }

  return nodes
}
