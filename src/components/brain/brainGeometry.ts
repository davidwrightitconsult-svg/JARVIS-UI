/**
 * Procedural brain-shaped node distribution with color-coded sources.
 *
 * Node types:
 *   - strategy:  one per registered book strategy (12)
 *   - market:    one per market in the scanner (up to ~100)
 *   - ambient:   filler nodes for visual density (brain shape)
 *
 * Node colors:
 *   strategy:    green/red/cyan/purple by status
 *   market:      green/red/amber by 24h change
 *   ambient:     dim blue (visual only)
 */

import * as THREE from 'three'

export type NodeKind = 'strategy' | 'market' | 'ambient'

export interface BrainNode {
  id: number
  position: THREE.Vector3
  kind: NodeKind
  label: string
  status: string
  color: THREE.Color
  scale: number
}

export interface BrainSource {
  strategies: { key: string; name: string; status: string }[]
  markets: { id: string; question: string; change_24h: number | null }[]
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

/**
 * Brain-shaped 3D point cloud. Used to position BOTH strategy/market
 * nodes AND ambient filler nodes so they share the same silhouette.
 */
function brainPoint(t: number, i: number, radius: number): THREE.Vector3 {
  // Fibonacci sphere base
  const polarAngle = Math.acos(1 - 2 * t)
  const azimuth = GOLDEN_ANGLE * i

  let x = Math.sin(polarAngle) * Math.cos(azimuth)
  let y = Math.cos(polarAngle)
  let z = Math.sin(polarAngle) * Math.sin(azimuth)

  // Brain-shape distortion:
  // 1. Split into two hemispheres (deeper valley on X=0)
  const hemispherePush = 1.0 + 0.25 * Math.abs(x)

  // 2. Top is fuller than bottom (cerebrum vs brain stem)
  const heightBias = 1.0 + 0.15 * Math.max(0, y)

  // 3. Taper the stem at the bottom
  const stemTaper = y < -0.4 ? 0.6 + 0.4 * (y + 1) : 1.0

  // 4. Slight vertical squash (brains are wider than tall)
  const verticalSquash = 0.82

  // 5. Subtle organic noise
  const noiseX = 1 + 0.07 * Math.sin(i * 3.7)
  const noiseY = 1 + 0.06 * Math.cos(i * 2.3)
  const noiseZ = 1 + 0.05 * Math.sin(i * 5.1)

  x = x * radius * hemispherePush * noiseX
  y = y * radius * verticalSquash * heightBias * stemTaper * noiseY
  z = z * radius * 0.95 * noiseZ

  return new THREE.Vector3(x, y, z)
}

function colorForStrategyStatus(status: string): THREE.Color {
  switch (status) {
    case 'VERIFIED':
    case 'APPROVED':
    case 'SUCCEEDED':
      return new THREE.Color('#10b981')   // green
    case 'FAILED':
    case 'REJECTED':
      return new THREE.Color('#ef4444')   // red
    case 'TESTING':
    case 'PROCESSING':
    case 'FORWARD_TEST':
      return new THREE.Color('#a855f7')   // purple
    case 'NOT_VERIFIED':
    default:
      return new THREE.Color('#22d3ee')   // cyan
  }
}

function colorForMarketChange(change: number | null): THREE.Color {
  if (change === null || change === 0) return new THREE.Color('#f59e0b') // amber
  if (change > 0) return new THREE.Color('#10b981') // green
  return new THREE.Color('#ef4444') // red
}

/**
 * Generate ALL nodes for the brain: strategies (bright), markets
 * (mid-brightness), ambient filler (dim). Strategy nodes are placed
 * FIRST in the array so they get the front-most z-order in the
 * instanced mesh.
 */
export function generateBrainNodes(
  source: BrainSource,
  radius: number = 5
): BrainNode[] {
  const nodes: BrainNode[] = []

  // ---- 1. Strategy nodes (12) ----
  const nStrategies = source.strategies.length
  for (let i = 0; i < nStrategies; i++) {
    const t = (i + 0.5) / nStrategies
    const pos = brainPoint(t, i * 11, radius)
    const s = source.strategies[i]
    nodes.push({
      id: nodes.length,
      position: pos,
      kind: 'strategy',
      label: s.name,
      status: s.status,
      color: colorForStrategyStatus(s.status),
      scale: 1.6,
    })
  }

  // ---- 2. Market nodes (up to 100) ----
  const nMarkets = Math.min(source.markets.length, 100)
  for (let i = 0; i < nMarkets; i++) {
    const t = (i + 0.5) / nMarkets
    const pos = brainPoint(t, i * 7 + 3, radius * 0.95)
    const m = source.markets[i]
    nodes.push({
      id: nodes.length,
      position: pos,
      kind: 'market',
      label: m.question,
      status: 'MARKET',
      color: colorForMarketChange(m.change_24h),
      scale: 0.9,
    })
  }

  // ---- 3. Ambient filler nodes (to reach ~200 total) ----
  const target = 200
  const ambientCount = Math.max(0, target - nodes.length)
  for (let i = 0; i < ambientCount; i++) {
    const t = (i + 0.5) / ambientCount
    const pos = brainPoint(t, i * 5 + 1000, radius * 0.85)
    // Slight random jitter for organic feel
    pos.x += (Math.random() - 0.5) * 0.4
    pos.y += (Math.random() - 0.5) * 0.4
    pos.z += (Math.random() - 0.5) * 0.4
    nodes.push({
      id: nodes.length,
      position: pos,
      kind: 'ambient',
      label: 'ambient',
      status: 'AMBIENT',
      color: new THREE.Color('#1e3a8a'), // dim blue
      scale: 0.55,
    })
  }

  return nodes
}

/**
 * Connect each node to its K nearest neighbors.
 * Strategy nodes get more edges; ambient nodes fewer.
 */
export function generateEdges(
  nodes: BrainNode[],
  neighborsPerNode: number = 4
): [number, number][] {
  const edges: [number, number][] = []
  const seen = new Set<string>()

  for (let i = 0; i < nodes.length; i++) {
    const distances = nodes
      .map((other, j) => ({
        j,
        dist: i === j ? Infinity : nodes[i].position.distanceTo(other.position),
      }))
      .sort((a, b) => a.dist - b.dist)

    // Strategy nodes: more neighbors. Ambient: fewer.
    const k =
      nodes[i].kind === 'strategy' ? neighborsPerNode + 2 :
      nodes[i].kind === 'market' ? neighborsPerNode :
      Math.max(2, neighborsPerNode - 2)

    for (let kk = 0; kk < k && kk < distances.length; kk++) {
      const neighborIdx = distances[kk].j
      const key = i < neighborIdx ? `${i}-${neighborIdx}` : `${neighborIdx}-${i}`
      if (!seen.has(key)) {
        seen.add(key)
        edges.push([i, neighborIdx])
      }
    }
  }

  return edges
}
