/**
 * Orb layout — Phase B final.
 *
 * Node positions are now arranged on the THREE TILTED SATURN RINGS
 * (not on the sphere surface). The tilt matches the rings' tilt in
 * SphereHud.tsx so the nodes appear to sit ON the rings.
 *
 *   strategy ring: radius 0.36 × 480 = 173px, 12 nodes
 *   market ring:   radius 0.42 × 480 = 202px, 25 nodes
 *   ambient volume: scattered through sphere volume (not on a ring)
 *
 * Coordinates are returned in "unit" form and Orb.tsx scales them
 * using the same camera/matrix math as before.
 */

export type ShellKind = 'strategy' | 'market' | 'ambient'

export interface OrbNode {
  id: number
  shell: ShellKind
  /** Unit position BEFORE scaling */
  ux: number
  uy: number
  uz: number
  /** Ring radius (only meaningful for strategy/market shells) */
  radius: number
  /** Tilt angle of the ring this node sits on (degrees) */
  tiltDeg: number
  label: string
  status: string
  color: string
  diameter: number
  glow: number
  driftPhase: number
  driftSpeed: number
  strategyKey: string
  strategyName: string
}

export interface OrbSource {
  strategies: { key: string; name: string; status: string }[]
  markets: { id: string; question: string; change_24h: number | null }[]
}

// Tilt in degrees — must match SphereHud.tsx TILT_DEG
const TILT_DEG = -15

// Ring radii as fractions of the orb container (480px)
const STRATEGY_RING_FRACTION = 0.36
const MARKET_RING_FRACTION = 0.42

// Ambient volume distribution
const AMBIENT_COUNT = 60
const AMBIENT_MIN_RADIUS = 0.5
const AMBIENT_MAX_RADIUS = 1.0

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
 * Given an index i and total n, return the angle around the ring (radians).
 * Evenly distributes all n nodes around the full circle.
 */
function ringAngle(i: number, n: number): number {
  return (i / Math.max(1, n)) * Math.PI * 2
}

/**
 * Place a node on a tilted ring. The tilt is applied as a rotation around
 * the X-axis (matching what SVG does in SphereHud.tsx with rotate(TILT)).
 *
 * In 3D:
 *   x = cos(angle) * radius
 *   y = sin(angle) * radius * cos(tilt)
 *   z = sin(angle) * radius * sin(tilt)
 *
 * When we pass these to the Orb's camera math, the perspective flattening
 * makes nodes on the front of the ring appear larger and nodes on the back
 * appear smaller — exactly matching the ring's visual ellipse.
 */
function ringPosition(
  angle: number,
  radiusFraction: number,
): { ux: number; uy: number; uz: number } {
  const tiltRad = (TILT_DEG * Math.PI) / 180
  const cosTilt = Math.cos(tiltRad)
  const sinTilt = Math.sin(tiltRad)

  const ux = Math.cos(angle) * radiusFraction
  const uy = Math.sin(angle) * radiusFraction * cosTilt
  const uz = Math.sin(angle) * radiusFraction * sinTilt

  return { ux, uy, uz }
}

/**
 * Random point inside the sphere volume. Used for ambient particles.
 */
function volumePoint(): { ux: number; uy: number; uz: number } {
  while (true) {
    const x = Math.random() * 2 - 1
    const y = Math.random() * 2 - 1
    const z = Math.random() * 2 - 1
    const len2 = x * x + y * y + z * z
    if (len2 <= 1 && len2 > 0.01) {
      return { ux: x, uy: y, uz: z }
    }
  }
}

export function buildOrbNodes(source: OrbSource): OrbNode[] {
  const nodes: OrbNode[] = []
  let id = 0

  // ---- Strategy ring (middle) ----
  const nStrat = source.strategies.length
  source.strategies.forEach((s, i) => {
    const angle = ringAngle(i, nStrat)
    const pos = ringPosition(angle, STRATEGY_RING_FRACTION)
    nodes.push({
      id: id++,
      shell: 'strategy',
      ...pos,
      radius: STRATEGY_RING_FRACTION,
      tiltDeg: TILT_DEG,
      label: s.name,
      status: s.status,
      color: strategyColor(s.status),
      diameter: 12,
      glow: 26,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.3 + Math.random() * 0.2,
      strategyKey: s.key,
      strategyName: s.name,
    })
  })

  // ---- Market ring (outer) ----
  const nMarket = Math.min(source.markets.length, 25)
  source.markets.slice(0, nMarket).forEach((m, i) => {
    const angle = ringAngle(i, nMarket)
    const pos = ringPosition(angle, MARKET_RING_FRACTION)
    nodes.push({
      id: id++,
      shell: 'market',
      ...pos,
      radius: MARKET_RING_FRACTION,
      tiltDeg: TILT_DEG,
      label: m.question,
      status: 'MARKET',
      color: marketColor(m.change_24h),
      diameter: 10,
      glow: 20,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.4 + Math.random() * 0.3,
      strategyKey: m.id,
      strategyName: m.question,
    })
  })

  // ---- Ambient volume (scattered) ----
  for (let i = 0; i < AMBIENT_COUNT; i++) {
    const pos = volumePoint()
    const scale =
      AMBIENT_MIN_RADIUS +
      Math.random() * (AMBIENT_MAX_RADIUS - AMBIENT_MIN_RADIUS)
    nodes.push({
      id: id++,
      shell: 'ambient',
      ux: pos.ux * scale,
      uy: pos.uy * scale,
      uz: pos.uz * scale,
      radius: 0,
      tiltDeg: 0,
      label: '',
      status: 'AMBIENT',
      color: '#0891b2',
      diameter: 3,
      glow: 6,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.5 + Math.random() * 0.4,
      strategyKey: '',
      strategyName: '',
    })
  }

  return nodes
}
