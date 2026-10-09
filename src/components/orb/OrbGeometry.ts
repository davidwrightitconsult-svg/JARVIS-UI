/**
 * Orb geometry: generates three concentric shells of luminous points.
 *
 *   Inner shell (radius 2.5):  12 STRATEGY nodes — brightest, colored by status
 *   Mid shell   (radius 4.5):  ~25 MARKET nodes — mid brightness, colored by change
 *   Outer shell (radius 6.5):  ~120 AMBIENT particles — dim cyan
 *
 * All positions are on perfect spheres using a Fibonacci distribution
 * for even coverage.
 */

import * as THREE from 'three'

export type NodeKind = 'strategy' | 'market' | 'ambient'

export interface OrbNode {
  id: number
  shell: NodeKind
  position: THREE.Vector3
  basePosition: THREE.Vector3  // for drifting
  label: string
  status: string
  color: THREE.Color
  size: number
  brightness: number  // 0..1 multiplier on emissive output
  driftPhase: number
  driftSpeed: number
}

export interface OrbSource {
  strategies: { key: string; name: string; status: string }[]
  markets: { id: string; question: string; change_24h: number | null }[]
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

/** Fibonacci-distributed unit vector at index i of n. */
function fibPoint(i: number, n: number): THREE.Vector3 {
  const y = 1 - (2 * (i + 0.5)) / n  // -1 .. 1
  const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y))
  const theta = GOLDEN_ANGLE * i
  return new THREE.Vector3(
    Math.cos(theta) * radiusAtY,
    y,
    Math.sin(theta) * radiusAtY,
  )
}

// ---- Color helpers ----

function strategyColor(status: string): { color: THREE.Color; brightness: number } {
  switch (status) {
    case 'VERIFIED':
    case 'APPROVED':
    case 'SUCCEEDED':
      return { color: new THREE.Color('#10b981'), brightness: 1.0 }
    case 'FAILED':
    case 'REJECTED':
      return { color: new THREE.Color('#ef4444'), brightness: 1.0 }
    case 'TESTING':
    case 'PROCESSING':
    case 'FORWARD_TEST':
      return { color: new THREE.Color('#a855f7'), brightness: 1.0 }
    case 'NOT_VERIFIED':
    default:
      return { color: new THREE.Color('#22d3ee'), brightness: 0.85 }
  }
}

function marketColor(change: number | null): { color: THREE.Color; brightness: number } {
  if (change === null) return { color: new THREE.Color('#64748b'), brightness: 0.4 }
  if (change > 0.005) return { color: new THREE.Color('#10b981'), brightness: 0.75 }
  if (change < -0.005) return { color: new THREE.Color('#ef4444'), brightness: 0.75 }
  return { color: new THREE.Color('#f59e0b'), brightness: 0.55 }
}

// ---- Main generator ----

export function generateOrbNodes(source: OrbSource): OrbNode[] {
  const nodes: OrbNode[] = []
  let id = 0

  // ---- Inner shell: strategies ----
  const STRATEGY_RADIUS = 2.5
  const nStrat = source.strategies.length
  for (let i = 0; i < nStrat; i++) {
    const unit = fibPoint(i, nStrat)
    const pos = unit.clone().multiplyScalar(STRATEGY_RADIUS)
    const s = source.strategies[i]
    const { color, brightness } = strategyColor(s.status)
    nodes.push({
      id: id++,
      shell: 'strategy',
      position: pos.clone(),
      basePosition: pos.clone(),
      label: s.name,
      status: s.status,
      color,
      size: 0.22,
      brightness,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.3,
    })
  }

  // ---- Mid shell: markets ----
  const MARKET_RADIUS = 4.5
  const nMarket = Math.min(source.markets.length, 25)
  for (let i = 0; i < nMarket; i++) {
    const unit = fibPoint(i, nMarket)
    const pos = unit.clone().multiplyScalar(MARKET_RADIUS)
    const m = source.markets[i]
    const { color, brightness } = marketColor(m.change_24h)
    nodes.push({
      id: id++,
      shell: 'market',
      position: pos.clone(),
      basePosition: pos.clone(),
      label: m.question,
      status: 'MARKET',
      color,
      size: 0.13,
      brightness,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.5,
    })
  }

  // ---- Outer shell: ambient ----
  const AMBIENT_RADIUS = 6.5
  const AMBIENT_COUNT = 120
  const ambientColor = new THREE.Color('#0e7490')
  for (let i = 0; i < AMBIENT_COUNT; i++) {
    const unit = fibPoint(i, AMBIENT_COUNT)
    const pos = unit.clone().multiplyScalar(AMBIENT_RADIUS)
    nodes.push({
      id: id++,
      shell: 'ambient',
      position: pos.clone(),
      basePosition: pos.clone(),
      label: '',
      status: 'AMBIENT',
      color: ambientColor.clone(),
      size: 0.07,
      brightness: 0.35,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.7,
    })
  }

  return nodes
}
