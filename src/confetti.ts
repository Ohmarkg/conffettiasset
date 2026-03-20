import confetti from 'canvas-confetti'
import type { EffectConfig } from './state'

export type ConfettiInstance = ReturnType<typeof confetti.create>

export function createConfettiInstance(fxCanvas: HTMLCanvasElement): ConfettiInstance {
  // We draw the background using the 2D context to ensure it is captured in
  // `canvas.captureStream()`. Worker mode needs OffscreenCanvas transfer, which
  // is incompatible once a rendering context has been created.
  return confetti.create(fxCanvas, { resize: false, useWorker: false })
}

export const PRESETS: EffectConfig[] = [
  {
    name: 'Sparkle Burst',
    mode: 'burst',
    durationSeconds: 4,
    burstCount: 1,
    particleCount: 220,
    spread: 85,
    startVelocity: 55,
    gravity: 0.9,
    scalar: 1,
    decay: 0.9,
    fountainTicks: 260,
    angle: 90,
    originX: 0.5,
    originY: 0.65,
    shapes: ['square', 'circle'],
    colors: ['#ffffff', '#FBBF24', '#60A5FA', '#34D399', '#F472B6'],
  },
  {
    name: 'Gold Fountain',
    mode: 'fountain',
    durationSeconds: 6,
    burstCount: 1,
    particleCount: 35,
    spread: 40,
    startVelocity: 55,
    gravity: 1.05,
    scalar: 1,
    decay: 0.92,
    fountainTicks: 260,
    angle: 90,
    originX: 0.5,
    originY: 0.95,
    shapes: ['square'],
    colors: ['#FBBF24', '#F59E0B', '#FDE68A', '#fff7d1'],
  },
  {
    name: 'Side Cannon',
    mode: 'burst',
    durationSeconds: 4,
    burstCount: 1,
    particleCount: 200,
    spread: 60,
    startVelocity: 70,
    gravity: 1,
    scalar: 1,
    decay: 0.9,
    fountainTicks: 260,
    angle: 15,
    originX: 0.05,
    originY: 0.55,
    shapes: ['square', 'circle'],
    colors: ['#60A5FA', '#A78BFA', '#34D399', '#F472B6', '#ffffff'],
  },
]

export interface PlaybackHandle {
  stop: () => void
  done: Promise<void>
}

export function playConfetti(instance: ConfettiInstance, config: EffectConfig): PlaybackHandle {
  let stopped = false
  const stop = () => {
    stopped = true
    instance.reset()
  }

  const done = (async () => {
    const ms = Math.max(250, Math.round(config.durationSeconds * 1000))
    const t0 = performance.now()

    if (config.mode === 'burst') {
      const bursts = Math.max(1, Math.round(config.burstCount ?? 1))
      if (bursts === 1) {
        await instance({
          particleCount: config.particleCount,
          spread: config.spread,
          startVelocity: config.startVelocity,
          gravity: config.gravity,
          scalar: config.scalar,
          decay: config.decay,
          angle: config.angle,
          origin: { x: config.originX, y: config.originY },
          shapes: config.shapes,
          colors: config.colors,
        })
        const remaining = ms - (performance.now() - t0)
        if (remaining > 0) await wait(remaining)
        return
      }

      const gap = ms / bursts
      for (let i = 0; i < bursts; i++) {
        await instance({
          particleCount: config.particleCount,
          spread: config.spread,
          startVelocity: config.startVelocity,
          gravity: config.gravity,
          scalar: config.scalar,
          decay: config.decay,
          angle: config.angle,
          origin: { x: config.originX, y: config.originY },
          shapes: config.shapes,
          colors: config.colors,
        })
        const elapsed = performance.now() - t0
        const target = (i + 1) * gap
        const remaining = target - elapsed
        if (remaining > 0) await wait(remaining)
      }
      return
    }

    const emitEveryMs = 1000 / 30
    while (!stopped && performance.now() - t0 < ms) {
      void instance({
        particleCount: config.particleCount,
        spread: config.spread,
        startVelocity: config.startVelocity,
        gravity: config.gravity,
        scalar: config.scalar,
        decay: config.decay,
        angle: config.angle,
        origin: { x: config.originX, y: config.originY },
        shapes: config.shapes,
        colors: config.colors,
        ticks: config.fountainTicks,
      })
      await wait(emitEveryMs)
    }
  })()

  return { stop, done }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
