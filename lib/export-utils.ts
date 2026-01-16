import type { Project, MapObject, Sequence } from "@/lib/db"
import { getPolygonArea, getLineLength } from "@/lib/canvas-utils"
import JSZip from "jszip"

interface ExportData {
  project: {
    id: string
    name: string
    pixelToMeterRatio: number | null
    createdAt: string
    exportedAt: string
  }
  objects: Array<{
    id: string
    type: string
    name: string
    vertices: { x: number; y: number }[]
    measurement: string | null
    style: MapObject["style"]
    metadata: MapObject["metadata"]
  }>
  sequences: Array<{
    id: string
    name: string
    objectIds: string[]
    objects: string[] // Object names in order
  }>
}

export function generateExportData(project: Project, objects: MapObject[], sequences: Sequence[]): ExportData {
  return {
    project: {
      id: project.id,
      name: project.name,
      pixelToMeterRatio: project.pixelToMeterRatio,
      createdAt: new Date(project.createdAt).toISOString(),
      exportedAt: new Date().toISOString(),
    },
    objects: objects.map((obj) => ({
      id: obj.id,
      type: obj.type,
      name: obj.name,
      vertices: obj.vertices,
      measurement:
        obj.type === "polygon"
          ? `${getPolygonArea(obj.vertices, project.pixelToMeterRatio).toFixed(2)} m²`
          : `${getLineLength(obj.vertices[0], obj.vertices[1], project.pixelToMeterRatio).toFixed(2)} m`,
      style: obj.style,
      metadata: obj.metadata,
    })),
    sequences: sequences.map((seq) => ({
      id: seq.id,
      name: seq.name,
      objectIds: seq.objectIds,
      objects: seq.objectIds.map((id) => objects.find((o) => o.id === id)?.name || "Unknown").filter(Boolean),
    })),
  }
}

export function generateCSV(objects: MapObject[], pixelToMeterRatio: number | null): string {
  const headers = ["ID", "Type", "Name", "Measurement", "Qualitative Type", "Tags", "Notes"]
  const rows = objects.map((obj) => {
    const measurement =
      obj.type === "polygon"
        ? `${getPolygonArea(obj.vertices, pixelToMeterRatio).toFixed(2)} m²`
        : `${getLineLength(obj.vertices[0], obj.vertices[1], pixelToMeterRatio).toFixed(2)} m`

    return [
      obj.id,
      obj.type,
      `"${obj.name}"`,
      measurement,
      obj.metadata.qualitativeType || "",
      `"${obj.metadata.tags.join(", ")}"`,
      `"${obj.metadata.notes.replace(/"/g, '""')}"`,
    ].join(",")
  })

  return [headers.join(","), ...rows].join("\n")
}

export async function generateSequenceStrip(sequence: Sequence, objects: MapObject[]): Promise<string | null> {
  const sequenceObjects = sequence.objectIds
    .map((id) => objects.find((o) => o.id === id))
    .filter((obj): obj is MapObject => obj !== undefined)

  // Collect all photos from sequence objects
  const photos: string[] = []
  for (const obj of sequenceObjects) {
    photos.push(...obj.metadata.photos)
  }

  if (photos.length === 0) return null

  // Create horizontal strip canvas
  const photoSize = 200
  const padding = 10
  const canvas = document.createElement("canvas")
  canvas.width = photos.length * (photoSize + padding) - padding
  canvas.height = photoSize

  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  // Draw white background
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Load and draw each photo
  for (let i = 0; i < photos.length; i++) {
    const img = new Image()
    img.crossOrigin = "anonymous"
    await new Promise<void>((resolve) => {
      img.onload = () => {
        const x = i * (photoSize + padding)
        ctx.drawImage(img, x, 0, photoSize, photoSize)
        resolve()
      }
      img.onerror = () => resolve()
      img.src = photos[i]
    })
  }

  return canvas.toDataURL("image/png")
}

export async function createExportZip(project: Project, objects: MapObject[], sequences: Sequence[]): Promise<Blob> {
  const zip = new JSZip()

  // Add data.json
  const exportData = generateExportData(project, objects, sequences)
  zip.file("data.json", JSON.stringify(exportData, null, 2))

  // Add summary.csv
  const csvContent = generateCSV(objects, project.pixelToMeterRatio)
  zip.file("summary.csv", csvContent)

  // Add sequence strips
  for (const sequence of sequences) {
    const strip = await generateSequenceStrip(sequence, objects)
    if (strip) {
      const base64Data = strip.split(",")[1]
      zip.file(`sequence_${sequence.name.replace(/\s+/g, "_")}.png`, base64Data, { base64: true })
    }
  }

  // Add object photos
  const photosFolder = zip.folder("photos")
  if (photosFolder) {
    for (const obj of objects) {
      for (let i = 0; i < obj.metadata.photos.length; i++) {
        const photo = obj.metadata.photos[i]
        const base64Data = photo.split(",")[1]
        const extension = photo.includes("image/png") ? "png" : "jpg"
        photosFolder.file(`${obj.name.replace(/\s+/g, "_")}_${i + 1}.${extension}`, base64Data, {
          base64: true,
        })
      }
    }
  }

  return zip.generateAsync({ type: "blob" })
}
