/**
 * Brain — 3D neural network visualization.
 *
 * Node types:
 *   - strategy: bright, colors from strategy status
 *   - market:   mid-brightness, colors from 24h change
 *   - ambient:  dim filler for brain silhouette
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import {
  generateBrainNodes,
  generateEdges,
  type BrainNode,
  type BrainSource,
} from './brain/brainGeometry'

interface BrainProps {
  strategies: { key: string; name: string; status: string }[]
  markets?: { id: string; question: string; change_24h: number | null }[]
}

// ---- Scene contents (inside Canvas) ----

function BrainScene({
  nodes,
  edges,
}: {
  nodes: BrainNode[]
  edges: [number, number][]
}) {
  const groupRef = useRef<THREE.Group>(null)
  const instancedRef = useRef<THREE.InstancedMesh>(null)

  // Batched edge geometry
  const edgeGeometry = useMemo(() => {
    const positions = new Float32Array(edges.length * 6)
    for (let i = 0; i < edges.length; i++) {
      const [a, b] = edges[i]
      const pa = nodes[a].position
      const pb = nodes[b].position
      positions[i * 6 + 0] = pa.x
      positions[i * 6 + 1] = pa.y
      positions[i * 6 + 2] = pa.z
      positions[i * 6 + 3] = pb.x
      positions[i * 6 + 4] = pb.y
      positions[i * 6 + 5] = pb.z
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [nodes, edges])

  // Write per-instance transforms + colors
  useEffect(() => {
    if (!instancedRef.current) return
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()

    nodes.forEach((node, i) => {
      dummy.position.copy(node.position)
      dummy.scale.setScalar(node.scale)
      dummy.updateMatrix()
      instancedRef.current!.setMatrixAt(i, dummy.matrix)
      color.copy(node.color)
      instancedRef.current!.setColorAt(i, color)
    })

    instancedRef.current.instanceMatrix.needsUpdate = true
    if (instancedRef.current.instanceColor) {
      instancedRef.current.instanceColor.needsUpdate = true
    }
  }, [nodes])

  // Slow rotation
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.12
      groupRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.1) * 0.05
    }
  })

  return (
    <group ref={groupRef}>
      {/* Edges — glowing lines */}
      <lineSegments geometry={edgeGeometry}>
        <lineBasicMaterial
          color="#0e7490"
          transparent
          opacity={0.28}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* Nodes — instanced spheres with per-instance color */}
      <instancedMesh
        ref={instancedRef}
        args={[undefined, undefined, nodes.length]}
      >
        <sphereGeometry args={[0.13, 12, 12]} />
        <meshBasicMaterial
          vertexColors
          toneMapped={false}
          transparent
          opacity={0.95}
        />
      </instancedMesh>
    </group>
  )
}

// ---- Public component ----

export default function Brain({ strategies, markets = [] }: BrainProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { nodes, edges } = useMemo(() => {
    const source: BrainSource = { strategies, markets }
    const ns = generateBrainNodes(source, 5)
    const es = generateEdges(ns, 4)
    return { nodes: ns, edges: es }
  }, [strategies, markets])

  if (!mounted) return null

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 14], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.2} color="#22d3ee" />
        <pointLight position={[-10, -10, -10]} intensity={0.6} color="#3b82f6" />

        <BrainScene nodes={nodes} edges={edges} />

        <EffectComposer>
          <Bloom
            intensity={1.2}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
