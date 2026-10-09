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


// ---- ShellInstances: one InstancedMesh per shell, guaranteed color ----

function ShellInstances({
  nodes,
  color,
  sizeMultiplier,
}: {
  nodes: OrbNode[]
  color: string
  sizeMultiplier: number
}) {
  const instancedRef = useRef<THREE.InstancedMesh>(null)
   
  
  // Write initial positions + sizes once

  useEffect(() => {
    const mesh = instancedRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()

    
    nodes.forEach((node, i) => {
      dummy.position.copy(node.position)
      dummy.scale.setScalar(node.size * sizeMultiplier)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })



    mesh.instanceMatrix.needsUpdate = true
},   [nodes, sizeMultiplier])


// Per-frame drift
useFrame((state) => {
    const mesh = instancedRef.current
    if (!mesh || nodes.length === 0) return


    const t = state.clock.elapsedTime
    const dummy = new THREE.Object3D()

    nodes.forEach((node, i) => {
      const drift = 0.12
      const phase = node.driftPhase
      const speed = node.driftSpeed

      dummy.position.set(
        node.basePosition.x + Math.sin(t * speed + phase) * drift,
        node.basePosition.y + Math.cos(t * speed * 0.7 + phase * 1.3) * drift,
        node.basePosition.z + Math.sin(t * speed * 0.5 + phase * 0.9) * drift,
      )
      dummy.scale.setScalar(node.size * sizeMultiplier)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })

    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={instancedRef}
      args={[undefined, undefined, nodes.length]}
    >
      <sphereGeometry args={[1, 10, 10]} />
      <meshStandardMaterial
          color={color}
          toneMapped={false}
          transparent
          opacity={0.95}
          emissiveIntensity={1.5}
          emissive={color}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
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
