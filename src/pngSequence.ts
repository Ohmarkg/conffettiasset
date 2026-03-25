import JSZip from 'jszip'
import type { SceneConfig, RenderSettings } from './state'
import { sanitizeScene, sanitizeRenderSettings } from './state'
import { buildExportRenderPreset } from './exportPreset'
import { createExportRenderer } from './exportRenderer'
import { createExportSim } from './exportSim'

export interface ExportPngSequenceZipParams {
  scene: SceneConfig
  renderSettings: RenderSettings
  onProgress?: (progress: { frameIndex?: number; totalFrames?: number; phase?: 'render' | 'zip' }) => void
}

export async function exportPngSequenceZip(params: ExportPngSequenceZipParams) {
  const scene = sanitizeScene(params.scene)
  const { onProgress } = params
  const exportCanvas = document.createElement('canvas')
  const preset = buildExportRenderPreset(scene)
  const renderSettings = sanitizeRenderSettings({
    ...params.renderSettings,
    duration: preset.duration,
  })
  const { fps, duration, width, height, dpr } = renderSettings

  const totalFrames = Math.max(1, Math.ceil(fps * duration))
  const dt = 1 / fps
  const zip = new JSZip()
  const folder = zip.folder('frames')
  if (!folder) throw new Error('Failed to create ZIP frames folder.')

  const renderer = createExportRenderer({
    canvas: exportCanvas,
    background: scene.background,
    backgroundColor: scene.backgroundColor,
  })
  const sim = createExportSim({ preset, width, height })

  renderer.setup({ width, height, dpr })
  sim.seedFromPreset()

  for (let i = 0; i < totalFrames; i++) {
    sim.step(dt)
    renderer.drawParticles(sim.particles)

    const blob = await renderer.blobFromCanvas('image/png')
    folder.file(`${padFrame(i)}.png`, blob)
    onProgress?.({ phase: 'render', frameIndex: i, totalFrames })
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
  zip.file(
    'README.txt',
    [
      'Transparent Confetti Export',
      '',
      '- frames/: PNG sequence ready for image-sequence import',
      '- effect.json: original Vite scene configuration used for export',
      '- render.json: render/export settings and metadata',
      '',
      'Tip: import frames into UE5, After Effects, Premiere, Blender, or any tool that supports PNG sequences.',
      '',
    ].join('\n')
  )

  onProgress?.({ phase: 'zip' })
  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
}

function padFrame(i: number) {
  return String(i).padStart(6, '0')
}
