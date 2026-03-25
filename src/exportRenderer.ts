import { blobFromCanvas } from './recorder'
import type { BackgroundMode } from './state'

interface RenderParticle {
  x: number
  y: number
  wobbleX: number
  wobbleY: number
  tiltSin: number
  tiltCos: number
  random: number
  color: string
  shape: 'square' | 'circle'
  ovalScalar: number
  scalar: number
  wobble: number
  opacity: number
}

export function createExportRenderer({
  canvas,
  background,
  backgroundColor,
}: {
  canvas: HTMLCanvasElement
  background: BackgroundMode
  backgroundColor: string
}) {
  let ctx: CanvasRenderingContext2D | null = null
  let logicalWidth = 1
  let logicalHeight = 1
  let dpr = 1

  function setup({ width, height, dpr: nextDpr }: { width: number; height: number; dpr: number }) {
    logicalWidth = Math.max(1, width)
    logicalHeight = Math.max(1, height)
    dpr = Math.max(1, nextDpr)

    canvas.width = Math.round(logicalWidth * dpr)
    canvas.height = Math.round(logicalHeight * dpr)

    ctx = canvas.getContext('2d', { alpha: true, desynchronized: false })
    if (!ctx) throw new Error('Failed to create export canvas context.')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function clear() {
    if (!ctx) return
    ctx.clearRect(0, 0, logicalWidth, logicalHeight)
    if (background === 'solid') {
      ctx.save()
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, logicalWidth, logicalHeight)
      ctx.restore()
    }
  }

  function drawParticles(particles: RenderParticle[]) {
    if (!ctx) return
    clear()

    for (const particle of particles) {
      if (particle.x < -100 || particle.x > logicalWidth + 100) continue
      if (particle.y < -100 || particle.y > logicalHeight + 150) continue

      const x1 = particle.x + particle.random * particle.tiltCos
      const y1 = particle.y + particle.random * particle.tiltSin
      const x2 = particle.wobbleX + particle.random * particle.tiltCos
      const y2 = particle.wobbleY + particle.random * particle.tiltSin

      ctx.save()
      ctx.globalAlpha = particle.opacity
      ctx.fillStyle = particle.color
      ctx.beginPath()
      if (particle.shape === 'circle') {
        ctx.ellipse(
          particle.x,
          particle.y,
          Math.abs(x2 - x1) * particle.ovalScalar,
          Math.abs(y2 - y1) * particle.ovalScalar,
          (Math.PI / 10) * particle.wobble,
          0,
          Math.PI * 2
        )
      } else {
        ctx.moveTo(Math.floor(particle.x), Math.floor(particle.y))
        ctx.lineTo(Math.floor(particle.wobbleX), Math.floor(y1))
        ctx.lineTo(Math.floor(x2), Math.floor(y2))
        ctx.lineTo(Math.floor(x1), Math.floor(particle.wobbleY))
      }
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
  }

  function blobFromExportCanvas(type = 'image/png') {
    return blobFromCanvas(canvas, type)
  }

  return {
    setup,
    drawParticles,
    blobFromCanvas: blobFromExportCanvas,
  }
}
