'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const PARTICLE_COUNT = 260
const CONNECT_DISTANCE = 1.4
const SHOOTING_STAR_COUNT = 3
const RING_SIZE = 40
const HEAD_CAP_SEGMENTS = 10
const RIBBON_Z = 2.97
const MAX_RIBBON_WIDTH = 0.18

export default function ParticleNetwork({ onReady, meteorsEnabled = true }) {
  const mountRef = useRef(null)
  const onReadyRef = useRef(onReady)
  const meteorsEnabledRef = useRef(meteorsEnabled)
  onReadyRef.current = onReady
  meteorsEnabledRef.current = meteorsEnabled

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

    // Glow texture
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

    // ==========================================
    // Particles — with per-particle brightness variation (vertexColors)
    // ==========================================
    // Keep-out radius around screen center to avoid a visible "dot" artifact
    const CENTER_KEEP_OUT = 0.6

    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const colors = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let px, py
      do {
        px = (Math.random() - 0.5) * 15
        py = (Math.random() - 0.5) * 8
      } while (px * px + py * py < CENTER_KEEP_OUT * CENTER_KEEP_OUT)
      positions[i * 3] = px
      positions[i * 3 + 1] = py
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6
      const brightness = 0.4 + Math.random() * 0.6
      colors[i * 3] = 0.47 * brightness
      colors[i * 3 + 1] = 0.55 * brightness
      colors[i * 3 + 2] = 1.0 * brightness
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.08,
      map: glowTex,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.8
    })

    const particles = new THREE.Points(geometry, material)
    scene.add(particles)

    // ==========================================
    // Lines — merged into single LineSegments, with center keep-out
    // ==========================================
    const CENTER_KEEP_OUT_SQ = CENTER_KEEP_OUT * CENTER_KEEP_OUT
    const segmentIndices = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ax = positions[i * 3]
      const ay = positions[i * 3 + 1]
      const az = positions[i * 3 + 2]
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const dx = ax - positions[j * 3]
        const dy = ay - positions[j * 3 + 1]
        const dz = az - positions[j * 3 + 2]
        const distSq = dx * dx + dy * dy + dz * dz
        if (distSq >= CONNECT_DISTANCE * CONNECT_DISTANCE) continue

        // Skip segments whose infinite line passes too close to screen center (origin x-y)
        // Distance from origin to line through A,B in 2D: |cross(A,B)| / |B-A|
        const cross = ax * positions[j * 3 + 1] - ay * positions[j * 3]
        if (cross * cross < CENTER_KEEP_OUT_SQ * (dx * dx + dy * dy)) continue

        segmentIndices.push(i, j)
      }
    }

    const segCount = segmentIndices.length / 2
    const lineVerts = new Float32Array(segCount * 6) // 2 verts × 3 components per segment
    for (let s = 0; s < segCount; s++) {
      const i = segmentIndices[s * 2]
      const j = segmentIndices[s * 2 + 1]
      const off = s * 6
      lineVerts[off] = positions[i * 3]
      lineVerts[off + 1] = positions[i * 3 + 1]
      lineVerts[off + 2] = positions[i * 3 + 2]
      lineVerts[off + 3] = positions[j * 3]
      lineVerts[off + 4] = positions[j * 3 + 1]
      lineVerts[off + 5] = positions[j * 3 + 2]
    }

    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineVerts, 3))
    const lineMaterial = new THREE.LineBasicMaterial({
      color: '#5865ff',
      transparent: true,
      opacity: 0.15
    })
    const lines = new THREE.LineSegments(lineGeo, lineMaterial)
    scene.add(lines)

    // ==========================================
    // Shooting star — pre-allocated slot pool (no per-spawn allocations)
    // ==========================================
    const MAX_RIBBON_VERTS = RING_SIZE * 2 + HEAD_CAP_SEGMENTS + 2
    const MAX_RIBBON_INDICES =
      (RING_SIZE - 1) * 6 + HEAD_CAP_SEGMENTS * 3

    function createStarSlot() {
      // Ribbon
      const ribbonPosArr = new Float32Array(MAX_RIBBON_VERTS * 3)
      const ribbonColArr = new Float32Array(MAX_RIBBON_VERTS * 4)
      const ribbonUvArr = new Float32Array(MAX_RIBBON_VERTS * 2)
      const ribbonIdxArr = new Uint16Array(MAX_RIBBON_INDICES)
      for (let i = 0; i < RING_SIZE - 1; i++) {
        const vi = i * 2
        const off = i * 6
        ribbonIdxArr[off] = vi
        ribbonIdxArr[off + 1] = vi + 1
        ribbonIdxArr[off + 2] = vi + 2
        ribbonIdxArr[off + 3] = vi + 1
        ribbonIdxArr[off + 4] = vi + 3
        ribbonIdxArr[off + 5] = vi + 2
      }
      const ribbonGeo = new THREE.BufferGeometry()
      ribbonGeo.setAttribute('position', new THREE.BufferAttribute(ribbonPosArr, 3))
      ribbonGeo.setAttribute('color', new THREE.BufferAttribute(ribbonColArr, 4))
      ribbonGeo.setAttribute('uv', new THREE.BufferAttribute(ribbonUvArr, 2))
      ribbonGeo.setIndex(new THREE.BufferAttribute(ribbonIdxArr, 1))
      ribbonGeo.setDrawRange(0, 0)
      const ribbonMat = new THREE.MeshBasicMaterial({
        vertexColors: true, map: glowTex,
        blending: THREE.AdditiveBlending, transparent: true,
        depthWrite: false, side: THREE.DoubleSide, toneMapped: false
      })
      const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat)
      ribbon.frustumCulled = true
      ribbon.renderOrder = 10
      ribbon.position.z = -1000
      scene.add(ribbon)

      // Flat ring buffer: x0,y0,x1,y1,...
      const ringData = new Float32Array(RING_SIZE * 2)

      return {
        ribbon, ribbonGeo, ribbonPosArr, ribbonColArr, ribbonUvArr,
        ribbonIdxArr, ribbonMat,
        ringData, ringIdx: 0, ringLen: 0,
        x: 0, y: 0,
        dirX: 0, dirY: 0, speed: 0,
        life: 0, active: false, spawnTimer: 0
      }
    }

    const starSlots = []
    for (let i = 0; i < SHOOTING_STAR_COUNT; i++) {
      const slot = createStarSlot()
      slot.spawnTimer = i * 5 // staggered start
      starSlots.push(slot)
    }

    function spawnStar(slot) {
      const fromLeft = Math.random() > 0.5
      const x = fromLeft ? -7 : 7
      const y = 3.5 + Math.random() * 0.5
      const speed = 0.04 + Math.random() * 0.04
      const angle = fromLeft
        ? (-Math.PI / 4 - Math.random() * 0.2)
        : (-3 * Math.PI / 4 + Math.random() * 0.2)

      slot.x = x
      slot.y = y

      slot.ringIdx = 0
      slot.ringLen = 0
      slot.ribbonGeo.setDrawRange(0, 0)

      slot.dirX = Math.cos(angle) * speed
      slot.dirY = Math.sin(angle) * speed
      slot.speed = speed
      slot.life = 1.0
      slot.active = true

      // Bring into view
      slot.ribbon.position.z = 0
    }

    function despawnStar(slot) {
      slot.active = false
      slot.ribbon.position.z = -1000
      slot.ribbonGeo.setDrawRange(0, 0)
      slot.spawnTimer = 10 + Math.random() * 5
    }

    function buildRibbon(slot) {
      const n = slot.ringLen
      if (n < 2) {
        slot.ribbonGeo.setDrawRange(0, 0)
        return
      }

      const {
        ringData, ringIdx, ribbonPosArr, ribbonColArr, ribbonUvArr,
        ribbonIdxArr, ribbonGeo
      } = slot
      const { dirX, dirY, life } = slot

      let k = 0
      for (let p = 0; p < n; p++) {
        const h = (n - 1) - p
        const idx = (ringIdx - 1 - h + RING_SIZE) % RING_SIZE
        const cx = ringData[idx * 2]
        const cy = ringData[idx * 2 + 1]

        // Central-difference tangent
        const hOlder = Math.min(h + 1, n - 1)
        const hNewer = Math.max(h - 1, 0)
        const iOlder = (ringIdx - 1 - hOlder + RING_SIZE) % RING_SIZE
        const iNewer = (ringIdx - 1 - hNewer + RING_SIZE) % RING_SIZE
        let dx = ringData[iNewer * 2] - ringData[iOlder * 2]
        let dy = ringData[iNewer * 2 + 1] - ringData[iOlder * 2 + 1]
        const dl = Math.hypot(dx, dy)
        if (dl < 1e-6) { dx = dirX; dy = dirY }
        const nx = -dy / (dl || 1)
        const ny = dx / (dl || 1)

        const ratio = p / (n - 1)
        // A monotonic width and color ramp prevents a brighter bulge from
        // appearing halfway along a single meteor trail.
        const intensity = Math.pow(ratio, 1.15)
        const halfW = 0.5 * MAX_RIBBON_WIDTH * Math.pow(ratio, 0.72)
        const cr = 0.28 + intensity * 0.48
        const cg = 0.34 + intensity * 0.48
        const cb = 0.82 + intensity * 0.18
        let ca = 0.78 * Math.pow(ratio, 1.08)
        ca *= life

        // Left vertex
        ribbonPosArr[k * 3] = cx + nx * halfW
        ribbonPosArr[k * 3 + 1] = cy + ny * halfW
        ribbonPosArr[k * 3 + 2] = RIBBON_Z
        ribbonColArr[k * 4] = cr; ribbonColArr[k * 4 + 1] = cg
        ribbonColArr[k * 4 + 2] = cb; ribbonColArr[k * 4 + 3] = ca
        ribbonUvArr[k * 2] = 0; ribbonUvArr[k * 2 + 1] = 0.5
        k++
        // Right vertex
        ribbonPosArr[k * 3] = cx - nx * halfW
        ribbonPosArr[k * 3 + 1] = cy - ny * halfW
        ribbonPosArr[k * 3 + 2] = RIBBON_Z
        ribbonColArr[k * 4] = cr; ribbonColArr[k * 4 + 1] = cg
        ribbonColArr[k * 4 + 2] = cb; ribbonColArr[k * 4 + 3] = ca
        ribbonUvArr[k * 2] = 1; ribbonUvArr[k * 2 + 1] = 0.5
        k++
      }

      // Append a forward-facing semicircle to the same mesh. It shares the
      // ribbon's final edge, so there is no overlap, seam, or separate sprite.
      const headRadius = MAX_RIBBON_WIDTH * 0.5
      const forwardLen = Math.hypot(dirX, dirY) || 1
      const fx = dirX / forwardLen
      const fy = dirY / forwardLen
      const nx = -fy
      const ny = fx
      const centerIndex = k
      const arcStartIndex = centerIndex + 1
      const headR = 0.76
      const headG = 0.82
      const headB = 1
      const headA = 0.78 * life

      ribbonPosArr[k * 3] = slot.x
      ribbonPosArr[k * 3 + 1] = slot.y
      ribbonPosArr[k * 3 + 2] = RIBBON_Z
      ribbonColArr[k * 4] = headR
      ribbonColArr[k * 4 + 1] = headG
      ribbonColArr[k * 4 + 2] = headB
      ribbonColArr[k * 4 + 3] = headA
      ribbonUvArr[k * 2] = 0.5
      ribbonUvArr[k * 2 + 1] = 0.5
      k++

      for (let s = 0; s <= HEAD_CAP_SEGMENTS; s++) {
        const theta = Math.PI / 2 - (Math.PI * s) / HEAD_CAP_SEGMENTS
        const along = Math.cos(theta)
        const across = Math.sin(theta)
        ribbonPosArr[k * 3] =
          slot.x + (fx * along + nx * across) * headRadius
        ribbonPosArr[k * 3 + 1] =
          slot.y + (fy * along + ny * across) * headRadius
        ribbonPosArr[k * 3 + 2] = RIBBON_Z
        ribbonColArr[k * 4] = headR
        ribbonColArr[k * 4 + 1] = headG
        ribbonColArr[k * 4 + 2] = headB
        ribbonColArr[k * 4 + 3] = headA
        ribbonUvArr[k * 2] = 0.5 + across * 0.5
        ribbonUvArr[k * 2 + 1] = 0.5 - along * 0.5
        k++
      }

      const stripIndexCount = (n - 1) * 6
      // Cap indices occupy a moving offset while the trail is growing. Restore
      // every active strip segment first so indices written by the previous
      // frame can never leak into the ribbon body.
      for (let i = 0; i < n - 1; i++) {
        const vi = i * 2
        const off = i * 6
        ribbonIdxArr[off] = vi
        ribbonIdxArr[off + 1] = vi + 1
        ribbonIdxArr[off + 2] = vi + 2
        ribbonIdxArr[off + 3] = vi + 1
        ribbonIdxArr[off + 4] = vi + 3
        ribbonIdxArr[off + 5] = vi + 2
      }
      for (let s = 0; s < HEAD_CAP_SEGMENTS; s++) {
        const off = stripIndexCount + s * 3
        ribbonIdxArr[off] = centerIndex
        ribbonIdxArr[off + 1] = arcStartIndex + s
        ribbonIdxArr[off + 2] = arcStartIndex + s + 1
      }

      ribbonGeo.setDrawRange(
        0,
        stripIndexCount + HEAD_CAP_SEGMENTS * 3
      )
      ribbonGeo.attributes.position.needsUpdate = true
      ribbonGeo.attributes.color.needsUpdate = true
      ribbonGeo.attributes.uv.needsUpdate = true
      ribbonGeo.index.needsUpdate = true
    }

    // ==========================================
    // Mouse interaction
    // ==========================================
    let mouseX = 0, mouseY = 0
    let targetX = 0, targetY = 0

    const onMouseMove = (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 0.5
      targetY = (e.clientY / window.innerHeight - 0.5) * 0.3
    }
    window.addEventListener('mousemove', onMouseMove)

    // ==========================================
    // ==========================================
    // Animation
    // ==========================================
    let baseRotY = 0, baseRotX = 0
    let animationId
    let hasRenderedFirstFrame = false
    let lastFrameTime = performance.now()

    function animate(now = performance.now()) {
      animationId = requestAnimationFrame(animate)

      // Keep motion tied to elapsed time instead of the number of rendered
      // frames. Expensive overlays can lower mobile FPS; frame-based movement
      // otherwise appears to slow down and then suddenly speed up afterwards.
      const deltaSeconds = Math.min(Math.max((now - lastFrameTime) / 1000, 0), 0.05)
      const frameScale = deltaSeconds * 60
      lastFrameTime = now

      baseRotY += 0.0008 * frameScale
      baseRotX += 0.0002 * frameScale

      const pointerEase = 1 - Math.pow(0.95, frameScale)
      mouseX += (targetX - mouseX) * pointerEase
      mouseY += (targetY - mouseY) * pointerEase

      particles.rotation.y = baseRotY + mouseX * 0.3
      particles.rotation.x = baseRotX + mouseY * 0.2

      // Update shooting stars
      try {
        if (meteorsEnabledRef.current) {
          for (const slot of starSlots) {
            if (!slot.active) {
              slot.spawnTimer -= deltaSeconds
              if (slot.spawnTimer <= 0) spawnStar(slot)
              continue
            }

            // Add intermediate samples when FPS drops so the trail keeps the
            // same visual length and does not develop large gaps.
            const subSteps = Math.min(3, Math.max(1, Math.ceil(frameScale)))
            const stepScale = frameScale / subSteps
            for (let step = 0; step < subSteps; step++) {
              slot.life -= 0.0018 * stepScale

              slot.x += slot.dirX * stepScale
              slot.y += slot.dirY * stepScale

              // Turbulence
              const turbulenceScale = Math.sqrt(stepScale)
              slot.dirX += (Math.random() - 0.5) * 0.0006 * turbulenceScale
              slot.dirY += (Math.random() - 0.5) * 0.0006 * turbulenceScale
              const len = Math.hypot(slot.dirX, slot.dirY) || 1
              slot.dirX = (slot.dirX / len) * slot.speed
              slot.dirY = (slot.dirY / len) * slot.speed
              slot.ringData[slot.ringIdx * 2] = slot.x
              slot.ringData[slot.ringIdx * 2 + 1] = slot.y
              slot.ringIdx = (slot.ringIdx + 1) % RING_SIZE
              if (slot.ringLen < RING_SIZE) slot.ringLen++
            }

            buildRibbon(slot)

            const hx = slot.x
            const hy = slot.y
            if (slot.life <= 0 || Math.abs(hx) > 8.5 || Math.abs(hy) > 5.5) {
              despawnStar(slot)
            }
          }
        }
      } catch (e) {
        console.error('[Meteor] update error:', e)
      }

      renderer.render(scene, camera)
      if (!hasRenderedFirstFrame) {
        hasRenderedFirstFrame = true
        onReadyRef.current?.()
      }
    }
    animate()

    // ==========================================
    // Resize — throttled
    // ==========================================
    let resizeTimeout
    const onResize = () => {
      if (resizeTimeout) return
      resizeTimeout = setTimeout(() => {
        resizeTimeout = null
        const w = window.innerWidth
        const h = window.innerHeight
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }, 150)
    }
    window.addEventListener('resize', onResize)

    // ==========================================
    // Cleanup
    // ==========================================
    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      clearTimeout(resizeTimeout)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      lineGeo.dispose()
      lineMaterial.dispose()
      glowTex.dispose()
      for (const slot of starSlots) {
        scene.remove(slot.ribbon)
        slot.ribbonGeo.dispose()
        slot.ribbonMat.dispose()
      }
      if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={mountRef} className='particle-container' />
}
