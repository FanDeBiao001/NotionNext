'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const PARTICLE_COUNT = 260
const CONNECT_DISTANCE = 1.4
const SHOOTING_STAR_COUNT = 5

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

    // Glow texture — canvas-generated radial gradient (circle, not square)
    function createGlowTexture(innerColor, outerColor, size = 64) {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
      gradient.addColorStop(0, innerColor)
      gradient.addColorStop(0.2, innerColor)
      gradient.addColorStop(1, outerColor)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)
      return new THREE.CanvasTexture(canvas)
    }

    const glowTex = createGlowTexture('rgba(160,180,255,1)', 'rgba(160,180,255,0)')
    const starTex = createGlowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 32)

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
      size: 0.08,
      map: glowTex,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
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

    // Shooting stars (added directly to scene, no rotation)
    const starMeshes = []
    const stars = []

    for (let i = 0; i < SHOOTING_STAR_COUNT; i++) {
      const headGeo = new THREE.BufferGeometry()
      const headPos = new Float32Array([0, 0, 3])
      headGeo.setAttribute('position', new THREE.Float32BufferAttribute(headPos, 3))
      const headMat = new THREE.PointsMaterial({ color: '#ffffff', size: 0.2, map: starTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })
      const head = new THREE.Points(headGeo, headMat)
      scene.add(head)

      const tailGeo = new THREE.BufferGeometry()
      const tailData = new Float32Array(6)
      tailGeo.setAttribute('position', new THREE.Float32BufferAttribute(tailData, 3))
      const tailMat = new THREE.LineBasicMaterial({ color: '#a5b4fc', transparent: true, opacity: 0 })
      const tail = new THREE.Line(tailGeo, tailMat)
      scene.add(tail)

      starMeshes.push(headGeo, headMat, tailGeo, tailMat)

      stars.push({
        head,
        tail,
        headPos,
        tailData,
        active: false,
        timer: Math.random() * 5
      })
    }

    function spawnStar(star) {
      const x = (Math.random() - 0.5) * 12
      const y = (Math.random() - 0.5) * 7
      const angle = -Math.PI / 5 + (Math.random() - 0.5) * 1.2
      const speed = 0.025 + Math.random() * 0.04
      const len = 0.8 + Math.random() * 1.5

      star.headPos[0] = x
      star.headPos[1] = y
      star.headPos[2] = 3
      star.head.geometry.attributes.position.needsUpdate = true
      star.head.visible = true
      star.tail.visible = true
      star.head.material.opacity = 1
      star.head.material.size = 0.15 + Math.random() * 0.2

      star.tailData[0] = x - Math.cos(angle) * len
      star.tailData[1] = y - Math.sin(angle) * len
      star.tailData[2] = 3
      star.tailData[3] = x
      star.tailData[4] = y
      star.tailData[5] = 3
      star.tail.geometry.attributes.position.needsUpdate = true
      star.tail.material.opacity = 0.6

      star.dirX = Math.cos(angle) * speed
      star.dirY = Math.sin(angle) * speed
      star.life = 1.0
      star.active = true
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

      // Update shooting stars (independent of particle rotation)
      for (const star of stars) {
        if (!star.active) {
          star.timer -= 0.016
          if (star.timer <= 0) {
            spawnStar(star)
            star.timer = 4 + Math.random() * 8
          }
          continue
        }

        star.life -= 0.01
        star.headPos[0] += star.dirX
        star.headPos[1] += star.dirY
        star.head.geometry.attributes.position.needsUpdate = true

        star.tailData[0] += star.dirX
        star.tailData[1] += star.dirY
        star.tailData[3] = star.headPos[0]
        star.tailData[4] = star.headPos[1]
        star.tail.geometry.attributes.position.needsUpdate = true

        const fade = Math.max(0, star.life)
        star.head.material.opacity = fade
        star.tail.material.opacity = fade * 0.5

        if (star.life <= 0 || Math.abs(star.headPos[0]) > 8 || Math.abs(star.headPos[1]) > 5) {
          star.active = false
          star.head.visible = false
          star.tail.visible = false
          star.timer = 3 + Math.random() * 10
        }
      }

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
      glowTex.dispose()
      starTex.dispose()
      for (const mesh of starMeshes) mesh.dispose()
      if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={mountRef} className='particle-container' />
}
