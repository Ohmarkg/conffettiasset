import { CAPTURE_FPS } from './state'

export interface RecorderStatus {
  isRecording: boolean
  mimeType: string | null
  bytes: number
  durationSeconds: number
}

export interface RecordingResult {
  blob: Blob
  mimeType: string
  durationSeconds: number
}

export function pickBestWebmMimeType(): string | null {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  for (const mime of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) return mime
  }
  return null
}

export class CanvasRecorder {
  private recorder: MediaRecorder | null = null
  private chunks: BlobPart[] = []
  private startedAt: number | null = null
  private stream: MediaStream | null = null
  private _mimeType: string | null = null

  get status(): RecorderStatus {
    const now = performance.now()
    const durationSeconds =
      this.startedAt == null ? 0 : Math.max(0, (now - this.startedAt) / 1000)
    return {
      isRecording: this.recorder?.state === 'recording',
      mimeType: this._mimeType,
      bytes: estimateBytes(this.chunks),
      durationSeconds,
    }
  }

  start(canvas: HTMLCanvasElement, opts?: { bitsPerSecond?: number }): void {
    if (this.recorder && this.recorder.state !== 'inactive') return

    const mimeType = pickBestWebmMimeType()
    if (!mimeType) {
      throw new Error('MediaRecorder WebM is not supported in this browser.')
    }

    const stream = canvas.captureStream(CAPTURE_FPS)
    this.stream = stream
    this._mimeType = mimeType
    this.chunks = []
    this.startedAt = performance.now()

    const recorder = new MediaRecorder(stream, {
      mimeType,
      bitsPerSecond: opts?.bitsPerSecond,
    })

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data)
    }

    this.recorder = recorder
    recorder.start(250)
  }

  stop(): Promise<RecordingResult> {
    const recorder = this.recorder
    const mimeType = this._mimeType
    const startedAt = this.startedAt

    if (!recorder || !mimeType || startedAt == null) {
      return Promise.reject(new Error('No active recording to stop.'))
    }

    if (recorder.state === 'inactive') {
      return Promise.reject(new Error('Recording is already stopped.'))
    }

    return new Promise((resolve, reject) => {
      const finalize = () => {
        try {
          const durationSeconds = Math.max(0, (performance.now() - startedAt) / 1000)
          const blob = new Blob(this.chunks, { type: mimeType })
          cleanupStream(this.stream)
          this.stream = null
          this.recorder = null
          this.startedAt = null
          resolve({ blob, mimeType, durationSeconds })
        } catch (e) {
          reject(e)
        }
      }

      recorder.onerror = () => reject(new Error('MediaRecorder error.'))
      recorder.onstop = finalize
      try {
        recorder.stop()
      } catch (e) {
        reject(e)
      }
    })
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

function cleanupStream(stream: MediaStream | null) {
  if (!stream) return
  for (const t of stream.getTracks()) t.stop()
}

function estimateBytes(parts: BlobPart[]) {
  let total = 0
  for (const p of parts) {
    if (p instanceof Blob) total += p.size
  }
  return total
}
