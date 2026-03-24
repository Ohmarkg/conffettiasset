import './styles.css'

import { createConfettiInstance, playConfetti, PRESETS, type PlaybackHandle } from './confetti'
import { CanvasRecorder, downloadBlob } from './recorder'
import { exportPngSequenceZip } from './pngSequence'
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CAPTURE_FPS,
  DEFAULT_EFFECT,
  DEFAULT_SCENE,
  EXPORT_DPR,
  paletteFromText,
  paletteToText,
  sanitizeEffect,
  sanitizeRenderSettings,
  sanitizeScene,
  type EffectConfig,
  type SceneConfig,
  type ConfettiShape,
} from './state'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('#app not found')

app.innerHTML = `
  <div class="topbar">
    <div>
      <h1>Confetti Video Maker</h1>
      <div class="hint">Capture is fixed at <span class="mono">${CANVAS_WIDTH}×${CANVAS_HEIGHT}</span> @ <span class="mono">60fps</span> (download WebM or PNG ZIP).</div>
    </div>
    <div class="hint">Tip: use a short burst, then record 3–10s for crisp results.</div>
  </div>

  <div class="layout">
    <div class="stage">
      <div class="stageHeader">
        <div class="badge">Canvas (preview is scaled; capture is full-res)</div>
        <div class="badge" id="recStatus">Idle</div>
      </div>
      <div class="stageCanvasWrap">
        <canvas id="fx" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}"></canvas>
      </div>
    </div>

    <div class="panel">
      <div class="row">
        <label>Preset (loads into selected effect)</label>
        <select id="preset"></select>
      </div>

      <div class="row">
        <label>Effects</label>
        <div class="row two" style="margin:0;">
          <select id="effectSelect"></select>
          <button id="effectAdd">Add</button>
        </div>
        <div class="row two" style="margin:0;">
          <button id="effectDuplicate">Duplicate</button>
          <button id="effectRemove">Remove</button>
        </div>
      </div>

      <div class="row two">
        <div>
          <label>Mode</label>
          <select id="mode">
            <option value="burst">Burst</option>
            <option value="fountain">Fountain</option>
          </select>
        </div>
        <div>
          <label>Duration (seconds)</label>
          <input id="durationSeconds" type="number" min="0.25" max="120" step="0.25" />
        </div>
      </div>

      <div class="row two">
        <div>
          <label>Burst count</label>
          <input id="burstCount" type="number" min="1" max="50" step="1" />
        </div>
        <div>
        </div>
      </div>

      <div class="row two">
        <div>
          <label>Background</label>
          <select id="background">
            <option value="solid">Solid</option>
            <option value="transparent">Transparent</option>
          </select>
        </div>
        <div>
          <label>Background color</label>
          <input id="backgroundColor" type="text" placeholder="#0b0b10" />
        </div>
      </div>

      <div class="row two">
        <div>
          <label>Particle count</label>
          <input id="particleCount" type="number" min="1" max="2000" step="1" />
        </div>
        <div>
          <label>Spread</label>
          <input id="spread" type="number" min="0" max="360" step="1" />
        </div>
      </div>

      <div class="row two">
        <div>
          <label>Start velocity</label>
          <input id="startVelocity" type="number" min="0" max="200" step="1" />
        </div>
        <div>
          <label>Gravity</label>
          <input id="gravity" type="number" min="-5" max="10" step="0.05" />
        </div>
      </div>

      <div class="row two">
        <div>
          <label>Size (scalar)</label>
          <input id="scalar" type="number" min="0.1" max="10" step="0.05" />
        </div>
        <div>
          <label>Decay</label>
          <input id="decay" type="number" min="0.5" max="1" step="0.01" />
        </div>
      </div>

      <div class="row">
        <label>Fountain length (ticks)</label>
        <input id="fountainTicks" type="number" min="30" max="2000" step="1" />
        <div class="hint" style="margin-top:6px;">Only used for <span class="mono">Fountain</span> mode. Higher = particles live longer.</div>
      </div>

      <div class="row two">
        <div>
          <label>Angle</label>
          <input id="angle" type="number" min="0" max="360" step="1" />
        </div>
        <div>
          <label>Origin (x, y)</label>
          <div class="row two" style="margin:0;">
            <input id="originX" type="number" min="0" max="1" step="0.01" />
            <input id="originY" type="number" min="0" max="1" step="0.01" />
          </div>
        </div>
      </div>

      <div class="row two">
        <div>
          <label>Shapes</label>
          <div class="row two" style="margin:0;">
            <label style="display:flex;align-items:center;gap:8px;color:var(--text);font-size:13px;">
              <input id="shapeSquare" type="checkbox" /> square
            </label>
            <label style="display:flex;align-items:center;gap:8px;color:var(--text);font-size:13px;">
              <input id="shapeCircle" type="checkbox" /> circle
            </label>
          </div>
        </div>
        <div>
          <label>Colors (comma-separated)</label>
          <input id="colors" type="text" />
        </div>
      </div>

      <div class="buttons">
        <button class="primary" id="play">Play effect</button>
        <button id="stop">Stop</button>
        <button class="primary" id="record">Start recording</button>
        <button id="download" disabled>Download WebM</button>
        <button id="exportPngZip">Export PNG ZIP</button>
      </div>

      <div class="buttons" style="margin-top:10px;">
        <button id="export">Export preset JSON</button>
        <button id="import">Import preset JSON</button>
      </div>

      <div class="kvs">
        <div class="small">FFmpeg MP4 convert (optional)</div>
        <button id="copyFfmpeg">Copy</button>
        <div class="mono" style="grid-column:1 / -1; user-select:text;" id="ffmpegCmd"></div>
      </div>

      <div id="error" class="error" style="display:none;"></div>
    </div>
  </div>
`

const fxCanvas = must<HTMLCanvasElement>('fx')
const presetEl = must<HTMLSelectElement>('preset')
const effectSelectEl = must<HTMLSelectElement>('effectSelect')
const recStatusEl = must<HTMLDivElement>('recStatus')
const errorEl = must<HTMLDivElement>('error')

const recorder = new CanvasRecorder()
const confettiFx = createConfettiInstance(fxCanvas)

let scene: SceneConfig = DEFAULT_SCENE
let selectedEffectIdx = 0
let playbacks: PlaybackHandle[] = []
let lastRecording: { blob: Blob; filename: string } | null = null
let statusTimer: number | null = null
let isExportingPngZip = false

const presetItems: EffectConfig[] = [DEFAULT_EFFECT, ...PRESETS]
for (const p of presetItems) {
  const opt = document.createElement('option')
  opt.value = p.name
  opt.textContent = p.name
  presetEl.appendChild(opt)
}
presetEl.value = DEFAULT_EFFECT.name

function effectLabel(e: EffectConfig, idx: number) {
  const base = (e.name || `Effect ${idx + 1}`).trim()
  return `${idx + 1}. ${base}`
}

function refreshEffectSelect() {
  effectSelectEl.innerHTML = ''
  scene.effects.forEach((e, idx) => {
    const opt = document.createElement('option')
    opt.value = String(idx)
    opt.textContent = effectLabel(e, idx)
    effectSelectEl.appendChild(opt)
  })
  selectedEffectIdx = clampIdx(selectedEffectIdx, scene.effects.length)
  effectSelectEl.value = String(selectedEffectIdx)
}

function setError(message: string | null) {
  if (!message) {
    errorEl.style.display = 'none'
    errorEl.textContent = ''
    return
  }
  errorEl.style.display = 'block'
  errorEl.textContent = message
}

function applyBackground() {
  if (scene.background === 'transparent') {
    fxCanvas.style.background = 'transparent'
    const ctx = fxCanvas.getContext('2d')
    ctx?.clearRect(0, 0, fxCanvas.width, fxCanvas.height)
    return
  }
  fxCanvas.style.background = scene.backgroundColor
  const ctx = fxCanvas.getContext('2d')
  if (ctx) {
    ctx.save()
    ctx.fillStyle = scene.backgroundColor
    ctx.fillRect(0, 0, fxCanvas.width, fxCanvas.height)
    ctx.restore()
  }
}

function hydrateForm(from: EffectConfig) {
  setVal('mode', from.mode)
  setVal('durationSeconds', String(from.durationSeconds))
  setVal('burstCount', String(from.burstCount))

  setVal('particleCount', String(from.particleCount))
  setVal('spread', String(from.spread))
  setVal('startVelocity', String(from.startVelocity))
  setVal('gravity', String(from.gravity))
  setVal('scalar', String(from.scalar))
  setVal('decay', String(from.decay))
  setVal('fountainTicks', String(from.fountainTicks))
  setVal('angle', String(from.angle))
  setVal('originX', String(from.originX))
  setVal('originY', String(from.originY))

  must<HTMLInputElement>('shapeSquare').checked = from.shapes.includes('square')
  must<HTMLInputElement>('shapeCircle').checked = from.shapes.includes('circle')
  setVal('colors', paletteToText(from.colors))
}

function readEffectForm(): EffectConfig {
  const shapes: ConfettiShape[] = []
  if (must<HTMLInputElement>('shapeSquare').checked) shapes.push('square')
  if (must<HTMLInputElement>('shapeCircle').checked) shapes.push('circle')

  const partial: Partial<EffectConfig> = {
    name: scene.effects[selectedEffectIdx]?.name ?? `Effect ${selectedEffectIdx + 1}`,
    mode: must<HTMLSelectElement>('mode').value === 'fountain' ? 'fountain' : 'burst',
    durationSeconds: Number(must<HTMLInputElement>('durationSeconds').value),
    burstCount: Number(must<HTMLInputElement>('burstCount').value),
    particleCount: Number(must<HTMLInputElement>('particleCount').value),
    spread: Number(must<HTMLInputElement>('spread').value),
    startVelocity: Number(must<HTMLInputElement>('startVelocity').value),
    gravity: Number(must<HTMLInputElement>('gravity').value),
    scalar: Number(must<HTMLInputElement>('scalar').value),
    decay: Number(must<HTMLInputElement>('decay').value),
    fountainTicks: Number(must<HTMLInputElement>('fountainTicks').value),
    angle: Number(must<HTMLInputElement>('angle').value),
    originX: Number(must<HTMLInputElement>('originX').value),
    originY: Number(must<HTMLInputElement>('originY').value),
    shapes,
    colors: paletteFromText(must<HTMLInputElement>('colors').value),
  }

  return sanitizeEffect(partial)
}

function readSceneForm(): SceneConfig {
  const partial: Partial<SceneConfig> = {
    background: must<HTMLSelectElement>('background').value === 'transparent' ? 'transparent' : 'solid',
    backgroundColor: must<HTMLInputElement>('backgroundColor').value,
    effects: scene.effects,
  }
  return sanitizeScene(partial)
}

function stopPlaybacks() {
  for (const p of playbacks) p.stop()
  playbacks = []
}

function syncSelectedEffectFromForm() {
  const next = readEffectForm()
  scene.effects[selectedEffectIdx] = next
}

function playAll() {
  setError(null)
  stopPlaybacks()
  scene = readSceneForm()
  syncSelectedEffectFromForm()
  applyBackground()
  const effects = scene.effects.map((e) => sanitizeEffect(e))
  playbacks = effects.map((e) => playConfetti(confettiFx, e))
  void Promise.allSettled(playbacks.map((p) => p.done)).finally(() => {
    playbacks = []
  })
}

function stopAll() {
  setError(null)
  stopPlaybacks()
  confettiFx.reset()
  applyBackground()
}

function beginRecording() {
  if (isExportingPngZip) {
    throw new Error('PNG ZIP export is in progress.')
  }
  setError(null)
  lastRecording = null
  setDownloadEnabled(false)
  stopAll()
  scene = readSceneForm()
  syncSelectedEffectFromForm()
  applyBackground()

  recorder.start(fxCanvas, { bitsPerSecond: 100_000_000 })
  startStatusTimer()
  const effects = scene.effects.map((e) => sanitizeEffect(e))
  playbacks = effects.map((e) => playConfetti(confettiFx, e))

  const durationSeconds = Math.max(...effects.map((e) => e.durationSeconds))
  window.setTimeout(async () => {
    try {
      if (recorder.status.isRecording) await endRecording()
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    }
  }, Math.round(durationSeconds * 1000))
}

async function endRecording() {
  stopPlaybacks()
  const res = await recorder.stop()
  stopStatusTimer()

  const ext = 'webm'
  const filename = `confetti_${timestamp()}_${CANVAS_WIDTH}x${CANVAS_HEIGHT}_${CAPTURE_FPS}fps.${ext}`
  lastRecording = { blob: res.blob, filename }
  setDownloadEnabled(true)
  updateFfmpeg()
}

async function exportPngZip() {
  if (isExportingPngZip) return
  if (recorder.status.isRecording) {
    throw new Error('Stop the current recording before exporting PNG ZIP.')
  }

  setError(null)
  isExportingPngZip = true
  setExportButtonState('Preparing…', true)
  recStatusEl.textContent = 'Exporting PNG ZIP…'
  stopAll()

  try {
    scene = readSceneForm()
    syncSelectedEffectFromForm()
    applyBackground()
    const effects = scene.effects.map((e) => sanitizeEffect(e))
    const durationSeconds = Math.max(...effects.map((e) => e.durationSeconds))
    const renderSettings = sanitizeRenderSettings({
      fps: CAPTURE_FPS,
      duration: durationSeconds,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      dpr: EXPORT_DPR,
    })

    playbacks = effects.map((e) => playConfetti(confettiFx, e))
    const zipBlob = await exportPngSequenceZip({
      canvas: fxCanvas,
      scene,
      renderSettings,
      waitForNextFrame: (dtSeconds) => wait(dtSeconds * 1000),
      onProgress: (done, total) => {
        setExportButtonState(`Export PNG ZIP (${done}/${total})`, true)
      },
    })

    const filename = `confetti_frames_${timestamp()}.zip`
    downloadBlob(zipBlob, filename)
  } finally {
    stopPlaybacks()
    confettiFx.reset()
    applyBackground()
    isExportingPngZip = false
    recStatusEl.textContent = 'Idle'
    setExportButtonState('Export PNG ZIP', false)
  }
}

function updateFfmpeg() {
  const outMp4 = lastRecording ? lastRecording.filename.replace(/\.webm$/i, '.mp4') : 'output.mp4'
  const cmd = `ffmpeg -i "${lastRecording ? lastRecording.filename : 'input.webm'}" -c:v libx264 -pix_fmt yuv420p -r 60 "${outMp4}"`
  must<HTMLDivElement>('ffmpegCmd').textContent = cmd
}

function startStatusTimer() {
  stopStatusTimer()
  statusTimer = window.setInterval(() => {
    const s = recorder.status
    recStatusEl.textContent = s.isRecording
      ? `Recording… ${s.durationSeconds.toFixed(1)}s  (${(s.bytes / (1024 * 1024)).toFixed(1)} MB)`
      : 'Idle'
    const recordBtn = must<HTMLButtonElement>('record')
    recordBtn.textContent = s.isRecording ? 'Stop recording' : 'Start recording'
    recordBtn.classList.toggle('danger', s.isRecording)
  }, 200)
}

function stopStatusTimer() {
  if (statusTimer != null) window.clearInterval(statusTimer)
  statusTimer = null
  const s = recorder.status
  recStatusEl.textContent = s.isRecording ? 'Recording…' : 'Idle'
  const recordBtn = must<HTMLButtonElement>('record')
  recordBtn.textContent = 'Start recording'
  recordBtn.classList.remove('danger')
}

function setDownloadEnabled(enabled: boolean) {
  must<HTMLButtonElement>('download').disabled = !enabled
}

function setExportButtonState(label: string, disabled: boolean) {
  const btn = must<HTMLButtonElement>('exportPngZip')
  btn.textContent = label
  btn.disabled = disabled
}

function timestamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
}

function setVal(id: string, value: string) {
  const el = must<HTMLInputElement | HTMLSelectElement>(id)
  ;(el as HTMLInputElement).value = value
}

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Missing element: #${id}`)
  return el as T
}

function currentConfigJson() {
  scene = readSceneForm()
  syncSelectedEffectFromForm()
  return JSON.stringify(scene, null, 2)
}

refreshEffectSelect()
hydrateForm(scene.effects[selectedEffectIdx])
setVal('background', scene.background)
setVal('backgroundColor', scene.backgroundColor)
applyBackground()
updateFfmpeg()

presetEl.addEventListener('change', () => {
  const chosen = presetItems.find((p) => p.name === presetEl.value)
  if (!chosen) return
  scene.effects[selectedEffectIdx] = sanitizeEffect(chosen)
  hydrateForm(scene.effects[selectedEffectIdx])
  refreshEffectSelect()
  applyBackground()
})

effectSelectEl.addEventListener('change', () => {
  const nextIdx = clampIdx(Number(effectSelectEl.value), scene.effects.length)
  try {
    syncSelectedEffectFromForm()
  } catch {
    // ignore (incomplete form), still allow switching
  }
  selectedEffectIdx = nextIdx
  hydrateForm(scene.effects[selectedEffectIdx])
})

for (const id of [
  'mode',
  'durationSeconds',
  'burstCount',
  'background',
  'backgroundColor',
  'particleCount',
  'spread',
  'startVelocity',
  'gravity',
  'scalar',
  'decay',
  'fountainTicks',
  'angle',
  'originX',
  'originY',
  'shapeSquare',
  'shapeCircle',
  'colors',
]) {
  must<HTMLElement>(id).addEventListener('input', () => {
    if (id === 'background' || id === 'backgroundColor') {
      scene = readSceneForm()
    } else {
      syncSelectedEffectFromForm()
    }
    applyBackground()
  })
}

must<HTMLButtonElement>('play').addEventListener('click', () => playAll())
must<HTMLButtonElement>('stop').addEventListener('click', () => stopAll())

must<HTMLButtonElement>('record').addEventListener('click', async () => {
  try {
    if (recorder.status.isRecording) {
      await endRecording()
    } else {
      beginRecording()
    }
  } catch (e) {
    setError(String(e instanceof Error ? e.message : e))
    try {
      stopStatusTimer()
    } catch {
      // ignore
    }
  }
})

must<HTMLButtonElement>('download').addEventListener('click', () => {
  if (!lastRecording) return
  downloadBlob(lastRecording.blob, lastRecording.filename)
})

must<HTMLButtonElement>('exportPngZip').addEventListener('click', async () => {
  try {
    await exportPngZip()
  } catch (e) {
    setError(String(e instanceof Error ? e.message : e))
    setExportButtonState('Export PNG ZIP', false)
    recStatusEl.textContent = 'Idle'
    isExportingPngZip = false
  }
})

must<HTMLButtonElement>('export').addEventListener('click', async () => {
  try {
    setError(null)
    const json = currentConfigJson()
    await navigator.clipboard.writeText(json)
    setError('Copied preset JSON to clipboard.')
    window.setTimeout(() => setError(null), 1600)
  } catch {
    setError(currentConfigJson())
  }
})

must<HTMLButtonElement>('import').addEventListener('click', () => {
  setError(null)
  const raw = window.prompt('Paste preset JSON', '')
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as Partial<SceneConfig>
    scene = sanitizeScene(parsed)
    selectedEffectIdx = 0
    refreshEffectSelect()
    hydrateForm(scene.effects[selectedEffectIdx])
    setVal('background', scene.background)
    setVal('backgroundColor', scene.backgroundColor)
    applyBackground()
    presetEl.value = DEFAULT_EFFECT.name
  } catch (e) {
    setError(`Invalid JSON: ${String(e instanceof Error ? e.message : e)}`)
  }
})

must<HTMLButtonElement>('copyFfmpeg').addEventListener('click', async () => {
  const text = must<HTMLDivElement>('ffmpegCmd').textContent ?? ''
  try {
    await navigator.clipboard.writeText(text)
    setError('Copied FFmpeg command to clipboard.')
    window.setTimeout(() => setError(null), 1200)
  } catch {
    setError(text)
  }
})

must<HTMLButtonElement>('effectAdd').addEventListener('click', () => {
  setError(null)
  syncSelectedEffectFromForm()
  const nextIdx = scene.effects.length
  scene.effects.push(sanitizeEffect({ ...DEFAULT_EFFECT, name: `Effect ${nextIdx + 1}` }))
  selectedEffectIdx = nextIdx
  refreshEffectSelect()
  hydrateForm(scene.effects[selectedEffectIdx])
})

must<HTMLButtonElement>('effectDuplicate').addEventListener('click', () => {
  setError(null)
  syncSelectedEffectFromForm()
  const src = scene.effects[selectedEffectIdx]
  const nextIdx = scene.effects.length
  scene.effects.push(sanitizeEffect({ ...src, name: `${src.name} (copy)` }))
  selectedEffectIdx = nextIdx
  refreshEffectSelect()
  hydrateForm(scene.effects[selectedEffectIdx])
})

must<HTMLButtonElement>('effectRemove').addEventListener('click', () => {
  setError(null)
  if (scene.effects.length <= 1) {
    setError('You need at least one effect.')
    window.setTimeout(() => setError(null), 1600)
    return
  }
  scene.effects.splice(selectedEffectIdx, 1)
  selectedEffectIdx = clampIdx(selectedEffectIdx, scene.effects.length)
  refreshEffectSelect()
  hydrateForm(scene.effects[selectedEffectIdx])
})

function clampIdx(idx: number, length: number) {
  if (!Number.isFinite(idx)) return 0
  return Math.max(0, Math.min(length - 1, Math.floor(idx)))
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, Math.max(0, ms)))
}
