import { makeRng, pickWeighted, randIntRange, randRange } from './exportRng'
import type { ExportEmitter, ExportRenderPreset, ExportShape } from './exportPreset'

interface Particle {
  x: number
  y: number
  wobble: number
  wobbleSpeed: number
  velocity: number
  angle2D: number
  tiltAngle: number
  color: string
  tick: number
  totalTicks: number
  decay: number
  gravity: number
  random: number
  tiltSin: number
  tiltCos: number
  wobbleX: number
  wobbleY: number
  shape: ExportShape
  ovalScalar: number
  scalar: number
  opacity: number
}

export function createExportSim({
  preset,
  width,
  height,
}: {
  preset: ExportRenderPreset
  width: number
  height: number
}) {
  const rng = makeRng(preset.seed)
  const particles: Particle[] = []
  const emitterStates = preset.emitters.map(() => ({ burstIndex: 0, carry: 0 }))
  let elapsed = 0

  function seedFromPreset() {
    particles.length = 0
    elapsed = 0
    for (const state of emitterStates) {
      state.burstIndex = 0
      state.carry = 0
    }
  }

  function emitParticle(emitter: ExportEmitter) {
    const radAngle = emitter.angle * (Math.PI / 180)
    const radSpread = emitter.spread * (Math.PI / 180)
    const shape = pickWeighted(rng, emitter.shapes) ?? 'square'
    const color = emitter.colors[randIntRange(rng, 0, emitter.colors.length - 1)] ?? '#ffffff'

    particles.push({
      x: width * emitter.origin.x,
      y: height * emitter.origin.y,
      wobble: rng() * 10,
      wobbleSpeed: Math.min(0.11, rng() * 0.1 + 0.05),
      velocity: emitter.startVelocity * 0.5 + rng() * emitter.startVelocity,
      angle2D: -radAngle + (0.5 * radSpread - rng() * radSpread),
      tiltAngle: randRange(rng, 0.25, 0.75) * Math.PI,
      color,
      tick: 0,
      totalTicks: emitter.ticks,
      decay: emitter.decay,
      gravity: emitter.gravity * 3,
      random: rng() + 2,
      tiltSin: 0,
      tiltCos: 0,
      wobbleX: 0,
      wobbleY: 0,
      shape,
      ovalScalar: 0.6,
      scalar: emitter.scalar,
      opacity: 1,
    })
  }

  function emitCount(emitter: ExportEmitter, count: number) {
    for (let i = 0; i < count; i++) emitParticle(emitter)
  }

  function emitScheduled(currentTime: number, nextTime: number) {
    preset.emitters.forEach((emitter, emitterIndex) => {
      const state = emitterStates[emitterIndex]

      if (emitter.kind === 'burst') {
        while (state.burstIndex < emitter.burstTimes.length) {
          const burstTime = emitter.burstTimes[state.burstIndex]
          if (burstTime > nextTime) break
          if (burstTime >= currentTime) emitCount(emitter, emitter.particlesPerEmission)
          state.burstIndex += 1
        }
        return
      }

      const start = Math.max(currentTime, emitter.emitStart)
      const end = Math.min(nextTime, emitter.emitEnd)
      if (end <= start) return

      state.carry += emitter.emitRatePerSecond * (end - start)
      const whole = Math.floor(state.carry)
      if (whole > 0) {
        emitCount(emitter, whole)
        state.carry -= whole
      }
    })
  }

  function step(dt: number) {
    const nextTime = elapsed + dt
    emitScheduled(elapsed, nextTime)
    elapsed = nextTime

    for (const particle of particles) {
      particle.x += Math.cos(particle.angle2D) * particle.velocity
      particle.y += Math.sin(particle.angle2D) * particle.velocity + particle.gravity
      particle.velocity *= particle.decay
      particle.wobble += particle.wobbleSpeed
      particle.wobbleX = particle.x + 10 * particle.scalar * Math.cos(particle.wobble)
      particle.wobbleY = particle.y + 10 * particle.scalar * Math.sin(particle.wobble)
      particle.tiltAngle += 0.1
      particle.tiltSin = Math.sin(particle.tiltAngle)
      particle.tiltCos = Math.cos(particle.tiltAngle)
      particle.random = rng() + 2
      particle.opacity = Math.max(0, 1 - particle.tick / particle.totalTicks)
      particle.tick += 1
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i].tick >= particles[i].totalTicks) particles.splice(i, 1)
    }
  }

  return {
    particles,
    seedFromPreset,
    step,
  }
}
