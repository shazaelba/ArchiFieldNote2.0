"use client"

import type React from "react"

import { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react"
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch"
import type { Project, MapObject } from "@/lib/db"
import { getDistance, isPointInPolygon, isPointNearLine, isPointNearPath, drawHatchPattern } from "@/lib/canvas-utils"
import { BottomControls } from "./bottom-controls"
import { ZoomPreview } from "./zoom-preview"

export type ToolMode = "select" | "pan" | "polygon" | "threshold" | "calibrate" | "freehand" | "editVertices"

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
  onPolygonComplete: (vertices: { x: number; y: number }[]) => void
  onThresholdComplete: (start: { x: number; y: number }, end: { x: number; y: number }) => void
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

const DEFAULT_CANVAS_WIDTH = 8000
const DEFAULT_CANVAS_HEIGHT = 6000

export const MapCanvas = forwardRef<MapCanvasRef, MapCanvasProps>(function MapCanvas(
  {
    project,
    objects,
    toolMode,
    selectedObjectId,
    onSelectObject,
    onPolygonComplete,
    onThresholdComplete,
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
  const [baseMapImage, setBaseMapImage] = useState<HTMLImageElement | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT })
  const [zoomLevel, setZoomLevel] = useState(1)
  const [viewportRect, setViewportRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  const [editingVertexIndex, setEditingVertexIndex] = useState<number | null>(null)
  const [isDraggingVertex, setIsDraggingVertex] = useState(false)

  // Load base map image
  useEffect(() => {
    if (project?.baseMapImage) {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        setBaseMapImage(img)
        const width = Math.max(DEFAULT_CANVAS_WIDTH, img.width + 2000)
        const height = Math.max(DEFAULT_CANVAS_HEIGHT, img.height + 2000)
        setCanvasSize({ width, height })
      }
      img.src = project.baseMapImage
    } else {
      setBaseMapImage(null)
      setCanvasSize({ width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT })
    }
  }, [project?.baseMapImage])

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
        // Major grid lines
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

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = isDark ? "#1a1a2e" : "#e8e8f0"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height)

    // Draw base map
    if (baseMapImage) {
      ctx.drawImage(
        baseMapImage,
        project?.baseMapPosition.x || 0,
        project?.baseMapPosition.y || 0,
        baseMapImage.width * (project?.baseMapScale || 1),
        baseMapImage.height * (project?.baseMapScale || 1),
      )
    }

    // Draw objects
    objects.forEach((obj) => {
      const isSelected = obj.id === selectedObjectId
      const isEditing = isSelected && toolMode === "editVertices"
      ctx.save()

      // Get per-object settings with fallbacks
      const pointSize = obj.style.pointSize || displaySettings.pointSize
      const hatchSpacing = obj.style.hatchSpacing || displaySettings.hatchSpacing
      const hatchLineWidth = obj.style.hatchLineWidth || displaySettings.hatchLineWidth

      if (obj.type === "polygon" && obj.vertices.length > 2) {
        // Draw fill
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

        // Draw hatch pattern with per-object settings
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

        // Draw stroke
        ctx.strokeStyle = isSelected ? "#3C00BB" : obj.style.strokeColor
        ctx.lineWidth = isSelected ? obj.style.strokeWidth + 2 : obj.style.strokeWidth
        ctx.stroke()

        // Draw vertices
        obj.vertices.forEach((v, idx) => {
          ctx.beginPath()
          const radius = isEditing ? pointSize + 4 : isSelected ? pointSize + 2 : pointSize
          ctx.arc(v.x, v.y, radius, 0, Math.PI * 2)
          ctx.fillStyle =
            isEditing && editingVertexIndex === idx ? "#ff6b00" : isSelected ? "#3C00BB" : obj.style.strokeColor
          ctx.fill()

          // Draw white border for editing vertices
          if (isEditing) {
            ctx.strokeStyle = "#ffffff"
            ctx.lineWidth = 2
            ctx.stroke()
          }
        })
      } else if (obj.type === "threshold" && obj.vertices.length === 2) {
        ctx.beginPath()
        ctx.moveTo(obj.vertices[0].x, obj.vertices[0].y)
        ctx.lineTo(obj.vertices[1].x, obj.vertices[1].y)

        ctx.strokeStyle = isSelected ? "#3C00BB" : obj.style.strokeColor
        ctx.lineWidth = isSelected ? obj.style.strokeWidth + 2 : obj.style.strokeWidth

        if (obj.style.strokeStyle === "dashed") {
          ctx.setLineDash([15, 10])
        } else if (obj.style.strokeStyle === "dotted") {
          ctx.setLineDash([5, 5])
        }

        ctx.stroke()
        ctx.setLineDash([])

        const endpointStyle = obj.style.lineEndpoints || "points"
        const endpointSize = obj.style.endpointSize || 8
        const color = isSelected ? "#3C00BB" : obj.style.strokeColor

        if (endpointStyle === "points") {
          obj.vertices.forEach((v, idx) => {
            ctx.beginPath()
            const radius = isEditing ? endpointSize + 4 : isSelected ? endpointSize + 2 : endpointSize
            ctx.arc(v.x, v.y, radius, 0, Math.PI * 2)
            ctx.fillStyle = isEditing && editingVertexIndex === idx ? "#ff6b00" : color
            ctx.fill()

            if (isEditing) {
              ctx.strokeStyle = "#ffffff"
              ctx.lineWidth = 2
              ctx.stroke()
            }
          })
        } else if (endpointStyle === "arrows") {
          // Draw arrow at end point
          drawArrowhead(ctx, obj.vertices[0], obj.vertices[1], endpointSize, color)
          // Draw small circle at start
          ctx.beginPath()
          ctx.arc(obj.vertices[0].x, obj.vertices[0].y, endpointSize / 2, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.fill()
        }
        // "none" - no endpoints drawn
      } else if (obj.type === "freehand" && obj.vertices.length > 1) {
        ctx.beginPath()
        ctx.moveTo(obj.vertices[0].x, obj.vertices[0].y)

        // Use quadratic curves for smoothing
        for (let i = 1; i < obj.vertices.length - 1; i++) {
          const xc = (obj.vertices[i].x + obj.vertices[i + 1].x) / 2
          const yc = (obj.vertices[i].y + obj.vertices[i + 1].y) / 2
          ctx.quadraticCurveTo(obj.vertices[i].x, obj.vertices[i].y, xc, yc)
        }
        // Last point
        if (obj.vertices.length > 1) {
          ctx.lineTo(obj.vertices[obj.vertices.length - 1].x, obj.vertices[obj.vertices.length - 1].y)
        }

        ctx.strokeStyle = isSelected ? "#3C00BB" : obj.style.strokeColor
        ctx.lineWidth = isSelected ? obj.style.strokeWidth + 2 : obj.style.strokeWidth
        ctx.lineCap = "round"
        ctx.lineJoin = "round"

        if (obj.style.strokeStyle === "dashed") {
          ctx.setLineDash([15, 10])
        } else if (obj.style.strokeStyle === "dotted") {
          ctx.setLineDash([5, 5])
        }

        ctx.stroke()
        ctx.setLineDash([])
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

      // Draw endpoints
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
      }

      ctx.restore()
    }
  }, [
    baseMapImage,
    project,
    objects,
    selectedObjectId,
    drawingVertices,
    toolMode,
    displaySettings,
    isDark,
    drawGrid,
    drawArrowhead,
    editingVertexIndex,
  ])

  useEffect(() => {
    draw()
  }, [draw])

  // Get canvas coordinates from pointer event
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

  // Handle pointer events
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
        // Find clicked object
        for (const obj of objects) {
          if (obj.type === "polygon" && isPointInPolygon(coords, obj.vertices)) {
            if (sequenceMode) {
              onSequenceAdd(obj.id)
            } else {
              onSelectObject(obj.id)
            }
            return
          } else if (obj.type === "threshold" && obj.vertices.length === 2) {
            if (isPointNearLine(coords, obj.vertices[0], obj.vertices[1], 15)) {
              if (sequenceMode) {
                onSequenceAdd(obj.id)
              } else {
                onSelectObject(obj.id)
              }
              return
            }
          } else if (obj.type === "freehand" && obj.vertices.length > 1) {
            if (isPointNearPath(coords, obj.vertices, 15)) {
              if (sequenceMode) {
                onSequenceAdd(obj.id)
              } else {
                onSelectObject(obj.id)
              }
              return
            }
          }
        }
        onSelectObject(null)
      } else if (toolMode === "polygon") {
        setDrawingVertices((prev) => [...prev, coords])
        setIsDrawing(true)
      } else if (toolMode === "freehand") {
        setDrawingVertices([coords])
        setIsDrawing(true)
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
    ],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e)

      if (isDraggingVertex && editingVertexIndex !== null && selectedObjectId) {
        const selectedObj = objects.find((o) => o.id === selectedObjectId)
        if (selectedObj) {
          const newVertices = [...selectedObj.vertices]
          newVertices[editingVertexIndex] = coords
          onVertexUpdate(selectedObjectId, newVertices)
        }
        return
      }

      if (!isDrawing || toolMode !== "freehand") return

      // Apply smoothing by only adding points that are far enough apart
      const lastPoint = drawingVertices[drawingVertices.length - 1]
      const minDistance = displaySettings.freehandSmoothing || 3

      if (lastPoint && getDistance(lastPoint, coords) > minDistance) {
        setDrawingVertices((prev) => [...prev, coords])
      }
    },
    [
      isDrawing,
      toolMode,
      getCanvasCoords,
      drawingVertices,
      displaySettings.freehandSmoothing,
      isDraggingVertex,
      editingVertexIndex,
      selectedObjectId,
      objects,
      onVertexUpdate,
    ],
  )

  const handlePointerUp = useCallback(() => {
    if (isDraggingVertex) {
      setIsDraggingVertex(false)
      setEditingVertexIndex(null)
      return
    }

    if (isDrawing && toolMode === "freehand" && drawingVertices.length > 2) {
      onFreehandComplete(drawingVertices)
      setDrawingVertices([])
      setIsDrawing(false)
    }
  }, [isDrawing, toolMode, drawingVertices, onFreehandComplete, isDraggingVertex])

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

  // Expose methods via ref
  useImperativeHandle(
    ref,
    () => ({
      finishPolygon,
      cancelDrawing,
    }),
    [finishPolygon, cancelDrawing],
  )

  // Zoom control handlers
  const handleZoomIn = useCallback(() => {
    transformRef.current?.zoomIn(0.3)
  }, [])

  const handleZoomOut = useCallback(() => {
    transformRef.current?.zoomOut(0.3)
  }, [])

  const handleZoomReset = useCallback(() => {
    transformRef.current?.resetTransform()
  }, [])

  const handleZoomFit = useCallback(() => {
    if (!containerRef.current) return
    const container = containerRef.current.getBoundingClientRect()
    const scaleX = container.width / canvasSize.width
    const scaleY = container.height / canvasSize.height
    const scale = Math.min(scaleX, scaleY) * 0.9
    transformRef.current?.setTransform(
      (container.width - canvasSize.width * scale) / 2,
      (container.height - canvasSize.height * scale) / 2,
      scale,
    )
  }, [canvasSize])

  // Navigate from preview click
  const handlePreviewNavigate = useCallback((x: number, y: number) => {
    if (!containerRef.current || !transformRef.current) return
    const container = containerRef.current.getBoundingClientRect()
    const state = transformRef.current.instance.transformState

    const newX = -(x * state.scale) + container.width / 2
    const newY = -(y * state.scale) + container.height / 2

    transformRef.current.setTransform(newX, newY, state.scale)
  }, [])

  // Handle zoom change
  const handleTransform = useCallback(
    (ref: ReactZoomPanPinchRef) => {
      const newZoom = ref.state.scale
      setZoomLevel(newZoom)
      onZoomChange?.(newZoom)
      updateViewportRect()
    },
    [onZoomChange, updateViewportRect],
  )

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ touchAction: toolMode === "pan" ? "auto" : "none" }}
    >
      <TransformWrapper
        ref={transformRef}
        disabled={toolMode !== "pan" && toolMode !== "select" && toolMode !== "editVertices"}
        minScale={0.02}
        maxScale={10}
        limitToBounds={false}
        panning={{ disabled: toolMode !== "pan" && !(toolMode === "editVertices" && !isDraggingVertex) }}
        onTransformed={handleTransform}
        onPanning={updateViewportRect}
        onZoom={updateViewportRect}
        wheel={{ step: 0.1 }}
        pinch={{ step: 5 }}
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
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="touch-none"
          />
        </TransformComponent>
      </TransformWrapper>

      {/* Zoom preview */}
      <ZoomPreview
        canvasWidth={canvasSize.width}
        canvasHeight={canvasSize.height}
        viewportRect={viewportRect}
        baseMapImage={baseMapImage}
        baseMapPosition={project?.baseMapPosition}
        baseMapScale={project?.baseMapScale}
        onNavigate={handlePreviewNavigate}
      />

      {/* Bottom controls */}
      <BottomControls
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleZoomReset}
        onFit={handleZoomFit}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
      />

      {/* Finish button for polygon */}
      {toolMode === "polygon" && drawingVertices.length >= 3 && (
        <div className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2">
          <button
            onClick={finishPolygon}
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg"
          >
            Finish Polygon ({drawingVertices.length} points)
          </button>
        </div>
      )}

      {/* Vertex editing indicator */}
      {toolMode === "editVertices" && (
        <div className="absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
          Editing Vertices - Drag points to move
        </div>
      )}
    </div>
  )
})
