export type ConfettiMode = 'burst' | 'fountain'
export type BackgroundMode = 'transparent' | 'solid'

export type ConfettiShape = 'square' | 'circle'

export interface EffectConfig {
  name: string
  mode: ConfettiMode
  durationSeconds: number

  // For burst mode: how many bursts over the duration.
  burstCount: number

  particleCount: number
  spread: number
  startVelocity: number
  gravity: number
  scalar: number
  decay: number

  // Only used for fountain mode: controls particle lifetime.
  fountainTicks: number

  angle: number
  originX: number
  originY: number

  shapes: ConfettiShape[]
  colors: string[]
}

export interface SceneConfig {
  background: BackgroundMode
  backgroundColor: string
  effects: EffectConfig[]
}

export const CANVAS_WIDTH = 1920
export const CANVAS_HEIGHT = 1080
export const CAPTURE_FPS = 60
export const EXPORT_DPR = 2
export const EXPORT_MIN_FPS = 1
export const EXPORT_MAX_FPS = 120
export const EXPORT_MIN_DURATION = 0.25
export const EXPORT_MAX_DURATION = 120
export const EXPORT_MIN_DPR = 1
export const EXPORT_MAX_DPR = 4

export const DEFAULT_EFFECT: EffectConfig = {
  name: 'Effect 1',
  mode: 'burst',
  durationSeconds: 5,

  burstCount: 1,

  particleCount: 180,
  spread: 75,
  startVelocity: 45,
  gravity: 0.9,
  scalar: 1,
  decay: 0.9,

  fountainTicks: 260,

  angle: 90,
  originX: 0.5,
  originY: 0.65,

  shapes: ['square', 'circle'],
  colors: ['#ffffff', '#FBBF24', '#60A5FA', '#34D399', '#F472B6'],
}

export const DEFAULT_SCENE: SceneConfig = {
  background: 'solid',
  backgroundColor: '#0b0b10',
  effects: [DEFAULT_EFFECT],
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export interface RenderSettings {
  fps: number
  duration: number
  width: number
  height: number
  dpr: number
}

export function sanitizeRenderSettings(input: Partial<RenderSettings>): RenderSettings {
  const fps = clamp(Math.round(Number(input.fps ?? CAPTURE_FPS)), EXPORT_MIN_FPS, EXPORT_MAX_FPS)
  const duration = clamp(Number(input.duration ?? DEFAULT_EFFECT.durationSeconds), EXPORT_MIN_DURATION, EXPORT_MAX_DURATION)
  const width = Math.max(1, Math.round(Number(input.width ?? CANVAS_WIDTH)))
  const height = Math.max(1, Math.round(Number(input.height ?? CANVAS_HEIGHT)))
  const dpr = clamp(Number(input.dpr ?? EXPORT_DPR), EXPORT_MIN_DPR, EXPORT_MAX_DPR)
  return { fps, duration, width, height, dpr }
}

export function sanitizeEffect(input: Partial<EffectConfig>): EffectConfig {
  const cfg: EffectConfig = { ...DEFAULT_EFFECT, ...input }

  cfg.name = String(cfg.name ?? DEFAULT_EFFECT.name)
  cfg.mode = cfg.mode === 'fountain' ? 'fountain' : 'burst'
  cfg.durationSeconds = clamp(Number(cfg.durationSeconds ?? DEFAULT_EFFECT.durationSeconds), 0.25, 120)

  cfg.burstCount = clamp(Math.round(Number(cfg.burstCount ?? DEFAULT_EFFECT.burstCount)), 1, 50)

  cfg.particleCount = clamp(Math.round(Number(cfg.particleCount ?? DEFAULT_EFFECT.particleCount)), 1, 2000)
  cfg.spread = clamp(Number(cfg.spread ?? DEFAULT_EFFECT.spread), 0, 360)
  cfg.startVelocity = clamp(Number(cfg.startVelocity ?? DEFAULT_EFFECT.startVelocity), 0, 200)
  cfg.gravity = clamp(Number(cfg.gravity ?? DEFAULT_EFFECT.gravity), -5, 10)
  cfg.scalar = clamp(Number(cfg.scalar ?? DEFAULT_EFFECT.scalar), 0.1, 10)
  cfg.decay = clamp(Number(cfg.decay ?? DEFAULT_EFFECT.decay), 0.5, 1)

  cfg.fountainTicks = clamp(Math.round(Number(cfg.fountainTicks ?? DEFAULT_EFFECT.fountainTicks)), 30, 2000)

  cfg.angle = clamp(Number(cfg.angle ?? DEFAULT_EFFECT.angle), 0, 360)
  cfg.originX = clamp(Number(cfg.originX ?? DEFAULT_EFFECT.originX), 0, 1)
  cfg.originY = clamp(Number(cfg.originY ?? DEFAULT_EFFECT.originY), 0, 1)

  const shapes = Array.isArray(cfg.shapes) ? cfg.shapes : DEFAULT_EFFECT.shapes
  cfg.shapes = shapes
    .map((s) => (s === 'circle' ? 'circle' : 'square'))
    .filter((v, idx, arr) => arr.indexOf(v) === idx)
  if (cfg.shapes.length === 0) cfg.shapes = DEFAULT_EFFECT.shapes

  const colors = Array.isArray(cfg.colors) ? cfg.colors : DEFAULT_EFFECT.colors
  cfg.colors = colors.map(String).map((c) => c.trim()).filter(Boolean)
  if (cfg.colors.length === 0) cfg.colors = DEFAULT_EFFECT.colors

  return cfg
}

export function sanitizeScene(input: Partial<SceneConfig>): SceneConfig {
  const scene: SceneConfig = { ...DEFAULT_SCENE, ...input }
  scene.background = scene.background === 'transparent' ? 'transparent' : 'solid'
  scene.backgroundColor = String(scene.backgroundColor ?? DEFAULT_SCENE.backgroundColor)
  const effects = Array.isArray(scene.effects) ? scene.effects : DEFAULT_SCENE.effects
  scene.effects = effects.map((e, idx) =>
    sanitizeEffect({
      ...e,
      name: String((e as Partial<EffectConfig>)?.name ?? `Effect ${idx + 1}`),
    })
  )
  if (scene.effects.length === 0) scene.effects = [DEFAULT_EFFECT]
  return scene
}

export function paletteToText(colors: string[]) {
  return colors.join(', ')
}

export function paletteFromText(text: string) {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
