/**
 * Orb — 3D luminous intelligence core with three concentric shells.
 *
 * This is the primary visualization for J.A.R.V.I.S.
 * Replaces the earlier brain-style visualization.
 */

import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import {
  generateOrbNodes,
  type OrbNode,
  type OrbSource,
} from './orb/OrbGeometry'

interface OrbProps {
  strategies: { key: string; name: string; status: string }[]
  markets?: { id: string; question: string; change_24h: number | null }[]
}

// ---- The central core: solid sphere + wireframe cage + halo ----

function OrbCore() {
  const cageRef = useRef<THREE.LineSegments>(null)
  const solidRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (cageRef.current) {
      cageRef.current.rotation.y = t * 0.15
      cageRef.current.rotation.x = t * 0.08
    }
    // Gentle "breathing" pulse on the core
    if (solidRef.current) {
      const s = 1 + 0.04 * Math.sin(t * 1.2)
      solidRef.current.scale.setScalar(s)
    }
  })

  // Wireframe cage geometry
  const cageGeo = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(0.85, 2)
    return new THREE.WireframeGeometry(geo)
  }, [])

  return (
    <group>
      {/* Solid core */}
      <mesh ref={solidRef}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshBasicMaterial color="#22d3ee" toneMapped={false} />
      </mesh>

      {/* Inner halo */}
      <mesh>
        <sphereGeometry args={[0.75, 24, 24]} />
        <meshBasicMaterial
          color="#0891b2"
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Rotating wireframe cage */}
      <lineSegments ref={cageRef} geometry={cageGeo}>
        <lineBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  )
}

// ---- Nodes on the three shells (instanced) ----

function OrbNodes({ nodes }: { nodes: OrbNode[] }) {
  const groupRef = useRef<THREE.Group>(null)

  // Write instance matrices + colors once
  const shells = useMemo(() => {
     
    const strategy = nodes.filter((n) => n.shell === 'strategy')
    const market = nodes.filter((n) => n.shell === 'market')
    const ambient = nodes.filter((n) => n.shell === 'ambient')
    return { strategy, market, ambient }
  }, [nodes])
  
 // Slow rotation of the entire system
 useFrame((state, delta) => {
   if (groupRef.current) {
     groupRef.current.rotation.y += delta * 0.08
    }
  })
  

  return (
     <group ref={groupRef}>
       <ShellInstances
         nodes={shells.strategy}
         color="#22d3ee"
         sizeMultiplier={1.0}
       />

       <ShellInstances
         nodes={shells.market}
         color="#94a3b8"
         sizeMultiplier={0.7}
       />

       <ShellInstances
         nodes={shells.ambient}
         color="#0e7490"
         sizeMultipier={0.5}
       />
     </group>
   )
}       


// ---- ShellInstances: one Points cloud per shell, reliable per-vertex color ----

function ShellInstances({
  nodes,
  color,
  sizeMultiplier,
}: {
  nodes: OrbNode[]
  color: string
  sizeMultiplier: number
}) {
  const pointsRef = useRef<THREE.Points>(null)

  // Baked positions + colors — reliable per-vertex coloring
  const pointsGeo = useMemo(() => {
    const n = nodes.length
    const positions = new Float32Array(n * 3)
    const colors = new Float32Array(n * 3)
    const color3 = new THREE.Color(color)

    nodes.forEach((node, i) => {
      positions[i * 3 + 0] = node.position.x
      positions[i * 3 + 1] = node.position.y
      positions[i * 3 + 2] = node.position.z

      colors[i * 3 + 0] = color3.r
      colors[i * 3 + 1] = color3.g
      colors[i * 3 + 2] = color3.b
    })

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [nodes, color])

  // Per-frame drift: animate position attribute in-place
  useFrame((state) => {
    const pts = pointsRef.current
    if (!pts) return
    const geo = pts.geometry as THREE.BufferGeometry
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array
    const t = state.clock.elapsedTime

    nodes.forEach((node, i) => {
      const drift = 0.12
      const phase = node.driftPhase
      const speed = node.driftSpeed

      arr[i * 3 + 0] = node.basePosition.x + Math.sin(t * speed + phase) * drift
      arr[i * 3 + 1] = node.basePosition.y + Math.cos(t * speed * 0.7 + phase * 1.3) * drift
      arr[i * 3 + 2] = node.basePosition.z + Math.sin(t * speed * 0.5 + phase * 0.9) * drift
    })

    posAttr.needsUpdate = true
  })

  if (nodes.length === 0) return null

  // Point size — sized to be visible as a dot, not a blob
  const pointSize = 4 * sizeMultiplier

  return (
    <points ref={pointsRef} geometry={pointsGeo}>
      <pointsMaterial
        size={pointSize}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.95}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  )
}

// ---- Public component ----

export default function Orb({ strategies, markets = [] }: OrbProps) {
  const nodes = useMemo(() => {
    const source: OrbSource = { strategies, markets }
    return generateOrbNodes(source)
  }, [strategies, markets])

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 14], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />

        <OrbCore />
        <OrbNodes nodes={nodes} />

        <EffectComposer>
          <Bloom
            intensity={1.4}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
