"use client"

import type React from "react"

import { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react"
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch"
import type { Project, MapObject, ObjectStyle, MapImage } from "@/lib/db"
import { hitTestObject, getDistance, isPointInPolygon, isPointNearLine, isPointNearPath, drawHatchPattern } from "@/lib/canvas-utils"
import { BottomControls } from "./bottom-controls"
import { ZoomPreview } from "./zoom-preview"

export type ToolMode =
  | "select"
  | "pan"
  | "polygon"
  | "threshold"
  | "calibrate"
  | "freehand"
  | "editVertices"
  | "eraser"
  | "highlighter"
  | "circle"
  | "square"
  | "triangle"
  | "match"

export interface DisplaySettings {
  pointSize: number
  hatchSpacing: number
  hatchLineWidth: number
  freehandStrokeWidth: number
  freehandSmoothing: number
}

export type GridStyle = "lines" | "dots" | "smallSquares"

interface MapCanvasProps {
  project: Project | undefined
  objects: MapObject[]
  toolMode: ToolMode
  selectedObjectId: string | null
  onSelectObject: (id: string | null) => void
  selectedImageId?: string | null
  onSelectImage?: (id: string | null) => void
  onUpdateImage?: (id: string, updates: Partial<MapImage>) => void
  onPolygonComplete: (vertices: { x: number; y: number }[]) => void
  onShapeComplete?: (type: "circle" | "square" | "triangle", vertices: { x: number; y: number }[]) => void
  onThresholdComplete: (start: { x: number; y: number }, end: { x: number; y: number }) => void
  onDeleteObject?: (id: string) => void
  onMatchStyle?: (style: ObjectStyle) => void
  onCalibrationComplete: (start: { x: number; y: number }, end: { x: number; y: number }, pixelDistance: number) => void
  onFreehandComplete: (vertices: { x: number; y: number }[]) => void
  onVertexUpdate: (objectId: string, vertices: { x: number; y: number }[]) => void
  sequenceMode: boolean
  onSequenceAdd: (objectId: string) => void
  onZoomChange?: (zoom: number) => void
  displaySettings: DisplaySettings
  isDark: boolean
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  gridStyle: GridStyle
  gridSize: number
}

export interface MapCanvasRef {
  finishPolygon: () => void
  cancelDrawing: () => void
}

const DEFAULT_CANVAS_WIDTH = 12000
const DEFAULT_CANVAS_HEIGHT = 9000

const SNAP_THRESHOLD = 15

export const MapCanvas = forwardRef<MapCanvasRef, MapCanvasProps>(function MapCanvas(
  {
    project,
    objects,
    toolMode,
    selectedObjectId,
    onSelectObject,
    selectedImageId,
    onSelectImage,
    onUpdateImage,
    onPolygonComplete,
    onShapeComplete,
    onThresholdComplete,
    onDeleteObject,
    onMatchStyle,
    onCalibrationComplete,
    onFreehandComplete,
    onVertexUpdate,
    sequenceMode,
    onSequenceAdd,
    onZoomChange,
    displaySettings,
    isDark,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    gridStyle,
    gridSize,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const transformRef = useRef<ReactZoomPanPinchRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [drawingVertices, setDrawingVertices] = useState<{ x: number; y: number }[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({})
  const [canvasSize, setCanvasSize] = useState({ width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT })
  const [zoomLevel, setZoomLevel] = useState(1)
  const [viewportRect, setViewportRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  const [editingVertexIndex, setEditingVertexIndex] = useState<number | null>(null)
  const [isDraggingVertex, setIsDraggingVertex] = useState(false)
  const [draggingImageId, setDraggingImageId] = useState<string | null>(null)
  const [transientImagePosition, setTransientImagePosition] = useState<{ x: number; y: number } | null>(null)

  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const initialImagePosRef = useRef<{ x: number; y: number } | null>(null)

  // Load images
  useEffect(() => {
    if (project?.images) {
      const newImages: Record<string, HTMLImageElement> = {}
      let loadedCount = 0
      const totalImages = project.images.length

      if (totalImages === 0) {
        setLoadedImages({})
        return
      }

      project.images.forEach(imgData => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          newImages[imgData.id] = img
          loadedCount++
          if (loadedCount === totalImages) {
            setLoadedImages(prev => ({ ...prev, ...newImages }))

            // Update canvas size to fit all images (simplified logic for now)
            // Ideally we calculate bounding box of all images
            const maxW = Math.max(DEFAULT_CANVAS_WIDTH, img.width + 4000)
            const maxH = Math.max(DEFAULT_CANVAS_HEIGHT, img.height + 4000)
            setCanvasSize(prev => ({
              width: Math.max(prev.width, maxW),
              height: Math.max(prev.height, maxH)
            }))
          }
        }
        img.src = imgData.src
      })
    } else {
      setLoadedImages({})
    }
  }, [project?.images])

  // Update viewport rect for preview
  const updateViewportRect = useCallback(() => {
    if (!transformRef.current || !containerRef.current) return

    const state = transformRef.current.instance.transformState
    const container = containerRef.current.getBoundingClientRect()

    const viewX = -state.positionX / state.scale
    const viewY = -state.positionY / state.scale
    const viewWidth = container.width / state.scale
    const viewHeight = container.height / state.scale

    setViewportRect({ x: viewX, y: viewY, width: viewWidth, height: viewHeight })
  }, [])

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const gridColor = isDark ? "#2d2d44" : "#d0d0e0"
      ctx.strokeStyle = gridColor
      ctx.fillStyle = gridColor

      if (gridStyle === "lines") {
        ctx.lineWidth = 1
        for (let x = 0; x < width; x += gridSize) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, height)
          ctx.stroke()
        }
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(width, y)
          ctx.stroke()
        }
      } else if (gridStyle === "dots") {
        for (let x = 0; x < width; x += gridSize) {
          for (let y = 0; y < height; y += gridSize) {
            ctx.beginPath()
            ctx.arc(x, y, 2, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      } else if (gridStyle === "smallSquares") {
        const smallSize = gridSize / 5
        ctx.lineWidth = 0.5
        for (let x = 0; x < width; x += smallSize) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, height)
          ctx.stroke()
        }
        for (let y = 0; y < height; y += smallSize) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(width, y)
          ctx.stroke()
        }
        ctx.lineWidth = 1.5
        ctx.strokeStyle = isDark ? "#3d3d54" : "#b0b0c0"
        for (let x = 0; x < width; x += gridSize) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, height)
          ctx.stroke()
        }
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(width, y)
          ctx.stroke()
        }
      }
    },
    [isDark, gridStyle, gridSize],
  )

  const drawArrowhead = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      from: { x: number; y: number },
      to: { x: number; y: number },
      size: number,
      color: string,
    ) => {
      const angle = Math.atan2(to.y - from.y, to.x - from.x)

      ctx.save()
      ctx.translate(to.x, to.y)
      ctx.rotate(angle)

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-size, -size / 2)
      ctx.lineTo(-size, size / 2)
      ctx.closePath()

      ctx.fillStyle = color
      ctx.fill()
      ctx.restore()
    },
    [],
  )

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = isDark ? "#1a1a2e" : "#e8e8f0"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    drawGrid(ctx, canvas.width, canvas.height)

    // Draw images
    if (project?.images) {
      // Sort by z-index
      const sortedImages = [...project.images].sort((a, b) => a.zIndex - b.zIndex)

      for (const imgData of sortedImages) {
        if (!imgData.visible) continue

        const img = loadedImages[imgData.id]
        if (!img) continue

        let position = imgData.position
        if (draggingImageId === imgData.id && transientImagePosition) {
          position = transientImagePosition
        }

        ctx.save()
        ctx.translate(position.x, position.y)
        ctx.rotate((imgData.rotation || 0) * (Math.PI / 180))
        ctx.scale(imgData.scale, imgData.scale)

        ctx.globalAlpha = imgData.opacity
        if (imgData.blendingMode) {
          ctx.globalCompositeOperation = imgData.blendingMode as GlobalCompositeOperation
        }

        ctx.drawImage(img, 0, 0)

        if (selectedImageId === imgData.id) {
          ctx.strokeStyle = "#3b82f6"
          ctx.lineWidth = 2 / (imgData.scale * zoomLevel)
          ctx.strokeRect(0, 0, img.width, img.height)
        }

        ctx.restore()
      }
    }

    // Draw objects
    objects.forEach((obj) => {
      const isSelected = obj.id === selectedObjectId
      const isEditing = isSelected && toolMode === "editVertices"
      ctx.save()

      const pointSize = obj.style.pointSize || displaySettings.pointSize
      const hatchSpacing = obj.style.hatchSpacing || displaySettings.hatchSpacing
      const hatchLineWidth = obj.style.hatchLineWidth || displaySettings.hatchLineWidth
      const showPoints = obj.style.showPoints !== false

      if (obj.type === "polygon" && obj.vertices.length > 2) {
        ctx.beginPath()
        ctx.moveTo(obj.vertices[0].x, obj.vertices[0].y)
        for (let i = 1; i < obj.vertices.length; i++) {
          ctx.lineTo(obj.vertices[i].x, obj.vertices[i].y)
        }
        ctx.closePath()

        ctx.fillStyle =
          obj.style.fillColor +
          Math.round(obj.style.fillOpacity * 255)
            .toString(16)
            .padStart(2, "0")
        ctx.fill()

        if (obj.style.hatchPattern !== "none") {
          drawHatchPattern(
            ctx,
            obj.vertices,
            obj.style.hatchPattern,
            obj.style.strokeColor,
            hatchSpacing,
            hatchLineWidth,
          )
        }

        if (obj.style.strokeStyle !== "none") {
          ctx.strokeStyle = isSelected ? "#3C00BB" : obj.style.strokeColor
          ctx.lineWidth = isSelected ? obj.style.strokeWidth + 2 : obj.style.strokeWidth

          const dash = obj.style.dashSpacing || 10
          if (obj.style.strokeStyle === "dashed") {
            ctx.setLineDash([dash, dash])
          } else if (obj.style.strokeStyle === "dotted") {
            ctx.setLineDash([2, dash])
          }
          ctx.stroke()
        } else if (isSelected) {
          ctx.strokeStyle = "#3C00BB"
          ctx.lineWidth = 2
          ctx.stroke()
        }

        if (showPoints || isEditing || isSelected) {
          obj.vertices.forEach((v, idx) => {
            ctx.beginPath()
            const radius = isEditing ? pointSize + 4 : isSelected ? pointSize + 2 : pointSize
            ctx.arc(v.x, v.y, radius, 0, Math.PI * 2)
            ctx.fillStyle =
              isEditing && editingVertexIndex === idx ? "#ff6b00" : isSelected ? "#3C00BB" : obj.style.strokeColor
            ctx.fill()

            if (isEditing) {
              ctx.strokeStyle = "#ffffff"
              ctx.lineWidth = 2
              ctx.stroke()
            }
          })
        }
      } else if (obj.type === "threshold" && obj.vertices.length === 2) {
        ctx.beginPath()
        ctx.moveTo(obj.vertices[0].x, obj.vertices[0].y)
        ctx.lineTo(obj.vertices[1].x, obj.vertices[1].y)

        ctx.strokeStyle = isSelected ? "#3C00BB" : obj.style.strokeColor
        ctx.lineWidth = isSelected ? obj.style.strokeWidth + 2 : obj.style.strokeWidth

        const dash = obj.style.dashSpacing || 10
        if (obj.style.strokeStyle === "dashed") {
          ctx.setLineDash([dash, dash])
        } else if (obj.style.strokeStyle === "dotted") {
          ctx.setLineDash([2, dash])
        }

        ctx.stroke()
        ctx.setLineDash([])

        const endpointStyle = obj.style.lineEndpoints || "none"
        const endpointSize = obj.style.endpointSize || 8
        const color = isSelected ? "#3C00BB" : obj.style.strokeColor

        if (isEditing) {
          // Always show draggable points when editing
          obj.vertices.forEach((v, idx) => {
            ctx.beginPath()
            const radius = endpointSize + 4
            ctx.arc(v.x, v.y, radius, 0, Math.PI * 2)
            ctx.fillStyle = editingVertexIndex === idx ? "#ff6b00" : color
            ctx.fill()
            ctx.strokeStyle = "#ffffff"
            ctx.lineWidth = 2
            ctx.stroke()
          })
        } else if (endpointStyle === "points") {
          obj.vertices.forEach((v) => {
            ctx.beginPath()
            ctx.arc(v.x, v.y, endpointSize, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.fill()
          })
        } else if (endpointStyle === "arrows") {
          drawArrowhead(ctx, obj.vertices[0], obj.vertices[1], endpointSize, color)
          ctx.beginPath()
          ctx.arc(obj.vertices[0].x, obj.vertices[0].y, endpointSize / 2, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.fill()
        }
        // "none" - no endpoints drawn unless editing
      } else if (obj.type === "freehand" && obj.vertices.length > 1) {
        ctx.beginPath()
        ctx.moveTo(obj.vertices[0].x, obj.vertices[0].y)

        for (let i = 1; i < obj.vertices.length - 1; i++) {
          const xc = (obj.vertices[i].x + obj.vertices[i + 1].x) / 2
          const yc = (obj.vertices[i].y + obj.vertices[i + 1].y) / 2
          ctx.quadraticCurveTo(obj.vertices[i].x, obj.vertices[i].y, xc, yc)
        }
        if (obj.vertices.length > 1) {
          ctx.lineTo(obj.vertices[obj.vertices.length - 1].x, obj.vertices[obj.vertices.length - 1].y)
        }

        ctx.strokeStyle = isSelected ? "#3C00BB" : obj.style.strokeColor
        ctx.lineWidth = isSelected ? obj.style.strokeWidth + 2 : obj.style.strokeWidth
        ctx.lineCap = "round"
        ctx.lineJoin = "round"

        const dash = obj.style.dashSpacing || 10
        if (obj.style.strokeStyle === "dashed") {
          ctx.setLineDash([dash, dash])
        } else if (obj.style.strokeStyle === "dotted") {
          ctx.setLineDash([2, dash])
        }

        ctx.stroke()
        ctx.setLineDash([])
      } else if (obj.type === "circle" && obj.vertices.length === 2) {
        const radius = getDistance(obj.vertices[0], obj.vertices[1])
        ctx.beginPath()
        ctx.arc(obj.vertices[0].x, obj.vertices[0].y, radius, 0, Math.PI * 2)
        ctx.fillStyle = obj.style.fillColor + Math.round(obj.style.fillOpacity * 255).toString(16).padStart(2, "0")
        ctx.fill()

        if (obj.style.strokeStyle !== "none") {
          ctx.strokeStyle = isSelected ? "#3C00BB" : obj.style.strokeColor
          ctx.lineWidth = isSelected ? obj.style.strokeWidth + 2 : obj.style.strokeWidth
          const dash = obj.style.dashSpacing || 10
          if (obj.style.strokeStyle === "dashed") {
            ctx.setLineDash([dash, dash])
          } else if (obj.style.strokeStyle === "dotted") {
            ctx.setLineDash([2, dash])
          }
          ctx.stroke()
          ctx.setLineDash([])
        }
      } else if (obj.type === "square" && obj.vertices.length === 2) {
        const w = obj.vertices[1].x - obj.vertices[0].x
        const h = obj.vertices[1].y - obj.vertices[0].y
        ctx.beginPath()
        ctx.rect(obj.vertices[0].x, obj.vertices[0].y, w, h)
        ctx.fillStyle = obj.style.fillColor + Math.round(obj.style.fillOpacity * 255).toString(16).padStart(2, "0")
        ctx.fill()

        if (obj.style.hatchPattern !== "none") {
          const squareVertices = [
            obj.vertices[0],
            { x: obj.vertices[0].x + w, y: obj.vertices[0].y },
            obj.vertices[1],
            { x: obj.vertices[0].x, y: obj.vertices[1].y }
          ]
          drawHatchPattern(ctx, squareVertices, obj.style.hatchPattern, obj.style.strokeColor, hatchSpacing, hatchLineWidth)
        }

        if (obj.style.strokeStyle !== "none") {
          ctx.strokeStyle = isSelected ? "#3C00BB" : obj.style.strokeColor
          ctx.lineWidth = isSelected ? obj.style.strokeWidth + 2 : obj.style.strokeWidth
          const dash = obj.style.dashSpacing || 10
          if (obj.style.strokeStyle === "dashed") {
            ctx.setLineDash([dash, dash])
          } else if (obj.style.strokeStyle === "dotted") {
            ctx.setLineDash([2, dash])
          }
          ctx.stroke()
          ctx.setLineDash([])
        }
      } else if (obj.type === "triangle" && obj.vertices.length === 2) {
        const x1 = obj.vertices[0].x
        const y1 = obj.vertices[0].y
        const x2 = obj.vertices[1].x
        const y2 = obj.vertices[1].y
        const minX = Math.min(x1, x2)
        const maxX = Math.max(x1, x2)
        const minY = Math.min(y1, y2)
        const maxY = Math.max(y1, y2)
        const w = maxX - minX
        const h = maxY - minY

        ctx.beginPath()
        ctx.moveTo(minX + w / 2, minY)
        ctx.lineTo(maxX, maxY)
        ctx.lineTo(minX, maxY)
        ctx.closePath()

        ctx.fillStyle = obj.style.fillColor + Math.round(obj.style.fillOpacity * 255).toString(16).padStart(2, "0")
        ctx.fill()

        if (obj.style.hatchPattern !== "none") {
          const triangleVertices = [
            { x: minX + w / 2, y: minY },
            { x: maxX, y: maxY },
            { x: minX, y: maxY }
          ]
          drawHatchPattern(ctx, triangleVertices, obj.style.hatchPattern, obj.style.strokeColor, hatchSpacing, hatchLineWidth)
        }

        if (obj.style.strokeStyle !== "none") {
          ctx.strokeStyle = isSelected ? "#3C00BB" : obj.style.strokeColor
          ctx.lineWidth = isSelected ? obj.style.strokeWidth + 2 : obj.style.strokeWidth
          const dash = obj.style.dashSpacing || 10
          if (obj.style.strokeStyle === "dashed") {
            ctx.setLineDash([dash, dash])
          } else if (obj.style.strokeStyle === "dotted") {
            ctx.setLineDash([2, dash])
          }
          ctx.stroke()
          ctx.setLineDash([])
        }
      }

      ctx.restore()
    })

    // Draw calibration line if exists
    if (project?.calibrationPoints) {
      ctx.save()
      ctx.strokeStyle = "#ffcc00"
      ctx.lineWidth = 2
      ctx.setLineDash([10, 5])
      ctx.beginPath()
      ctx.moveTo(project.calibrationPoints.start.x, project.calibrationPoints.start.y)
      ctx.lineTo(project.calibrationPoints.end.x, project.calibrationPoints.end.y)
      ctx.stroke()
      ctx.setLineDash([])
        ;[project.calibrationPoints.start, project.calibrationPoints.end].forEach((p) => {
          ctx.beginPath()
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2)
          ctx.fillStyle = "#ffcc00"
          ctx.fill()
        })
      ctx.restore()
    }

    // Draw current drawing
    if (drawingVertices.length > 0) {
      ctx.save()
      ctx.strokeStyle = toolMode === "calibrate" ? "#ffcc00" : "#3C00BB"
      ctx.lineWidth = toolMode === "freehand" ? displaySettings.freehandStrokeWidth : 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      if (toolMode === "polygon") {
        ctx.beginPath()
        ctx.moveTo(drawingVertices[0].x, drawingVertices[0].y)
        for (let i = 1; i < drawingVertices.length; i++) {
          ctx.lineTo(drawingVertices[i].x, drawingVertices[i].y)
        }
        ctx.stroke()

        drawingVertices.forEach((v) => {
          ctx.beginPath()
          ctx.arc(v.x, v.y, displaySettings.pointSize, 0, Math.PI * 2)
          ctx.fillStyle = "#3C00BB"
          ctx.fill()
        })
      } else if (toolMode === "freehand" && drawingVertices.length > 1) {
        ctx.beginPath()
        ctx.moveTo(drawingVertices[0].x, drawingVertices[0].y)

        for (let i = 1; i < drawingVertices.length - 1; i++) {
          const xc = (drawingVertices[i].x + drawingVertices[i + 1].x) / 2
          const yc = (drawingVertices[i].y + drawingVertices[i + 1].y) / 2
          ctx.quadraticCurveTo(drawingVertices[i].x, drawingVertices[i].y, xc, yc)
        }
        ctx.lineTo(drawingVertices[drawingVertices.length - 1].x, drawingVertices[drawingVertices.length - 1].y)
        ctx.stroke()
      } else if ((toolMode === "threshold" || toolMode === "calibrate") && drawingVertices.length >= 1) {
        ctx.beginPath()
        ctx.moveTo(drawingVertices[0].x, drawingVertices[0].y)
        if (drawingVertices.length === 2) {
          ctx.lineTo(drawingVertices[1].x, drawingVertices[1].y)
        }
        ctx.stroke()

        drawingVertices.forEach((v) => {
          ctx.beginPath()
          ctx.arc(v.x, v.y, displaySettings.pointSize, 0, Math.PI * 2)
          ctx.fillStyle = toolMode === "calibrate" ? "#ffcc00" : "#3C00BB"
          ctx.fill()
        })
      } else if (["circle", "square", "triangle"].includes(toolMode) && drawingVertices.length >= 1) {
        const start = drawingVertices[0]
        const end = drawingVertices.length > 1 ? drawingVertices[1] : start

        ctx.strokeStyle = "#3C00BB"
        ctx.lineWidth = 2

        if (toolMode === "circle") {
          const radius = getDistance(start, end)
          ctx.beginPath()
          ctx.arc(start.x, start.y, radius, 0, Math.PI * 2)
          ctx.stroke()
        } else if (toolMode === "square") {
          const w = end.x - start.x
          const h = end.y - start.y
          ctx.strokeRect(start.x, start.y, w, h)
        } else if (toolMode === "triangle") {
          const x1 = start.x
          const y1 = start.y
          const x2 = end.x
          const y2 = end.y
          const minX = Math.min(x1, x2)
          const maxX = Math.max(x1, x2)
          const minY = Math.min(y1, y2)
          const maxY = Math.max(y1, y2)
          const w = maxX - minX
          const h = maxY - minY

          ctx.beginPath()
          ctx.moveTo(minX + w / 2, minY)
          ctx.lineTo(maxX, maxY)
          ctx.lineTo(minX, maxY)
          ctx.closePath()
          ctx.stroke()
        }
      }

      ctx.restore()
    }
  }, [
    project,
    objects,
    selectedObjectId,
    selectedImageId,
    drawingVertices,
    toolMode,
    displaySettings,
    isDark,
    drawGrid,
    drawArrowhead,
    editingVertexIndex,
    loadedImages
  ])

  useEffect(() => {
    draw()
  }, [draw])

  const getCanvasCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  const findVertexNear = useCallback((coords: { x: number; y: number }, obj: MapObject): number | null => {
    const threshold = 20
    for (let i = 0; i < obj.vertices.length; i++) {
      if (getDistance(coords, obj.vertices[i]) < threshold) {
        return i
      }
    }
    return null
  }, [])

  const snapToNearbyVertex = useCallback(
    (coords: { x: number; y: number }, excludeObjectId?: string): { x: number; y: number } => {
      for (const obj of objects) {
        if (obj.id === excludeObjectId) continue
        for (const vertex of obj.vertices) {
          if (getDistance(coords, vertex) < SNAP_THRESHOLD) {
            return { x: vertex.x, y: vertex.y }
          }
        }
      }
      return coords
    },
    [objects],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (toolMode === "pan") return

      const coords = getCanvasCoords(e)

      if (toolMode === "editVertices" && selectedObjectId) {
        const selectedObj = objects.find((o) => o.id === selectedObjectId)
        if (selectedObj) {
          const vertexIdx = findVertexNear(coords, selectedObj)
          if (vertexIdx !== null) {
            setEditingVertexIndex(vertexIdx)
            setIsDraggingVertex(true)
            return
          }
        }
      }

      if (toolMode === "select" || sequenceMode) {
        // Check objects (reverse order for z-index)
        for (let i = objects.length - 1; i >= 0; i--) {
          const obj = objects[i]
          if (hitTestObject(coords, obj)) {
            if (sequenceMode) {
              onSequenceAdd(obj.id)
            } else {
              onSelectObject(obj.id)
            }
            return
          }

        }

        // 2. Check images (if no object hit, and not in sequence mode)
        if (!sequenceMode && project?.images && onSelectImage) {
          const sortedImages = [...project.images].sort((a, b) => b.zIndex - a.zIndex)
          for (const imgData of sortedImages) {
            if (!imgData.visible) continue

            const img = loadedImages[imgData.id]
            if (!img) continue

            const w = img.width * imgData.scale
            const h = img.height * imgData.scale

            // TODO: Handle rotation hit testing
            if (coords.x >= imgData.position.x && coords.x <= imgData.position.x + w &&
              coords.y >= imgData.position.y && coords.y <= imgData.position.y + h) {
              onSelectImage(imgData.id)
              onSelectObject(null)

              if (!imgData.locked) {
                setDraggingImageId(imgData.id)
                dragStartRef.current = coords
                initialImagePosRef.current = imgData.position
              }
              return
            }
          }
          // If clicked on nothing
          onSelectImage(null)
        }

        onSelectObject(null)
        onSelectObject(null)
      } else if (toolMode === "polygon") {
        setDrawingVertices((prev) => [...prev, coords])
        setIsDrawing(true)
      } else if (toolMode === "freehand" || toolMode === "highlighter") {
        setDrawingVertices([coords])
        setIsDrawing(true)
      } else if (["circle", "square", "triangle"].includes(toolMode)) {
        setDrawingVertices([coords])
        setIsDrawing(true)
      } else if (toolMode === "eraser") {
        for (let i = objects.length - 1; i >= 0; i--) {
          const obj = objects[i]
          if (hitTestObject(coords, obj)) {
            onDeleteObject?.(obj.id)
            return
          }
        }
      } else if (toolMode === "match") {
        for (let i = objects.length - 1; i >= 0; i--) {
          const obj = objects[i]
          if (hitTestObject(coords, obj)) {
            onMatchStyle?.(obj.style)
            return
          }
        }
        // ... other types

      } else if (toolMode === "threshold" || toolMode === "calibrate") {
        if (drawingVertices.length === 0) {
          setDrawingVertices([coords])
          setIsDrawing(true)
        } else if (drawingVertices.length === 1) {
          const start = drawingVertices[0]
          const end = coords
          const pixelDistance = getDistance(start, end)

          if (toolMode === "threshold") {
            onThresholdComplete(start, end)
          } else {
            onCalibrationComplete(start, end, pixelDistance)
          }

          setDrawingVertices([])
          setIsDrawing(false)
        }
      }
    },
    [
      toolMode,
      sequenceMode,
      objects,
      drawingVertices,
      selectedObjectId,
      getCanvasCoords,
      findVertexNear,
      onSelectObject,
      onSequenceAdd,
      onThresholdComplete,
      onCalibrationComplete,
      project?.images,
      loadedImages,
      onSelectImage
    ],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e)

      if (draggingImageId && dragStartRef.current && initialImagePosRef.current) {
        const dx = coords.x - dragStartRef.current.x
        const dy = coords.y - dragStartRef.current.y
        setTransientImagePosition({
          x: initialImagePosRef.current.x + dx,
          y: initialImagePosRef.current.y + dy,
        })
        return
      }

      if (isDraggingVertex && editingVertexIndex !== null && selectedObjectId) {
        const selectedObj = objects.find((o) => o.id === selectedObjectId)
        if (selectedObj) {
          const newVertices = [...selectedObj.vertices]
          const snappedCoords = snapToNearbyVertex(coords, selectedObjectId)
          newVertices[editingVertexIndex] = snappedCoords
          onVertexUpdate(selectedObjectId, newVertices)
        }
        return
      }

      if (!isDrawing) return

      if (toolMode === "freehand" || toolMode === "highlighter") {
        const lastPoint = drawingVertices[drawingVertices.length - 1]
        const minDistance = displaySettings.freehandSmoothing || 3

        if (lastPoint && getDistance(lastPoint, coords) > minDistance) {
          setDrawingVertices((prev) => [...prev, coords])
        }
      } else if (["circle", "square", "triangle"].includes(toolMode)) {
        if (drawingVertices.length > 0) {
          setDrawingVertices([drawingVertices[0], coords])
        }
      }
    },
    [
      isDrawing,
      toolMode,
      drawingVertices,
      displaySettings.freehandSmoothing,
      getCanvasCoords,
      isDraggingVertex,
      editingVertexIndex,
      selectedObjectId,
      objects,
      onVertexUpdate,
      snapToNearbyVertex,
    ],
  )

  const handlePointerUp = useCallback(() => {

    if (draggingImageId && transientImagePosition && onUpdateImage) {
      onUpdateImage(draggingImageId, { position: transientImagePosition })
      setDraggingImageId(null)
      setTransientImagePosition(null)
      dragStartRef.current = null
      initialImagePosRef.current = null
      return
    }

    if (isDraggingVertex) {
      setIsDraggingVertex(false)
      setEditingVertexIndex(null)
      return
    }

    if ((toolMode === "freehand" || toolMode === "highlighter") && isDrawing && drawingVertices.length > 5) {
      onFreehandComplete(drawingVertices)
      setDrawingVertices([])
      setIsDrawing(false)
    } else if (["circle", "square", "triangle"].includes(toolMode) && isDrawing && drawingVertices.length === 2) {
      onShapeComplete?.(toolMode as "circle" | "square" | "triangle", drawingVertices)
      setDrawingVertices([])
      setIsDrawing(false)
    }
  }, [toolMode, isDrawing, drawingVertices, onFreehandComplete, isDraggingVertex, draggingImageId, transientImagePosition, onUpdateImage, onShapeComplete])

  const finishPolygon = useCallback(() => {
    if (drawingVertices.length >= 3) {
      onPolygonComplete(drawingVertices)
    }
    setDrawingVertices([])
    setIsDrawing(false)
  }, [drawingVertices, onPolygonComplete])

  const cancelDrawing = useCallback(() => {
    setDrawingVertices([])
    setIsDrawing(false)
  }, [])

  useImperativeHandle(ref, () => ({
    finishPolygon,
    cancelDrawing,
  }))

  const handleTransformChange = useCallback(
    (ref: ReactZoomPanPinchRef) => {
      const newZoom = ref.state.scale
      setZoomLevel(newZoom)
      onZoomChange?.(newZoom)
      updateViewportRect()
    },
    [onZoomChange, updateViewportRect],
  )

  const handlePreviewClick = useCallback((x: number, y: number) => {
    if (transformRef.current) {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const zoom = transformRef.current.instance.transformState.scale

      const newX = -(x * zoom) + rect.width / 2
      const newY = -(y * zoom) + rect.height / 2

      transformRef.current.setTransform(newX, newY, zoom, 300)
    }
  }, [])

  const handleZoomIn = useCallback(() => {
    transformRef.current?.zoomIn(0.5, 200)
  }, [])

  const handleZoomOut = useCallback(() => {
    transformRef.current?.zoomOut(0.5, 200)
  }, [])

  const handleReset = useCallback(() => {
    transformRef.current?.resetTransform(200)
  }, [])
  const handleFit = useCallback(() => {
    if (containerRef.current && project?.images && project.images.length > 0) {
      const container = containerRef.current.getBoundingClientRect()

      // Calculate bounding box of all visible images
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      let hasVisibleImages = false

      project.images.forEach(imgData => {
        if (!imgData.visible) return
        const img = loadedImages[imgData.id]
        if (!img) return

        hasVisibleImages = true
        minX = Math.min(minX, imgData.position.x)
        minY = Math.min(minY, imgData.position.y)
        maxX = Math.max(maxX, imgData.position.x + img.width * imgData.scale)
        maxY = Math.max(maxY, imgData.position.y + img.height * imgData.scale)
      })

      if (!hasVisibleImages) return

      const contentWidth = maxX - minX
      const contentHeight = maxY - minY

      const scaleX = container.width / contentWidth
      const scaleY = container.height / contentHeight
      const scale = Math.min(scaleX, scaleY, 1) * 0.9

      // Center the content
      const midX = (minX + maxX) / 2
      const midY = (minY + maxY) / 2

      // Calculate position to center the content
      // transform center is viewport center.
      // We want midX, midY to be at center.
      // x = -midX * scale + viewportWidth/2
      // y = -midY * scale + viewportHeight/2

      const targetX = -midX * scale + container.width / 2
      const targetY = -midY * scale + container.height / 2

      transformRef.current?.setTransform(targetX, targetY, scale, 200)
    }
  }, [project?.images, loadedImages])

  return (
    <div ref={containerRef} className="absolute inset-0 top-14 overflow-hidden sm:top-16">
      <TransformWrapper
        ref={transformRef}
        initialScale={0.5}
        minScale={0.1}
        maxScale={5}
        limitToBounds={false}
        panning={{ disabled: toolMode !== "pan" && toolMode !== "select" }}
        onTransformed={handleTransformChange}
        onPanning={updateViewportRect}
        onPinching={updateViewportRect}
        pinch={{ step: 5 }}
        wheel={{ step: 0.1, smoothStep: 0.005 }}
        doubleClick={{ disabled: true }}
      >
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
          contentStyle={{ width: canvasSize.width, height: canvasSize.height }}
        >
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </TransformComponent>
      </TransformWrapper>

      {/* Finish polygon button */}
      {toolMode === "polygon" && drawingVertices.length >= 3 && (
        <button
          onClick={finishPolygon}
          className="absolute right-4 top-4 z-20 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 sm:right-6 sm:top-6"
        >
          Finish Polygon ({drawingVertices.length} points)
        </button>
      )}

      {/* Zoom preview - hidden on small screens */}
      <ZoomPreview
        canvasSize={canvasSize}
        viewportRect={viewportRect}
        loadedImages={loadedImages}
        images={project?.images || []}
        objects={objects}
        onPreviewClick={handlePreviewClick}
        className="hidden sm:block"
      />

      {/* Bottom controls */}
      <BottomControls
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
        onFit={handleFit}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
      />
    </div>
  )
})
