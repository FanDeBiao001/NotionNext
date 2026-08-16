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
      // IndexedDB helpers with LRU eviction (max 3 remote models)
      const MAX_CACHED = 3
      function openDB() {
        return new Promise((resolve, reject) => {
          const req = indexedDB.open('shimeji-cache', 1)
          req.onupgradeneeded = () => { req.result.createObjectStore('models') }
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
      }
      async function cacheModel(model, dataUrls) {
        try {
          const db = await openDB()
          const tx = db.transaction('models', 'readwrite')
          const store = tx.objectStore('models')
          store.put({ id: model.id, dataUrls, ts: Date.now() }, model.id)
          // LRU eviction: keep only MAX_CACHED most recent
          const all = await new Promise(resolve => {
            const req = store.getAll()
            req.onsuccess = () => resolve(req.result || [])
            req.onerror = () => resolve([])
          })
          if (all.length > MAX_CACHED) {
            all.sort((a, b) => b.ts - a.ts)
            for (let i = MAX_CACHED; i < all.length; i++) store.delete(all[i].id)
          }
        } catch (e) {}
      }
      async function getCachedModel(modelId) {
        try {
          const db = await openDB()
          return new Promise(resolve => {
            const tx = db.transaction('models', 'readonly')
            const req = tx.objectStore('models').get(modelId)
            req.onsuccess = () => resolve(req.result || null)
            req.onerror = () => resolve(null)
          })
        } catch (e) { return null }
      }

      // Load local models
      const { LOCAL_MODELS } = await import('@/conf/shimeji.config')
      const localModels = LOCAL_MODELS
      let allModels = [...localModels]

      // CORS proxy for all external requests
      const PROXY = '/api/shimeji/proxy?url='
      async function sfetch(url, opts) { return fetch(PROXY + encodeURIComponent(url), opts) }

      // Load character name mapping (overridable via /shimeji-names.json)
      let charNames = {}
      try {
        const resp = await fetch('/shimeji-names.json')
        if (resp.ok) charNames = await resp.json()
      } catch (e) { /* use empty mapping */ }

      // Format codename as fallback: "jnight" → "Jnight", "surtr" → "Surtr"
      function modelDisplayName(dirName) {
        if (charNames[dirName]) return charNames[dirName]
        const parts = dirName.split('_')
        const code = parts.length > 1 ? parts.slice(1).join('_') : dirName
        return code.charAt(0).toUpperCase() + code.slice(1)
      }

      // Fetch remote model list from GitHub API (cached in sessionStorage)
      const GITHUB_API = 'https://api.github.com/repos/isHarryh/Ark-Models/contents/models'
      const RAW_BASE = 'https://raw.githubusercontent.com/isHarryh/Ark-Models/refs/heads/main/models/'
      const CACHE_KEY = 'shimeji-remote-v2'
      const CACHE_TS_KEY = 'shimeji-remote-ts-v2'
      const CACHE_TTL = 3600000 // 1 hour

      try {
        let remoteModels = null
        const cached = sessionStorage.getItem(CACHE_KEY)
        const cachedTs = sessionStorage.getItem(CACHE_TS_KEY)
        if (cached && cachedTs && (Date.now() - Number(cachedTs)) < CACHE_TTL) {
          remoteModels = JSON.parse(cached)
        } else {
          const resp = await sfetch(GITHUB_API)
          if (resp.ok) {
            const dirs = await resp.json()
            remoteModels = dirs
              .filter(d => d.type === 'dir')
              .map(d => ({
                id: 'char_' + d.name,
                name: modelDisplayName(d.name),
                skeleton: `build_char_${d.name}.skel`,
                atlas: `build_char_${d.name}.atlas`,
                texture: `build_char_${d.name}.png`,
                resourcePath: RAW_BASE + encodeURIComponent(d.name) + '/',
                source: 'remote'
              }))
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(remoteModels))
            sessionStorage.setItem(CACHE_TS_KEY, String(Date.now()))
          }
        }
        if (remoteModels) {
          const localIds = new Set(localModels.map(m => m.id))
          for (const rm of remoteModels) {
            if (!localIds.has(rm.id)) allModels.push(rm)
          }
        }
      } catch (e) { /* remote unavailable, use local only */ }

      // Restore last selected model
      const savedModelId = localStorage.getItem('shimeji-model')
      let initialModel = allModels.find(m => m.id === savedModelId) || localModels[0]

      // Dynamic import spine-webgl
      const spineModule = await import('@/lib/arkpets/spine-webgl.js')
      const spine = spineModule.default || spineModule
      const webgl = spine.webgl

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const isTouchDevice = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0

      // Create canvas
      const canvas = document.createElement('canvas')
      canvas.className = 'shimeji-canvas'
      canvas.id = 'shimeji-pet'
      canvas.style.cssText = 'position:fixed;top:0;left:0;z-index:1000;pointer-events:none;width:150px;height:150px'
      document.body.appendChild(canvas)
      // 移动端无 hover，直接让宠物可点按；桌面端仍由 readPixels 按像素控制 pointer-events
      if (isTouchDevice) canvas.style.pointerEvents = 'auto'

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
      const failedModels = new Set()

      // Toast notification
      function showToast(msg) {
        const existing = document.getElementById('shimeji-toast')
        if (existing) existing.remove()
        const toast = document.createElement('div')
        toast.id = 'shimeji-toast'
        toast.textContent = msg
        toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9999;background:#1a1a2e;color:#ffc107;padding:10px 24px;border-radius:8px;font-size:14px;font-family:system-ui;box-shadow:0 4px 12px rgba(0,0,0,0.5);opacity:0;transition:opacity 0.3s'
        document.body.appendChild(toast)
        requestAnimationFrame(() => { toast.style.opacity = '1' })
        setTimeout(() => {
          toast.style.opacity = '0'
          setTimeout(() => toast.remove(), 300)
        }, 3500)
      }

      // Menu
      function removeMenu() {
        const m = document.getElementById('shimeji-menu')
        if (m) m.remove()
      }

      let activeSub = null

      function closeAll() {
        removeMenu()
        if (activeSub) { activeSub.remove(); activeSub = null }
      }

      function showMenu(e) {
        e.preventDefault(); e.stopPropagation()
        closeAll()

        const menu = document.createElement('div')
        menu.id = 'shimeji-menu'
        menu.style.cssText = 'position:fixed;z-index:1001;background:#1a1a2e;border:1px solid #333;padding:4px 0;box-shadow:0 2px 8px rgba(0,0,0,0.5);font-size:13px;font-family:system-ui;color:#ddd;min-width:140px;border-radius:6px'
        const x = Math.min(e.pageX, window.innerWidth - 300)
        const y = Math.min(e.pageY, window.innerHeight - 200)
        menu.style.left = Math.max(0, x) + 'px'
        menu.style.top = Math.max(0, y) + 'px'

        function addItem(text, onEnter, onLeave, onClick) {
          const item = document.createElement('div')
          item.textContent = text
          item.style.cssText = 'padding:6px 16px;cursor:pointer;border-radius:4px;margin:2px 4px'
          item.onmouseenter = () => { item.style.background = '#333'; if (onEnter) onEnter(item) }
          item.onmouseleave = () => { item.style.background = 'transparent'; if (onLeave) onLeave() }
          item.onclick = (ev) => { ev.stopPropagation(); closeAll(); if (onClick) onClick() }
          menu.appendChild(item)
          return item
        }

        // Submenu on hover (desktop) or click (mobile)
        function buildSubmenu(parentItem) {
          if (activeSub) { activeSub.remove(); activeSub = null }
          const sub = document.createElement('div')
          sub.style.cssText = 'position:fixed;z-index:1002;background:#1a1a2e;border:1px solid #333;padding:4px 0;box-shadow:0 2px 8px rgba(0,0,0,0.5);font-size:12px;font-family:system-ui;color:#ddd;min-width:130px;max-height:300px;overflow-y:auto;border-radius:6px'
          const r = parentItem.getBoundingClientRect()
          sub.style.left = Math.min(r.right + 4, window.innerWidth - 140) + 'px'
          sub.style.top = Math.max(0, Math.min(r.top, window.innerHeight - 310)) + 'px'

          allModels.forEach(m => {
            const isActive = m.id === currentModel.id
            const isFailed = failedModels.has(m.id)
            const mi = document.createElement('div')
            mi.textContent = (isActive ? '● ' : '○ ') + m.name +
              (m.source === 'local' ? '' : ' ☁️') +
              (isFailed ? ' ❌' : '')
            mi.style.cssText = 'padding:6px 16px;border-radius:4px;margin:2px 4px;' +
              (isActive ? 'color:#ffc107;font-weight:bold' : isFailed ? 'color:#666;cursor:not-allowed' : 'cursor:pointer')
            if (!isFailed) {
              mi.onmouseover = () => { if (!isActive) mi.style.background = '#333' }
              mi.onmouseout = () => { if (!isActive) mi.style.background = 'transparent' }
              mi.onclick = (ev) => { ev.stopPropagation(); if (!isActive) { closeAll(); loadModel(m) } }
            }
            sub.appendChild(mi)
          })
          document.body.appendChild(sub)
          activeSub = sub
        }

        const switchItem = addItem('切换角色 (' + currentModel.name + ') ▸',
          (parentItem) => { buildSubmenu(parentItem) },
          () => {
            // Don't close sub immediately — let user move mouse to it
            setTimeout(() => {
              if (activeSub && !activeSub.matches(':hover')) {
                activeSub.remove(); activeSub = null
              }
            }, 200)
          },
          null // no click action
        )
        // 点击切换展开/收起子菜单（移动端无 hover）
        switchItem.onclick = (ev) => {
          ev.stopPropagation()
          if (activeSub) {
            activeSub.remove(); activeSub = null
          } else {
            buildSubmenu(switchItem)
          }
        }

        const anims = isVehicle ? ANIM_VEHICLE : ANIM_NAMES
        anims.forEach(anim => {
          addItem('动作: ' + anim, null, null, () => {
            currentAction = { animation: anim, direction: currentAction.direction, timestamp: 0 }
            if (character) character.state.setAnimation(0, anim, true)
          })
        })

        addItem('隐藏', null, null, () => {
          if (animationId) cancelAnimationFrame(animationId)
          canvas.remove()
        })

        document.body.appendChild(menu)

        // Click outside: close both if neither menu nor submenu is clicked
        const openedAt = Date.now()
        setTimeout(() => document.addEventListener('mousedown', function h(ev) {
          // 忽略长按释放瞬间产生的合成 mousedown，避免菜单刚出现就被关闭
          if (Date.now() - openedAt < 500) return
          const hitMenu = menu.contains(ev.target)
          const hitSub = activeSub && activeSub.contains(ev.target)
          if (!hitMenu && !hitSub) { closeAll(); document.removeEventListener('mousedown', h) }
        }), 0)

        // If sub is open, check if mouse leaves sub → close sub only
        if (activeSub) {
          activeSub.addEventListener('mouseleave', () => {
            setTimeout(() => {
              if (activeSub && !activeSub.matches(':hover') && !menu.matches(':hover')) {
                activeSub.remove(); activeSub = null
              }
            }, 100)
          })
        }
      }

      // Load character model — NEVER stops old pet until new one is fully rendered
      async function loadModel(model) {
        if (currentModel.id === model.id && character) return

        const resources = [model.skeleton, model.atlas, model.texture]
        const basePath = model.resourcePath || ''
        console.log('[Shimeji] Loading:', model.name, 'source:', model.source || 'local')

        try {
          let dataUrls
          const cached = model.source === 'remote' ? await getCachedModel(model.id) : null
          if (cached && cached.dataUrls) {
            dataUrls = cached.dataUrls
            console.log('[Shimeji] Using cached model:', model.name)
          } else {
            // Download sequentially to avoid overwhelming proxy/timeout
            dataUrls = []
            for (const r of resources) {
              const url = basePath + encodeURIComponent(r)
              const resp = await sfetch(url)
              if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${r}`)
              const blob = await resp.blob()
              dataUrls.push(await new Promise(resolve => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result)
                reader.readAsDataURL(blob)
              }))
            }
            if (model.source === 'remote') await cacheModel(model, dataUrls)
            console.log('[Shimeji] Downloaded model:', model.name)
          }

          // Set raw data then load binary+atlas (yield to render loop first)
          resources.forEach((r, i) => assetManager.setRawDataURI(r, dataUrls[i]))
          await new Promise(r => requestAnimationFrame(r))
          assetManager.removeAll()

          await new Promise((resolveLoad, rejectLoad) => {
            const timeout = setTimeout(() => rejectLoad(new Error('timeout')), 15000)
            assetManager.loadBinary(model.skeleton, () => {
              assetManager.loadTextureAtlas(model.atlas, () => {
                clearTimeout(timeout)
                resolveLoad()
              })
            })
          })

          resources.forEach(r => assetManager.setRawDataURI(r, ''))
          currentModel = model
          localStorage.setItem('shimeji-model', model.id)

          if (animationId) { cancelAnimationFrame(animationId); animationId = null }
          character = null; isVehicle = false
          await new Promise(r => requestAnimationFrame(r))
          initCharacter()
          console.log('[Shimeji] Switched to:', model.name)

        } catch (err) {
          console.warn('[Shimeji] Load failed for', model.name, err.message)
          showToast('资源加载失败，请检查网络后重试')
          failedModels.add(model.id)
          // Clear broken localStorage entry
          if (localStorage.getItem('shimeji-model') === model.id) {
            localStorage.removeItem('shimeji-model')
          }
          // Try first local model as fallback
          if (!character && allModels.length > 0) {
            const fallback = allModels.find(m => m.source === 'local') || allModels[0]
            if (fallback && fallback.id !== model.id) {
              console.warn('[Shimeji] Falling back to:', fallback.name)
              showToast(model.name + ' 加载失败，已切换至 ' + fallback.name)
              loadModel(fallback)
              return
            }
          }
          if (!animationId && character) animationId = requestAnimationFrame(render)
        }
      }

      function initCharacter() {
        try {
          const atlas = assetManager.get(currentModel.atlas)
          if (!atlas) throw new Error('atlas asset not loaded')
          const atlasLoader = new spine.AtlasAttachmentLoader(atlas)
          const skeletonBinary = new spine.SkeletonBinary(atlasLoader)
          skeletonBinary.scale = 0.3 * 0.75 * pixelRatio

          const skelAsset = assetManager.get(currentModel.skeleton)
          if (!skelAsset) throw new Error('skeleton asset not loaded')
          const skeletonData = skeletonBinary.readSkeletonData(skelAsset)
          const skeleton = new spine.Skeleton(skeletonData)

          isVehicle = !skeletonData.findAnimation('Sit') || !skeletonData.findAnimation('Sleep')

          // Reset action if current animation doesn't exist in this model
          const names = isVehicle ? ANIM_VEHICLE : ANIM_NAMES
          if (!names.includes(currentAction.animation)) {
            currentAction = { animation: 'Relax', direction: 'right', timestamp: 0 }
          }

          const animStateData = new spine.AnimationStateData(skeleton.data)
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
        } catch (err) {
          console.error('[Shimeji] initCharacter failed:', err.message)
          // Restart render to keep canvas alive even if character is null
          if (!animationId) animationId = requestAnimationFrame(render)
        }
      }

      // Render loop
      let readPixelsSkip = 0

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

          // Mouse-over detection (throttled to every 4th frame — expensive readPixels)
          readPixelsSkip++
          if (readPixelsSkip % 6 === 0) {
            const rect = canvas.getBoundingClientRect()
            const px = (mousePos.x - rect.x) * pixelRatio
            const py = canvas.height - (mousePos.y - rect.y) * pixelRatio
            if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
              const pixel = new Uint8Array(4)
              gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
              const wasMouseOver = isMouseOver
              isMouseOver = pixel[3] !== 0
              if (isMouseOver !== wasMouseOver) {
                canvas.style.pointerEvents = isMouseOver ? 'auto' : 'none'
                canvas.style.filter = isMouseOver
                  ? 'drop-shadow(1px 0 0 #ffc107) drop-shadow(-1px 0 0 #ffc107) drop-shadow(0 1px 0 #ffc107) drop-shadow(0 -1px 0 #ffc107)'
                  : 'none'
              }
            } else if (isMouseOver) {
              isMouseOver = false
              canvas.style.pointerEvents = 'none'
              canvas.style.filter = 'none'
            }
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
      // Suppress browser context menu on pet + show custom menu
      document.addEventListener('contextmenu', (e) => {
        const rect = canvas.getBoundingClientRect()
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          e.preventDefault()
          e.stopPropagation()
          closeAll()
          showMenu(e)
        }
      }, true)

      // 移动端长按打开菜单
      let longPressTimer = null
      let longPressStartX = 0
      let longPressStartY = 0
      const LONG_PRESS_MS = 500
      const LONG_PRESS_TOLERANCE = 12

      function cancelLongPress() {
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
      }

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
        const cx = e.touches ? e.touches[0].clientX : e.clientX
        const cy = e.touches ? e.touches[0].clientY : e.clientY
        if (e.touches) {
          const dx = cx - longPressStartX
          const dy = cy - longPressStartY
          if (dx * dx + dy * dy > LONG_PRESS_TOLERANCE * LONG_PRESS_TOLERANCE) cancelLongPress()
        }
        if (!isDragging) return
        const newX = cx - dragStartX; const newY = cy - dragStartY
        if (lastDragEvent) {
          const dt = (e.timeStamp - lastDragEvent.timeStamp) / 1000
          if (dt > 0) { velocity.x = (newX - position.x) / dt; velocity.y = (newY - position.y) / dt }
        }
        position.x = newX; position.y = newY
        lastDragEvent = e
        if (e.touches) e.preventDefault()
      }
      function dragEnd() { isDragging = false; lastDragEvent = null; cancelLongPress() }

      canvas.addEventListener('mousedown', dragStart)
      canvas.addEventListener('touchstart', dragStart, { passive: false })
      // 长按手势：在移动阈值内按住 500ms 打开菜单（与 dragStart 并存）
      canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return
        const t = e.touches[0]
        longPressStartX = t.clientX
        longPressStartY = t.clientY
        cancelLongPress()
        longPressTimer = setTimeout(() => {
          isDragging = false
          showMenu({ pageX: longPressStartX, pageY: longPressStartY, preventDefault: () => {}, stopPropagation: () => {} })
        }, LONG_PRESS_MS)
      }, { passive: true })
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
