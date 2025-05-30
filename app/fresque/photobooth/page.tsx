'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

export default function PhotoBoothPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      if (videoRef.current) videoRef.current.srcObject = stream
    })
  }, [])

  const takePhoto = () => {
    setCountdown(3)
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(interval)
          capture()
          return null
        }
        return (prev || 1) - 1
      })
    }, 1000)
  }

  const capture = async () => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => b && resolve(b), 'image/png') // 👈 Forcer PNG
    )
    if (!blob) return

    setLoading(true)
    const formData = new FormData()
    formData.append('photo', blob, `photo-${Date.now()}.png`)

    const res = await fetch('/api/upload-photo', {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()
    setLoading(false)

    if (data.localUrl) {
      setImageSrc(data.localUrl)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 text-center">
      <h1 className="text-3xl font-bold mb-4">📸 Photo Booth</h1>

      <div className="relative inline-block">
        <video ref={videoRef} autoPlay className="w-[640px] h-[480px] border rounded" />
        {countdown !== null && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center text-white text-6xl font-bold">
            {countdown}
          </div>
        )}
      </div>

      <div className="mt-4">
        <button
          onClick={takePhoto}
          disabled={countdown !== null || loading}
          className="px-6 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded text-lg"
        >
          📷 Prendre une photo
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {imageSrc && (
        <div className="mt-8">
          <h2 className="text-xl mb-2">🖼️ Résultat</h2>
          <div className="relative w-[320px] h-[240px] mx-auto border rounded">
            <Image
              src={imageSrc}
              alt="photo"
              fill
              sizes="320px"
              style={{ objectFit: 'contain' }}
              unoptimized={true} // Important for local dynamically generated images
            />
          </div>
        </div>
      )}

      <div className="relative w-full h-auto">
        <Image
          src="/photobooth/examples/booth-ex-1.jpg"
          alt="Exemple de photobooth"
          width={500}
          height={300}
          className="w-full h-auto rounded-lg shadow-md"
        />
      </div>
    </div>
  )
}
