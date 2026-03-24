import JSZip from 'jszip'
import type { SceneConfig, RenderSettings } from './state'
import { sanitizeScene, sanitizeRenderSettings } from './state'
import { blobFromCanvas } from './recorder'

export interface ExportPngSequenceZipParams {
  canvas: HTMLCanvasElement
  scene: SceneConfig
  renderSettings: RenderSettings
  waitForNextFrame: (dtSeconds: number) => Promise<void>
  onProgress?: (doneFrames: number, totalFrames: number) => void
}

export async function exportPngSequenceZip(params: ExportPngSequenceZipParams) {
  const scene = sanitizeScene(params.scene)
  const renderSettings = sanitizeRenderSettings(params.renderSettings)
  const { canvas, waitForNextFrame, onProgress } = params
  const { fps, duration, width, height, dpr } = renderSettings

  const totalFrames = Math.max(1, Math.round(fps * duration))
  const dt = 1 / fps
  const zip = new JSZip()
  const folder = zip.folder('frames')
  if (!folder) throw new Error('Failed to create ZIP frames folder.')

  const prevWidth = canvas.width
  const prevHeight = canvas.height
  const prevCssWidth = canvas.style.width
  const prevCssHeight = canvas.style.height

  try {
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    for (let i = 0; i < totalFrames; i++) {
      await waitForNextFrame(dt)
      const blob = await blobFromCanvas(canvas, 'image/png')
      folder.file(`${padFrame(i)}.png`, blob)
      onProgress?.(i + 1, totalFrames)
    }

    zip.file('effect.json', JSON.stringify(scene, null, 2))
    zip.file(
      'render.json',
      JSON.stringify(
        {
          ...renderSettings,
          totalFrames,
          createdAt: new Date().toISOString(),
        },
        null,
        2
      )
    )

    return zip.generateAsync({ type: 'blob' })
  } finally {
    canvas.width = prevWidth
    canvas.height = prevHeight
    canvas.style.width = prevCssWidth
    canvas.style.height = prevCssHeight
  }
}

function padFrame(i: number) {
  return String(i).padStart(6, '0')
}
