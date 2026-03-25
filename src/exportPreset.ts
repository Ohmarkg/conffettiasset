import type { BackgroundMode, SceneConfig } from './state'
import { sanitizeScene } from './state'

export type ExportShape = 'square' | 'circle'
export type ExportEmitterKind = 'burst' | 'fountain'

export interface ExportRenderPreset {
  seed: number
  background: BackgroundMode
  backgroundColor: string
  duration: number
  emitters: ExportEmitter[]
}

export interface ExportEmitter {
  kind: ExportEmitterKind
  origin: { x: number; y: number }
  angle: number
  spread: number
  particlesPerEmission: number
  burstTimes: number[]
  emitRatePerSecond: number
  emitStart: number
  emitEnd: number
  startVelocity: number
  ticks: number
  gravity: number
  shapes: Record<ExportShape, number>
  scalar: number
  decay: number
  colors: string[]
}

export function buildExportRenderPreset(sceneInput: SceneConfig): ExportRenderPreset {
  const scene = sanitizeScene(sceneInput)
  const effects = scene.effects
  const emitters = effects.map((effect) => {
    const burstCount = Math.max(1, Math.round(effect.burstCount))
    const burstTimes =
      effect.mode === 'burst'
        ? createBurstSchedule(effect.durationSeconds, burstCount)
        : []

    return {
      kind: effect.mode,
      origin: { x: effect.originX, y: effect.originY },
      angle: effect.angle,
      spread: effect.spread,
      particlesPerEmission: Math.max(1, effect.particleCount),
      burstTimes,
      emitRatePerSecond: effect.mode === 'fountain' ? effect.particleCount * 30 : 0,
      emitStart: 0,
      emitEnd: effect.durationSeconds,
      startVelocity: effect.startVelocity,
      ticks: effect.mode === 'fountain' ? effect.fountainTicks : 200,
      gravity: effect.gravity,
      shapes: normalizeShapeWeights(effect.shapes),
      scalar: effect.scalar,
      decay: effect.decay,
      colors: effect.colors.slice(),
    }
  })

  return {
    seed: hashScene(scene),
    background: scene.background,
    backgroundColor: scene.backgroundColor,
    duration: getExportDurationFromEmitters(emitters),
    emitters,
  }
}

export function getExportDurationFromEmitters(emitters: ExportEmitter[]) {
  let maxEnd = 0
  for (const emitter of emitters) {
    const lastEmissionTime =
      emitter.kind === 'burst'
        ? (emitter.burstTimes[emitter.burstTimes.length - 1] ?? 0)
        : emitter.emitEnd
    maxEnd = Math.max(maxEnd, lastEmissionTime + emitter.ticks / 60)
  }
  return Math.max(0.1, maxEnd)
}

function createBurstSchedule(durationSeconds: number, burstCount: number) {
  if (burstCount <= 1) return [0]
  const gap = durationSeconds / burstCount
  const times: number[] = []
  for (let i = 0; i < burstCount; i++) times.push(i * gap)
  return times
}

function normalizeShapeWeights(shapes: Array<'square' | 'circle'>) {
  const hasSquare = shapes.includes('square')
  const hasCircle = shapes.includes('circle')
  if (hasSquare && hasCircle) return { square: 1, circle: 1 }
  if (hasCircle) return { square: 0, circle: 1 }
  return { square: 1, circle: 0 }
}

function hashScene(scene: SceneConfig) {
  const text = JSON.stringify(scene)
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}
