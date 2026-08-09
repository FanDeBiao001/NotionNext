'use client'

import { useEffect, useRef } from 'react'

const CANVAS_SIZE = 150
const MOVING_SPEED = 30
const GRAVITY = 1000
const DRAG = 0.98
const BOUNCE_DAMPING = 0.7
const MIN_VELOCITY = 5
const MAX_VELOCITY = 1000

const ANIM_NAMES = ['Relax', 'Interact', 'Move', 'Sit', 'Sleep']
const ANIM_MARKOV = [
  [0.5, 0.0, 0.25, 0.15, 0.1],
  [1.0, 0.0, 0.0, 0.0, 0.0],
  [0.2, 0.0, 0.8, 0.0, 0.0],
  [0.3, 0.0, 0.0, 0.7, 0.0],
  [0.1, 0.0, 0.0, 0.0, 0.9]
]
const ANIM_VEHICLE = ['Relax', 'Interact', 'Move']
const ANIM_VEHICLE_MARKOV = [[0.5, 0.0, 0.5], [1.0, 0.0, 0.0], [0.3, 0.0, 0.7]]

function randomPick(probs) {
  let r = Math.random(), c = 0
  for (let i = 0; i < probs.length; i++) { c += probs[i]; if (r <= c) return i }
  return 0
}

export default function ShimejiPet() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let petInstance = null

    async function initPet() {
      try {
      // Load model registry
      const { SHIMEJI_MODELS } = await import('@/conf/shimeji.config')
      const models = SHIMEJI_MODELS

      // Persistence: restore last selected model
      const savedModelId = sessionStorage.getItem('shimeji-model')
      const initialModel = models.find(m => m.id === savedModelId) || models[0]

      // Dynamic import spine-webgl
      const spineModule = await import('@/lib/arkpets/spine-webgl.js')
      const spine = spineModule.default || spineModule
      const webgl = spine.webgl

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)

      // Create canvas
      const canvas = document.createElement('canvas')
      canvas.className = 'shimeji-canvas'
      canvas.id = 'shimeji-pet'
      canvas.style.cssText = 'position:fixed;top:0;left:0;z-index:1000;pointer-events:none;width:150px;height:150px'
      document.body.appendChild(canvas)

      // WebGL setup
      const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false })
      if (!gl) { console.warn('WebGL unavailable for ShimejiPet'); return }

      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

      // WebGL setup — render directly to canvas (outline via CSS drop-shadow)
      canvas.width = CANVAS_SIZE * pixelRatio
      canvas.height = CANVAS_SIZE * pixelRatio
      const shader = webgl.Shader.newTwoColoredTextured(gl)
      const batcher = new webgl.PolygonBatcher(gl)
      const skeletonRenderer = new webgl.SkeletonRenderer(new webgl.ManagedWebGLRenderingContext(gl))
      const assetManager = new webgl.AssetManager(gl)
      const mvp = new webgl.Matrix4()
      mvp.ortho2d(0, 0, canvas.width, canvas.height)

      // State
      let character = null
      let isVehicle = false
      let isDragging = false
      let dragStartX = 0, dragStartY = 0
      let lastDragEvent = null
      let velocity = { x: 0, y: 0 }
      let position = { x: Math.random() * (window.innerWidth - CANVAS_SIZE), y: window.innerHeight - CANVAS_SIZE - 40 }
      let animationId = null
      let lastFrameTime = Date.now() / 1000
      let currentAction = { animation: 'Relax', direction: 'right', timestamp: 0 }
      const mousePos = { x: 0, y: 0 }
      let isMouseOver = false
      let currentModel = initialModel

      // Menu
      function removeMenu() {
        const m = document.getElementById('shimeji-menu')
        if (m) m.remove()
      }

      function showMenu(e) {
        e.preventDefault()
        removeMenu()
        const menu = document.createElement('div')
        menu.id = 'shimeji-menu'
        menu.style.cssText = 'position:fixed;z-index:1001;background:#1a1a2e;border:1px solid #333;padding:4px 0;box-shadow:0 2px 8px rgba(0,0,0,0.5);font-size:13px;font-family:system-ui;color:#ddd;min-width:140px;border-radius:6px'
        menu.style.left = Math.min(e.pageX, window.innerWidth - 150) + 'px'
        menu.style.top = Math.min(e.pageY, window.innerHeight - 200) + 'px'

        const addItem = (text, onClick) => {
          const item = document.createElement('div')
          item.textContent = text
          item.style.cssText = 'padding:6px 16px;cursor:pointer;border-radius:4px;margin:2px 4px'
          item.onmouseover = () => item.style.background = '#333'
          item.onmouseout = () => item.style.background = 'transparent'
          item.onclick = () => { removeMenu(); onClick() }
          menu.appendChild(item)
        }

        addItem('切换角色 (' + currentModel.name + ') ▸', () => {
          const sub = document.createElement('div')
          sub.id = 'shimeji-submenu'
          sub.style.cssText = 'position:fixed;z-index:1002;background:#1a1a2e;border:1px solid #333;padding:4px 0;box-shadow:0 2px 8px rgba(0,0,0,0.5);font-size:13px;font-family:system-ui;color:#ddd;min-width:140px;max-height:300px;overflow-y:auto;border-radius:6px'
          const rect = menu.getBoundingClientRect()
          sub.style.left = (rect.right + 4) + 'px'
          sub.style.top = Math.min(rect.top, window.innerHeight - 310) + 'px'
          models.forEach(m => {
            const isActive = m.id === currentModel.id
            const item = document.createElement('div')
            item.textContent = (isActive ? '● ' : '○ ') + m.name
            item.style.cssText = 'padding:6px 16px;cursor:pointer;border-radius:4px;margin:2px 4px;' + (isActive ? 'color:#ffc107;font-weight:bold' : '')
            item.onmouseover = () => { if (!isActive) item.style.background = '#333' }
            item.onmouseout = () => { if (!isActive) item.style.background = 'transparent' }
            item.onclick = () => {
              if (isActive) return
              removeMenu(); sub.remove()
              sessionStorage.setItem('shimeji-model', m.id)
              loadModel(m)
            }
            sub.appendChild(item)
          })
          document.body.appendChild(sub)
          setTimeout(() => document.addEventListener('click', function h(e) {
            if (!sub.contains(e.target)) { sub.remove(); document.removeEventListener('click', h) }
          }), 0)
        })

        const anims = isVehicle ? ANIM_VEHICLE : ANIM_NAMES
        anims.forEach(anim => {
          addItem('动作: ' + anim, () => {
            currentAction = { animation: anim, direction: currentAction.direction, timestamp: 0 }
            if (character) character.state.setAnimation(0, anim, true)
          })
        })

        addItem('隐藏', () => {
          if (animationId) cancelAnimationFrame(animationId)
          canvas.remove()
          removeMenu()
        })

        document.body.appendChild(menu)
        setTimeout(() => document.addEventListener('click', function h(e) {
          if (!menu.contains(e.target)) { removeMenu(); document.removeEventListener('click', h) }
        }), 0)
      }

      // Load character model
      async function loadModel(model) {
        // Stop current render loop and clear character before switching
        if (animationId) { cancelAnimationFrame(animationId); animationId = null }
        character = null
        isVehicle = false

        currentModel = model

        function encodePath(p) { return encodeURIComponent(p).replace(/%2F/g, '/') }
        const resources = [model.skeleton, model.atlas, model.texture]
        const basePath = model.resourcePath || ''

        try {
          const dataUrls = await Promise.all(resources.map(async r => {
            const resp = await fetch(basePath + encodePath(r))
            if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${r}`)
            const blob = await resp.blob()
            return new Promise(resolve => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result)
              reader.readAsDataURL(blob)
            })
          }))

          resources.forEach((r, i) => assetManager.setRawDataURI(r, dataUrls[i]))
          assetManager.removeAll()

          assetManager.loadBinary(model.skeleton, () => {
            assetManager.loadTextureAtlas(model.atlas, () => {
              resources.forEach(r => assetManager.setRawDataURI(r, ''))
              initCharacter()
            })
          })
        } catch (err) {
          console.error('[Shimeji] Failed to load model:', model.name, err)
          // Fallback: stay with current state, animation will restart
          if (!animationId) animationId = requestAnimationFrame(render)
        }
      }

      function initCharacter() {
        const atlas = assetManager.get(currentModel.atlas)
        const atlasLoader = new spine.AtlasAttachmentLoader(atlas)
        const skeletonBinary = new spine.SkeletonBinary(atlasLoader)
        skeletonBinary.scale = 0.3 * 0.75 * pixelRatio
        const skeletonData = skeletonBinary.readSkeletonData(assetManager.get(currentModel.skeleton))
        const skeleton = new spine.Skeleton(skeletonData)

        isVehicle = !skeletonData.findAnimation('Sit') || !skeletonData.findAnimation('Sleep')

        const animStateData = new spine.AnimationStateData(skeleton.data)
        const names = isVehicle ? ANIM_VEHICLE : ANIM_NAMES
        names.forEach(a => names.forEach(b => { if (a !== b) animStateData.setMix(a, b, 0.3) }))
        const animState = new spine.AnimationState(animStateData)
        animState.setAnimation(0, 'Relax', true)

        animState.addListener({
          complete() {
            const markov = isVehicle ? ANIM_VEHICLE_MARKOV : ANIM_MARKOV
            const idx = names.indexOf(currentAction.animation)
            const nextIdx = randomPick(markov[idx])
            let dir = currentAction.direction
            if (currentAction.animation === 'Relax' && names[nextIdx] === 'Move' && Math.random() < 0.4) {
              dir = dir === 'left' ? 'right' : 'left'
            }
            currentAction = { animation: names[nextIdx], direction: dir, timestamp: 0 }
            animState.setAnimation(0, currentAction.animation, true)
          }
        })

        skeleton.x = canvas.width / 2; skeleton.y = 0
        character = { skeleton, state: animState }
        lastFrameTime = Date.now() / 1000
        if (!animationId) animationId = requestAnimationFrame(render)
      }

      // Render loop
      function render() {
        const now = Date.now() / 1000
        const delta = Math.min(now - lastFrameTime, 0.1)
        lastFrameTime = now
        currentAction.timestamp += delta

        if (!isDragging) {
          velocity.y += GRAVITY * delta
          velocity.x *= DRAG; velocity.y *= DRAG
          if (Math.abs(velocity.x) < MIN_VELOCITY) velocity.x = 0
          if (Math.abs(velocity.y) < MIN_VELOCITY) velocity.y = 0
          velocity.x = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity.x))
          velocity.y = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity.y))
          position.x += velocity.x * delta; position.y += velocity.y * delta

          const maxX = window.innerWidth - CANVAS_SIZE
          const maxY = window.innerHeight - CANVAS_SIZE
          if (position.x < 0) { position.x = 0; velocity.x *= -BOUNCE_DAMPING }
          if (position.x > maxX) { position.x = maxX; velocity.x *= -BOUNCE_DAMPING }
          if (position.y < 0) { position.y = 0; velocity.y = 0 }
          if (position.y > maxY) { position.y = maxY; velocity.y = 0 }
        }

        if (currentAction.animation === 'Move') {
          const move = MOVING_SPEED * delta
          if (currentAction.direction === 'left') {
            position.x = Math.max(0, position.x - move)
            if (position.x <= 0) currentAction.direction = 'right'
          } else {
            position.x = Math.min(window.innerWidth - CANVAS_SIZE, position.x + move)
            if (position.x >= window.innerWidth - CANVAS_SIZE) currentAction.direction = 'left'
          }
        }

        canvas.style.transform = `translate(${position.x}px, ${position.y}px)`

        if (character) {
          character.skeleton.scaleX = currentAction.direction === 'left' ? -1 : 1
          character.state.update(delta)
          character.state.apply(character.skeleton)
          character.skeleton.updateWorldTransform()

          // Render directly to canvas
          gl.viewport(0, 0, canvas.width, canvas.height)
          gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)

          shader.bind()
          shader.setUniformi(webgl.Shader.SAMPLER, 0)
          shader.setUniform4x4f(webgl.Shader.MVP_MATRIX, mvp.values)
          batcher.begin(shader)
          skeletonRenderer.premultipliedAlpha = false
          skeletonRenderer.draw(batcher, character.skeleton)
          batcher.end()
          shader.unbind()

          // Mouse-over detection
          const rect = canvas.getBoundingClientRect()
          const px = (mousePos.x - rect.x) * pixelRatio
          const py = canvas.height - (mousePos.y - rect.y) * pixelRatio
          if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
            const pixel = new Uint8Array(4)
            gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
            isMouseOver = pixel[3] !== 0
            canvas.style.pointerEvents = isMouseOver ? 'auto' : 'none'
            // CSS drop-shadow for outline effect (browser-native, always correct)
            canvas.style.filter = isMouseOver
              ? 'drop-shadow(1px 0 0 #ffc107) drop-shadow(-1px 0 0 #ffc107) drop-shadow(0 1px 0 #ffc107) drop-shadow(0 -1px 0 #ffc107)'
              : 'none'
          } else {
            isMouseOver = false
            canvas.style.pointerEvents = 'none'
            canvas.style.filter = 'none'
          }
        }

        animationId = requestAnimationFrame(render)
      }

      // Event handlers
      document.addEventListener('mousemove', e => { mousePos.x = e.clientX; mousePos.y = e.clientY })

      canvas.addEventListener('click', () => {
        if (character) {
          currentAction = { animation: 'Interact', direction: currentAction.direction, timestamp: 0 }
          character.state.setAnimation(0, 'Interact', false)
        }
      })
      canvas.addEventListener('contextmenu', showMenu)

      function dragStart(e) {
        if (e.button !== undefined && e.button !== 0) return
        isDragging = true
        const cx = e.touches ? e.touches[0].clientX : e.clientX
        const cy = e.touches ? e.touches[0].clientY : e.clientY
        dragStartX = cx - position.x; dragStartY = cy - position.y
        if (character) {
          character.state.setAnimation(0, 'Relax', true)
          currentAction = { animation: 'Relax', direction: currentAction.direction, timestamp: 0 }
        }
      }
      function dragMove(e) {
        if (!isDragging) return
        const cx = e.touches ? e.touches[0].clientX : e.clientX
        const cy = e.touches ? e.touches[0].clientY : e.clientY
        const newX = cx - dragStartX; const newY = cy - dragStartY
        if (lastDragEvent) {
          const dt = (e.timeStamp - lastDragEvent.timeStamp) / 1000
          if (dt > 0) { velocity.x = (newX - position.x) / dt; velocity.y = (newY - position.y) / dt }
        }
        position.x = newX; position.y = newY
        lastDragEvent = e
        if (e.touches) e.preventDefault()
      }
      function dragEnd() { isDragging = false; lastDragEvent = null }

      canvas.addEventListener('mousedown', dragStart)
      canvas.addEventListener('touchstart', dragStart, { passive: false })
      document.addEventListener('mousemove', dragMove)
      document.addEventListener('touchmove', dragMove, { passive: false })
      document.addEventListener('mouseup', dragEnd)
      document.addEventListener('touchend', dragEnd)

      // Start
      loadModel(initialModel)

      // Cleanup
      petInstance = {
        destroy() {
          if (animationId) cancelAnimationFrame(animationId)
          removeMenu()
          canvas.remove()
        }
      }
      } catch (err) {
        console.warn('[ShimejiPet] init failed:', err.message)
      }
    }

    initPet()

    return () => {
      if (petInstance) petInstance.destroy()
    }
  }, [])

  return null
}
