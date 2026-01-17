"use client"

import type React from "react"

import { useRef, useEffect, useCallback } from "react"
import type { MapObject, MapImage } from "@/lib/db"

interface ZoomPreviewProps {
  canvasSize: { width: number; height: number }
  viewportRect: { x: number; y: number; width: number; height: number } | null
  loadedImages: Record<string, HTMLImageElement>
  images: MapImage[]
  objects: MapObject[]
  onPreviewClick: (x: number, y: number) => void
  className?: string
}

export function ZoomPreview({
  canvasSize,
  viewportRect,
  loadedImages,
  images,
  objects,
  onPreviewClick,
  className,
}: ZoomPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const PREVIEW_WIDTH = 140
  const PREVIEW_HEIGHT = 90

  const effectiveCanvasSize = canvasSize ?? { width: 8000, height: 6000 }
  const scale = Math.min(PREVIEW_WIDTH / effectiveCanvasSize.width, PREVIEW_HEIGHT / effectiveCanvasSize.height)

  const safeObjects = objects ?? []
  const safeImages = images ?? []

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT)

    ctx.fillStyle = "var(--muted)"
    ctx.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT)

    ctx.save()
    ctx.scale(scale, scale)

    // Draw images
    const sortedImages = [...safeImages].sort((a, b) => a.zIndex - b.zIndex)
    sortedImages.forEach(imgData => {
      const img = loadedImages[imgData.id]
      if (img && imgData.visible) {
        ctx.save()
        // Simplified drawing for preview (no complex blending for now)
        ctx.globalAlpha = imgData.opacity

        const x = imgData.position.x
        const y = imgData.position.y
        const w = img.width * imgData.scale
        const h = img.height * imgData.scale

        ctx.drawImage(img, x, y, w, h)
        ctx.restore()
      }
    })

    // Draw objects
    safeObjects.forEach((obj) => {
      if (obj.type === "polygon" && obj.vertices.length > 2) {
        ctx.beginPath()
        ctx.moveTo(obj.vertices[0].x, obj.vertices[0].y)
        for (let i = 1; i < obj.vertices.length; i++) {
          ctx.lineTo(obj.vertices[i].x, obj.vertices[i].y)
        }
        ctx.closePath()
        ctx.fillStyle = obj.style.fillColor + "80"
        ctx.fill()
      } else if (obj.type === "threshold" && obj.vertices.length === 2) {
        ctx.beginPath()
        ctx.moveTo(obj.vertices[0].x, obj.vertices[0].y)
        ctx.lineTo(obj.vertices[1].x, obj.vertices[1].y)
        ctx.strokeStyle = obj.style.strokeColor
        ctx.lineWidth = 3 / scale
        ctx.stroke()
      }
    })

    ctx.restore()

    // Draw viewport rectangle
    if (viewportRect) {
      ctx.strokeStyle = "#3C00BB"
      ctx.lineWidth = 2
      ctx.strokeRect(
        viewportRect.x * scale,
        viewportRect.y * scale,
        viewportRect.width * scale,
        viewportRect.height * scale,
      )
      ctx.fillStyle = "#3C00BB20"
      ctx.fillRect(
        viewportRect.x * scale,
        viewportRect.y * scale,
        viewportRect.width * scale,
        viewportRect.height * scale,
      )
    }
  }, [safeObjects, safeImages, loadedImages, scale, viewportRect])

  useEffect(() => {
    draw()
  }, [draw])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = (e.clientX - rect.left) / scale
      const y = (e.clientY - rect.top) / scale
      onPreviewClick(x, y)
    },
    [scale, onPreviewClick],
  )

  return (
    <div
      className={`absolute bottom-16 right-2 z-20 overflow-hidden rounded-lg border border-border bg-card shadow-lg sm:bottom-20 sm:right-4 ${className || ""}`}
    >
      <div className="border-b border-border px-2 py-1 text-[10px] font-medium text-muted-foreground sm:text-xs">
        Overview
      </div>
      <canvas
        ref={canvasRef}
        width={PREVIEW_WIDTH}
        height={PREVIEW_HEIGHT}
        onClick={handleClick}
        className="cursor-pointer"
      />
    </div>
  )
}
