'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function PhotoGalleryPage() {
  const [photos, setPhotos] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/gallery-photos')
      .then(res => res.json())
      .then(data => setPhotos(data.photos))
  }, [])

  const totalWidth = photos.length * 320

  return (
    <div className="max-w-6xl mx-auto p-6 text-center">
      <h1 className="text-3xl font-bold mb-4">🖼️ Galerie des photos traitées</h1>
      <p className="text-gray-600 mb-2">Nombre de photos : {photos.length}</p>
      <p className="text-gray-600 mb-6">Largeur fresque : {totalWidth}px</p>

      {photos.length === 0 ? (
        <p className="text-gray-500">Aucune photo traitée.</p>
      ) : (
        <div className="overflow-auto border p-4">
          <div className="flex gap-4" style={{ width: `${totalWidth}px` }}>
            {photos.map((src, i) => (
              <div key={i} className="relative w-[320px] h-[240px]">
                <Image
                  src={`/photos/${src}`}
                  alt={`photo-${i}`}
                  fill
                  sizes="320px"
                  className="object-contain border rounded"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
