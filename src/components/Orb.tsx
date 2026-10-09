/**
 * Orb — pure CSS/DOM visualization of the J.A.R.V.I.S. intelligence core.
 *
 * No WebGL. No Three.js. Every node is a div. Every animation is a CSS
 * transform. Every color is guaranteed to render correctly.
 *
 * Three shells rotate on multiple axes so no shell ever collapses into
 * a flat line. A fixed camera skew tilts the whole scene so we never
 * view it dead-on.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildOrbNodes,
  type OrbNode,
  type OrbSource,
} from './orb/orbLayout'

interface OrbProps {
  strategies: { key: string; name: string; status: string }[]
  markets?: { id: string; question: string; change_24h: number | null }[]
}

const PIXELS_PER_UNIT = 90
const DEPTH_SCALE = 0.35

const SHELL_SPEEDS: Record<string, { x: number; y: number }> = {
  strategy: { x: 4.5, y: 12.0 },
  market: { x: 9.0, y: 5.5 },
  ambient: { x: -6.0, y: -7.0 },
}

export default function Orb({ strategies, markets = [] }: OrbProps) {
  const nodes = useMemo(() => {
    const source: OrbSource = { strategies, markets }
    return buildOrbNodes(source)
  }, [strategies, markets])

  const [t, setT] = useState(0)
  const startRef = useRef<number>(performance.now())

  useEffect(() => {
    let rafId = 0
    const tick = () => {
      const elapsed = (performance.now() - startRef.current) / 1000
      setT(elapsed)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const containerRotY = t * 4

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 480,
          height: 480,
          background:
            'radial-gradient(circle, rgba(34,211,238,0.08) 0%, rgba(34,211,238,0.02) 40%, transparent 70%)',
        }}
      />

      <div
        className="relative"
        style={{
          width: 480,
          height: 480,
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transform: 'rotateX(28deg) rotateZ(-12deg)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateY(${containerRotY}deg)`,
            }}
          >
            <CorePulse />
            {nodes.map((node) => (
              <Node key={node.id} node={node} time={t} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CorePulse() {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: '50%',
        top: '50%',
        width: 60,
        height: 60,
        transform: 'translate(-50%, -50%)',
        background:
          'radial-gradient(circle at 35% 35%, #67e8f9 0%, #22d3ee 30%, #0891b2 70%, rgba(8,145,178,0) 100%)',
        boxShadow:
          '0 0 40px 12px rgba(34,211,238,0.55), 0 0 80px 24px rgba(34,211,238,0.25)',
        animation: 'orb-core-breathe 3s ease-in-out infinite',
      }}
    />
  )
}

function Node({ node, time }: { node: OrbNode; time: number }) {
  const speed = SHELL_SPEEDS[node.shell] ?? { x: 0, y: 0 }
  const rotX = (speed.x * time * Math.PI) / 180
  const rotY = (speed.y * time * Math.PI) / 180

  const driftAngle = Math.sin(time * node.driftSpeed + node.driftPhase) * 0.08

  const cosY = Math.cos(rotY)
  const sinY = Math.sin(rotY)
  const x1 = node.ux * cosY - node.uz * sinY
  const z1 = node.ux * sinY + node.uz * cosY
  const y1 = node.uy

  const cosX = Math.cos(rotX)
  const sinX = Math.sin(rotX)
  const x2 = x1
  const y2 = y1 * cosX - z1 * sinX
  const z2 = y1 * sinX + z1 * cosX

  const dx = Math.cos(driftAngle) * x2 - Math.sin(driftAngle) * z2
  const dz = Math.sin(driftAngle) * x2 + Math.cos(driftAngle) * z2

  const px = dx * node.radius * PIXELS_PER_UNIT
  const py = y2 * node.radius * PIXELS_PER_UNIT
  const pz = dz

  const depthFactor = 1 + pz * DEPTH_SCALE
  const diameter = node.diameter * depthFactor
  const glow = node.glow * depthFactor
  const opacity = 0.4 + 0.6 * ((pz + 1) / 2)
  const glowRgba = hexToRgba(node.color, 0.7)

  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `calc(50% + ${px}px)`,
        top: `calc(50% + ${py}px)`,
        width: `${diameter}px`,
        height: `${diameter}px`,
        transform: 'translate(-50%, -50%)',
        backgroundColor: node.color,
        boxShadow: `0 0 ${glow}px ${glow / 3}px ${glowRgba}`,
        opacity,
        zIndex: Math.round(pz * 100) + 100,
      }}
      title={node.label}
    />
  )
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
