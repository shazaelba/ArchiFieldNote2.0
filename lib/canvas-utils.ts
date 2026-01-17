// Utility functions for canvas operations
import type { MapObject } from "@/lib/db"

export function hitTestObject(point: { x: number; y: number }, obj: MapObject, threshold = 15): boolean {
  if (obj.type === "polygon") {
    return isPointInPolygon(point, obj.vertices)
  } else if (obj.type === "threshold" && obj.vertices.length === 2) {
    return isPointNearLine(point, obj.vertices[0], obj.vertices[1], threshold)
  } else if (obj.type === "freehand" && obj.vertices.length > 1) {
    return isPointNearPath(point, obj.vertices, threshold)
  } else if (obj.type === "circle" && obj.vertices.length === 2) {
    const radius = getDistance(obj.vertices[0], obj.vertices[1])
    return getDistance(point, obj.vertices[0]) <= radius
  } else if (obj.type === "square" && obj.vertices.length === 2) {
    const minX = Math.min(obj.vertices[0].x, obj.vertices[1].x)
    const maxX = Math.max(obj.vertices[0].x, obj.vertices[1].x)
    const minY = Math.min(obj.vertices[0].y, obj.vertices[1].y)
    const maxY = Math.max(obj.vertices[0].y, obj.vertices[1].y)
    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
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
    const t1 = { x: minX + w / 2, y: minY }
    const t2 = { x: maxX, y: maxY }
    const t3 = { x: minX, y: maxY }
    return isPointInPolygon(point, [t1, t2, t3])
  }
  return false
}

export function getDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
}

export function isPointInPolygon(point: { x: number; y: number }, vertices: { x: number; y: number }[]): boolean {
  let inside = false
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x,
      yi = vertices[i].y
    const xj = vertices[j].x,
      yj = vertices[j].y

    if (yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export function isPointNearLine(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number },
  threshold = 10,
): boolean {
  const A = point.x - lineStart.x
  const B = point.y - lineStart.y
  const C = lineEnd.x - lineStart.x
  const D = lineEnd.y - lineStart.y

  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1

  if (lenSq !== 0) param = dot / lenSq

  let xx, yy

  if (param < 0) {
    xx = lineStart.x
    yy = lineStart.y
  } else if (param > 1) {
    xx = lineEnd.x
    yy = lineEnd.y
  } else {
    xx = lineStart.x + param * C
    yy = lineStart.y + param * D
  }

  const dx = point.x - xx
  const dy = point.y - yy
  return Math.sqrt(dx * dx + dy * dy) < threshold
}

export function getPolygonArea(vertices: { x: number; y: number }[], pixelToMeterRatio: number | null): number {
  if (vertices.length < 3 || !pixelToMeterRatio) return 0

  let area = 0
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length
    area += vertices[i].x * vertices[j].y
    area -= vertices[j].x * vertices[i].y
  }
  area = Math.abs(area) / 2

  // Convert from pixels² to meters²
  return area / (pixelToMeterRatio * pixelToMeterRatio)
}

export function getLineLength(
  start: { x: number; y: number },
  end: { x: number; y: number },
  pixelToMeterRatio: number | null,
): number {
  const pixelDistance = getDistance(start, end)
  if (!pixelToMeterRatio) return pixelDistance
  return pixelDistance / pixelToMeterRatio
}

export function drawHatchPattern(
  ctx: CanvasRenderingContext2D,
  vertices: { x: number; y: number }[],
  pattern: "diagonal" | "dotted" | "crosshatch",
  color: string,
  spacing = 10,
  lineWidth = 1,
) {
  ctx.save()

  // Create clipping path
  ctx.beginPath()
  ctx.moveTo(vertices[0].x, vertices[0].y)
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x, vertices[i].y)
  }
  ctx.closePath()
  ctx.clip()

  // Get bounding box
  const minX = Math.min(...vertices.map((v) => v.x))
  const maxX = Math.max(...vertices.map((v) => v.x))
  const minY = Math.min(...vertices.map((v) => v.y))
  const maxY = Math.max(...vertices.map((v) => v.y))

  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth

  if (pattern === "diagonal" || pattern === "crosshatch") {
    // Diagonal lines
    for (let i = minX - (maxY - minY); i < maxX + (maxY - minY); i += spacing) {
      ctx.beginPath()
      ctx.moveTo(i, minY)
      ctx.lineTo(i + (maxY - minY), maxY)
      ctx.stroke()
    }
  }

  if (pattern === "crosshatch") {
    // Cross diagonal lines
    for (let i = minX - (maxY - minY); i < maxX + (maxY - minY); i += spacing) {
      ctx.beginPath()
      ctx.moveTo(i + (maxY - minY), minY)
      ctx.lineTo(i, maxY)
      ctx.stroke()
    }
  }

  if (pattern === "dotted") {
    ctx.fillStyle = color
    for (let x = minX; x < maxX; x += spacing) {
      for (let y = minY; y < maxY; y += spacing) {
        ctx.beginPath()
        ctx.arc(x, y, lineWidth + 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  ctx.restore()
}

export function isPointNearPath(
  point: { x: number; y: number },
  path: { x: number; y: number }[],
  threshold = 10,
): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    if (isPointNearLine(point, path[i], path[i + 1], threshold)) {
      return true
    }
  }
  return false
}

export function getPolylineLength(
  vertices: { x: number; y: number }[],
  pixelToMeterRatio: number | null,
): number {
  if (vertices.length < 2) return 0
  let totalDist = 0
  for (let i = 0; i < vertices.length - 1; i++) {
    totalDist += getDistance(vertices[i], vertices[i + 1])
  }
  if (!pixelToMeterRatio) return totalDist
  return totalDist / pixelToMeterRatio
}
