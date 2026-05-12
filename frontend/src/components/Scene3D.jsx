import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'

function ParticleSphere() {
  const ref = useRef()
  const count = 3000

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 2.2 + Math.random() * 0.3
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    return pos
  }, [])

  useFrame((state) => {
    ref.current.rotation.y = state.clock.elapsedTime * 0.06
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.03) * 0.15
  })

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#6366f1" size={0.018} sizeAttenuation depthWrite={false} opacity={0.7} />
    </Points>
  )
}

function FloatingRing() {
  const ref = useRef()
  useFrame((state) => {
    ref.current.rotation.x = state.clock.elapsedTime * 0.15
    ref.current.rotation.z = state.clock.elapsedTime * 0.08
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2
  })
  return (
    <mesh ref={ref}>
      <torusGeometry args={[1.6, 0.008, 8, 120]} />
      <meshBasicMaterial color="#818cf8" transparent opacity={0.35} />
    </mesh>
  )
}

function FloatingRing2() {
  const ref = useRef()
  useFrame((state) => {
    ref.current.rotation.y = state.clock.elapsedTime * 0.12
    ref.current.rotation.x = Math.PI / 3 + state.clock.elapsedTime * 0.05
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.4 + 1) * 0.15
  })
  return (
    <mesh ref={ref}>
      <torusGeometry args={[2.1, 0.006, 8, 120]} />
      <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} />
    </mesh>
  )
}

function GlowCore() {
  const ref = useRef()
  useFrame((state) => {
    const s = 1 + Math.sin(state.clock.elapsedTime * 1.2) * 0.08
    ref.current.scale.set(s, s, s)
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.18, 32, 32]} />
      <meshBasicMaterial color="#a78bfa" transparent opacity={0.9} />
    </mesh>
  )
}

export default function Scene3D() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
    }}>
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#6366f1" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3b82f6" />
        <ParticleSphere />
        <FloatingRing />
        <FloatingRing2 />
        <GlowCore />
      </Canvas>

      {/* Radial gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, #050508 80%)',
      }} />
    </div>
  )
}
