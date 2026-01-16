"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Camera, X, Edit3 } from "lucide-react"
import type { MapObject, ObjectStyle, ObjectMetadata } from "@/lib/db"
import { getPolygonArea, getLineLength } from "@/lib/canvas-utils"
import { formatMeasurement, type MeasurementUnit } from "@/lib/measurement-utils"

interface PropertiesDrawerProps {
  open: boolean
  onClose: () => void
  object: MapObject | null
  pixelToMeterRatio: number | null
  measurementUnit: MeasurementUnit
  onUpdate: (updates: Partial<MapObject>) => void
  onDelete: () => void
  onEditVertices: () => void
}

const PRESET_COLORS = [
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#22c55e", // Green
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#84cc16", // Lime
]

const QUALITATIVE_TYPES = [
  "Entrance",
  "Exit",
  "Transition",
  "Barrier",
  "Circulation",
  "Private",
  "Public",
  "Semi-public",
  "Service",
  "Other",
]

export function PropertiesDrawer({
  open,
  onClose,
  object,
  pixelToMeterRatio,
  measurementUnit,
  onUpdate,
  onDelete,
  onEditVertices,
}: PropertiesDrawerProps) {
  const [newTag, setNewTag] = useState("")
  const photoInputRef = useRef<HTMLInputElement>(null)

  const updateStyle = useCallback(
    (updates: Partial<ObjectStyle>) => {
      if (object) {
        onUpdate({ style: { ...object.style, ...updates } })
      }
    },
    [object, onUpdate],
  )

  const updateMetadata = useCallback(
    (updates: Partial<ObjectMetadata>) => {
      if (object) {
        onUpdate({ metadata: { ...object.metadata, ...updates } })
      }
    },
    [object, onUpdate],
  )

  const addTag = useCallback(() => {
    if (newTag.trim() && object) {
      updateMetadata({ tags: [...object.metadata.tags, newTag.trim()] })
      setNewTag("")
    }
  }, [newTag, object, updateMetadata])

  const removeTag = useCallback(
    (tag: string) => {
      if (object) {
        updateMetadata({ tags: object.metadata.tags.filter((t) => t !== tag) })
      }
    },
    [object, updateMetadata],
  )

  const handlePhotoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !object) return

      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        updateMetadata({ photos: [...object.metadata.photos, dataUrl] })
      }
      reader.readAsDataURL(file)
      e.target.value = ""
    },
    [object, updateMetadata],
  )

  const removePhoto = useCallback(
    (index: number) => {
      if (object) {
        const newPhotos = [...object.metadata.photos]
        newPhotos.splice(index, 1)
        updateMetadata({ photos: newPhotos })
      }
    },
    [object, updateMetadata],
  )

  const getMeasurement = (): string | null => {
    if (!object || !pixelToMeterRatio) return null

    if (object.type === "polygon" && object.vertices.length > 2) {
      const areaInMeters = getPolygonArea(object.vertices, pixelToMeterRatio)
      return formatMeasurement(areaInMeters, measurementUnit, true)
    } else if (object.type === "threshold" && object.vertices.length === 2) {
      const lengthInMeters = getLineLength(object.vertices[0], object.vertices[1], pixelToMeterRatio)
      return formatMeasurement(lengthInMeters, measurementUnit, false)
    }
    return null
  }

  const measurement = getMeasurement()

  if (!object) return null

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[360px] overflow-y-auto bg-card sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>
              {object.type === "polygon" ? "Polygon" : object.type === "threshold" ? "Line" : "Freehand"} Properties
            </span>
            <div className="flex gap-1">
              {(object.type === "polygon" || object.type === "threshold") && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-[44px] min-w-[44px]"
                  onClick={onEditVertices}
                  title="Edit Vertices"
                >
                  <Edit3 className="h-5 w-5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px] text-destructive hover:bg-destructive/10"
                onClick={onDelete}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="style" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="style" className="min-h-[44px]">
              Style
            </TabsTrigger>
            <TabsTrigger value="data" className="min-h-[44px]">
              Data
            </TabsTrigger>
            <TabsTrigger value="photos" className="min-h-[44px]">
              Photos
            </TabsTrigger>
          </TabsList>

          {/* Style Tab */}
          <TabsContent value="style" className="space-y-6 pt-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={object.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="min-h-[44px]"
              />
            </div>

            {/* Measurement display */}
            {measurement && pixelToMeterRatio && (
              <div className="rounded-lg bg-muted p-3">
                <span className="text-sm text-muted-foreground">{object.type === "polygon" ? "Area" : "Length"}:</span>
                <span className="ml-2 font-mono text-lg font-semibold text-foreground">{measurement}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Point Size: {object.style.pointSize || 5}px</Label>
              <Slider
                value={[object.style.pointSize || 5]}
                onValueChange={([value]) => updateStyle({ pointSize: value })}
                min={2}
                max={15}
                step={1}
                className="py-2"
              />
            </div>

            {/* Fill Color (Polygons only) */}
            {object.type === "polygon" && (
              <div className="space-y-2">
                <Label>Fill Color</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`h-8 w-8 rounded-full border-2 transition-transform ${
                        object.style.fillColor === color ? "scale-110 border-foreground" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => updateStyle({ fillColor: color })}
                    />
                  ))}
                  <input
                    type="color"
                    value={object.style.fillColor}
                    onChange={(e) => updateStyle({ fillColor: e.target.value })}
                    className="h-8 w-8 cursor-pointer rounded-full"
                  />
                </div>
              </div>
            )}

            {/* Fill Opacity (Polygons only) */}
            {object.type === "polygon" && (
              <div className="space-y-2">
                <Label>Fill Opacity: {Math.round(object.style.fillOpacity * 100)}%</Label>
                <Slider
                  value={[object.style.fillOpacity * 100]}
                  onValueChange={([value]) => updateStyle({ fillOpacity: value / 100 })}
                  min={0}
                  max={100}
                  step={5}
                  className="py-2"
                />
              </div>
            )}

            {/* Stroke Color */}
            <div className="space-y-2">
              <Label>Stroke Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`h-8 w-8 rounded-full border-2 transition-transform ${
                      object.style.strokeColor === color ? "scale-110 border-foreground" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateStyle({ strokeColor: color })}
                  />
                ))}
                <input
                  type="color"
                  value={object.style.strokeColor}
                  onChange={(e) => updateStyle({ strokeColor: e.target.value })}
                  className="h-8 w-8 cursor-pointer rounded-full"
                />
              </div>
            </div>

            {/* Stroke Width */}
            <div className="space-y-2">
              <Label>Stroke Width: {object.style.strokeWidth}px</Label>
              <Slider
                value={[object.style.strokeWidth]}
                onValueChange={([value]) => updateStyle({ strokeWidth: value })}
                min={1}
                max={10}
                step={1}
                className="py-2"
              />
            </div>

            {/* Stroke Style */}
            <div className="space-y-2">
              <Label>Line Style</Label>
              <Select
                value={object.style.strokeStyle}
                onValueChange={(value: "solid" | "dashed" | "dotted") => updateStyle({ strokeStyle: value })}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {object.type === "threshold" && (
              <>
                <div className="space-y-2">
                  <Label>Line Endpoints</Label>
                  <Select
                    value={object.style.lineEndpoints || "points"}
                    onValueChange={(value: "none" | "points" | "arrows") => updateStyle({ lineEndpoints: value })}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="points">Points</SelectItem>
                      <SelectItem value="arrows">Arrows</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {object.style.lineEndpoints !== "none" && (
                  <div className="space-y-2">
                    <Label>Endpoint Size: {object.style.endpointSize || 8}px</Label>
                    <Slider
                      value={[object.style.endpointSize || 8]}
                      onValueChange={([value]) => updateStyle({ endpointSize: value })}
                      min={4}
                      max={20}
                      step={1}
                      className="py-2"
                    />
                  </div>
                )}
              </>
            )}

            {/* Hatch Pattern (Polygons only) */}
            {object.type === "polygon" && (
              <>
                <div className="space-y-2">
                  <Label>Hatch Pattern</Label>
                  <Select
                    value={object.style.hatchPattern}
                    onValueChange={(value: "none" | "diagonal" | "dotted" | "crosshatch") =>
                      updateStyle({ hatchPattern: value })
                    }
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="diagonal">Diagonal Lines</SelectItem>
                      <SelectItem value="dotted">Dotted</SelectItem>
                      <SelectItem value="crosshatch">Crosshatch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {object.style.hatchPattern !== "none" && (
                  <>
                    <div className="space-y-2">
                      <Label>Hatch Spacing: {object.style.hatchSpacing || 10}px</Label>
                      <Slider
                        value={[object.style.hatchSpacing || 10]}
                        onValueChange={([value]) => updateStyle({ hatchSpacing: value })}
                        min={5}
                        max={30}
                        step={1}
                        className="py-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hatch Line Width: {object.style.hatchLineWidth || 1}px</Label>
                      <Slider
                        value={[object.style.hatchLineWidth || 1]}
                        onValueChange={([value]) => updateStyle({ hatchLineWidth: value })}
                        min={0.5}
                        max={5}
                        step={0.5}
                        className="py-2"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data" className="space-y-6 pt-4">
            {/* Qualitative Type */}
            <div className="space-y-2">
              <Label>Type Classification</Label>
              <Select
                value={object.metadata.qualitativeType || ""}
                onValueChange={(value) => updateMetadata({ qualitativeType: value })}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {QUALITATIVE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  className="min-h-[44px]"
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                />
                <Button onClick={addTag} size="icon" className="min-h-[44px] min-w-[44px]">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {object.metadata.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 py-1">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={object.metadata.notes}
                onChange={(e) => updateMetadata({ notes: e.target.value })}
                placeholder="Add observations..."
                className="min-h-[120px] resize-none"
              />
            </div>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos" className="space-y-4 pt-4">
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

            <Button onClick={() => photoInputRef.current?.click()} className="min-h-[44px] w-full gap-2">
              <Camera className="h-4 w-4" />
              Add Photo
            </Button>

            <div className="grid grid-cols-2 gap-2">
              {object.metadata.photos.map((photo, index) => (
                <div key={index} className="group relative aspect-square overflow-hidden rounded-lg">
                  <img
                    src={photo || "/placeholder.svg"}
                    alt={`Photo ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute right-1 top-1 rounded-full bg-destructive p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-4 w-4 text-destructive-foreground" />
                  </button>
                </div>
              ))}
            </div>

            {object.metadata.photos.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No photos added yet</p>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
