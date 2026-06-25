import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'

interface Props {
  onResult: (text: string) => void
  onClose: () => void
}

export function Scanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    let stopped = false
    let controls: IScannerControls | undefined

    const constraints: MediaStreamConstraints = {
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    }

    reader
      .decodeFromConstraints(constraints, videoRef.current!, (result) => {
        if (stopped || !result) return
        stopped = true
        controls?.stop()
        onResult(result.getText())
      })
      .then((c) => {
        controls = c
        if (stopped) c.stop()
      })
      .catch((e: unknown) => setError(describeError(e)))

    return () => {
      stopped = true
      controls?.stop()
    }
  }, [onResult])

  return (
    <div className="scanner">
      <video ref={videoRef} className="scanner__video" muted playsInline autoPlay />
      <div className="scanner__frame" aria-hidden="true" />
      <button
        type="button"
        className="scanner__close"
        onClick={onClose}
        aria-label="Закрыть сканер"
      >
        ✕
      </button>
      {error ? (
        <div className="scanner__error">
          <span>{error}</span>
          <button type="button" className="btn" onClick={onClose}>
            Закрыть
          </button>
        </div>
      ) : (
        <p className="scanner__hint">Наведи на QR-код тренажёра</p>
      )}
    </div>
  )
}

function describeError(e: unknown): string {
  const name = (e as { name?: string }).name
  if (name === 'NotAllowedError') {
    return 'Нет доступа к камере. Разреши камеру для сайта в настройках.'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'Камера не найдена.'
  }
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'Камера работает только по HTTPS (или на localhost).'
  }
  return 'Не удалось запустить камеру.'
}
