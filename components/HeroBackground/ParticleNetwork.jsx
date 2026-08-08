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

    // Shooting stars — dynamically created each spawn
    const stars = []
    for (let i = 0; i < SHOOTING_STAR_COUNT; i++) {
      stars.push({ mesh: null, active: false, timer: i * 2 })
    }

    const TRAIL_DOTS = 20
    const RING_SIZE = 40

    function spawnStar(star) {
      if (star.mesh) {
        scene.remove(star.mesh.head)
        star.mesh.headGeo.dispose(); star.mesh.headMat.dispose()
        for (const td of star.mesh.trailDots) {
          scene.remove(td.dot); td.geo.dispose(); td.mat.dispose()
        }
      }

      const fromLeft = Math.random() > 0.5
      const x = fromLeft ? -7 : 7
      const y = 3.5 + Math.random() * 0.5
      const speed = 0.04 + Math.random() * 0.04
      const angle = fromLeft
        ? (-Math.PI / 4 - Math.random() * 0.2)     // top-left ~45° down-right
        : (-3 * Math.PI / 4 + Math.random() * 0.2)  // top-right ~45° down-left

      // Head — bright white glow dot
      const headGeo = new THREE.BufferGeometry()
      const headArr = new Float32Array([x, y, 3])
      headGeo.setAttribute('position', new THREE.Float32BufferAttribute(headArr, 3))
      const headMat = new THREE.PointsMaterial({
        color: '#ffffff', size: 0.45 + Math.random() * 0.25, map: starTex,
        blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9
      })
      const head = new THREE.Points(headGeo, headMat)
      scene.add(head)

      // Trail: 20 glow dots — size & opacity decrease from head to tail
      const trailDots = []
      for (let t = 0; t < TRAIL_DOTS; t++) {
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array([x, y, 2.95]), 3))
        const ratio = 1 - t / TRAIL_DOTS
        const mat = new THREE.PointsMaterial({
          color: '#a5b4fc',
          size: 0.02 + ratio * 0.13,
          map: starTex,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
          opacity: ratio * 0.5
        })
        const dot = new THREE.Points(geo, mat)
        scene.add(dot)
        trailDots.push({ dot, geo, mat })
      }

      star.mesh = { head, headGeo, headMat, headArr, trailDots }
      star.ring = null
      star.ringLen = 2
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

      // Update shooting stars (with try-catch to catch hidden errors)
      try {
        for (const star of stars) {
          if (!star.active) {
            star.timer -= 0.016
            if (star.timer <= 0) {
              spawnStar(star)
              star.timer = 2 + Math.random() * 4
            }
            continue
          }

          star.life -= 0.0018
          const m = star.mesh
          if (!m) continue

          m.headArr[0] += star.dirX
          m.headArr[1] += star.dirY
          m.headGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(m.headArr), 3))

          // Grow ring buffer: store head position each frame
          if (!star.ring) {
            star.ring = []
            for (let t = 0; t < RING_SIZE; t++) star.ring.push({ x: m.headArr[0], y: m.headArr[1] })
            star.ringIdx = 0
          }
          star.ring[star.ringIdx].x = m.headArr[0]
          star.ring[star.ringIdx].y = m.headArr[1]
          star.ringIdx = (star.ringIdx + 1) % RING_SIZE
          if (star.ringLen < RING_SIZE) star.ringLen++

          // Position trail dots: dot 0 = closest to head, dot 19 = furthest
          for (let t = 0; t < TRAIL_DOTS; t++) {
            const td = m.trailDots[t]
            const historyOffset = Math.floor(t * 2) // dot spacing in ring buffer
            if (historyOffset >= star.ringLen) {
              // Dot doesn't have history yet — hide it
              td.mat.opacity = 0
              continue
            }
            const i = (star.ringIdx - 1 - historyOffset + RING_SIZE) % RING_SIZE
            const pos = star.ring[i]
            td.geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array([pos.x, pos.y, 2.95]), 3))
            const ratio = 1 - t / TRAIL_DOTS
            td.mat.opacity = star.life * ratio * 0.5
            td.mat.size = 0.02 + ratio * 0.13
          }

          m.headMat.opacity = Math.max(0, star.life)

          if (star.life <= 0 || Math.abs(m.headArr[0]) > 8.5 || Math.abs(m.headArr[1]) > 5.5) {
            star.active = false
            scene.remove(m.head)
            m.headGeo.dispose(); m.headMat.dispose()
            for (const td of m.trailDots) {
              scene.remove(td.dot); td.geo.dispose(); td.mat.dispose()
            }
            star.mesh = null
            star.timer = 1.5 + Math.random() * 4
          }
        }
      } catch (e) {
        console.error('[Meteor] update error:', e)
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
      // Cleanup any active star meshes
      for (const star of stars) {
        if (star.mesh) {
          scene.remove(star.mesh.head)
          star.mesh.headGeo.dispose()
          star.mesh.headMat.dispose()
          for (const td of star.mesh.trailDots) {
            scene.remove(td.dot)
            td.geo.dispose()
            td.mat.dispose()
          }
        }
      }
      if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={mountRef} className='particle-container' />
}
