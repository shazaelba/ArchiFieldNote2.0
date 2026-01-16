"use client"

import type React from "react"

import { useRef, useEffect, useCallback } from "react"
import type { Project, MapObject } from "@/lib/db"

interface ZoomPreviewProps {
  project: Project | undefined
  objects: MapObject[]
  canvasSize: { width: number; height: number } | null
  viewportRect: { x: number; y: number; width: number; height: number } | null
  onNavigate: (x: number, y: number) => void
  isDark: boolean
}

export function ZoomPreview({ project, objects, canvasSize, viewportRect, onNavigate, isDark }: ZoomPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const PREVIEW_WIDTH = 160
  const PREVIEW_HEIGHT = 100

  const effectiveCanvasSize = canvasSize ?? { width: 4000, height: 3000 }
  const scale = Math.min(PREVIEW_WIDTH / effectiveCanvasSize.width, PREVIEW_HEIGHT / effectiveCanvasSize.height)

  const safeObjects = objects ?? []

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    // Clear
    ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT)

    // Background
    ctx.fillStyle = isDark ? "#1a1a2e" : "#e8e8f0"
    ctx.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT)

    ctx.save()
    ctx.scale(scale, scale)

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
        ctx.lineWidth = 2 / scale
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
  }, [safeObjects, scale, viewportRect, isDark]) // Updated dependency

  useEffect(() => {
    draw()
  }, [draw])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = (e.clientX - rect.left) / scale
      const y = (e.clientY - rect.top) / scale
      onNavigate(x, y)
    },
    [scale, onNavigate],
  )

  return (
    <div
      ref={containerRef}
      className="absolute bottom-20 right-4 z-20 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
    >
      <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-b border-border">Overview</div>
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
