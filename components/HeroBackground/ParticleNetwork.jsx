'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const PARTICLE_COUNT = 260
const CONNECT_DISTANCE = 1.4

export default function ParticleNetwork() {
  const mountRef = useRef(null)

  useEffect(() => {
    const width = window.innerWidth
    const height = window.innerHeight

    // Scene
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.z = 8

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mountRef.current.appendChild(renderer.domElement)

    // Particles
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

    const material = new THREE.PointsMaterial({
      color: '#778cff',
      size: 0.035,
      transparent: true,
      opacity: 0.8
    })

    const particles = new THREE.Points(geometry, material)
    scene.add(particles)

    // Lines
    const lineMaterial = new THREE.LineBasicMaterial({
      color: '#5865ff',
      transparent: true,
      opacity: 0.15
    })

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const dx = positions[i * 3] - positions[j * 3]
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (distance < CONNECT_DISTANCE) {
          const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]),
            new THREE.Vector3(positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2])
          ])
          scene.add(new THREE.Line(lineGeo, lineMaterial))
        }
      }
    }

    // Mouse interaction
    let mouseX = 0
    let mouseY = 0
    let targetX = 0
    let targetY = 0

    const onMouseMove = (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 0.5
      targetY = (e.clientY / window.innerHeight - 0.5) * 0.3
    }

    window.addEventListener('mousemove', onMouseMove)

    // Animation — base auto-spin + mouse offset (non-accumulating)
    let baseRotY = 0
    let baseRotX = 0
    let animationId
    function animate() {
      animationId = requestAnimationFrame(animate)

      baseRotY += 0.0008
      baseRotX += 0.0002

      mouseX += (targetX - mouseX) * 0.05
      mouseY += (targetY - mouseY) * 0.05

      particles.rotation.y = baseRotY + mouseX * 0.3
      particles.rotation.x = baseRotX + mouseY * 0.2

      renderer.render(scene, camera)
    }
    animate()

    // Resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      lineMaterial.dispose()
      if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={mountRef} className='particle-container' />
}
