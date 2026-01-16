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
import { Switch } from "@/components/ui/switch"
import { Trash2, Plus, Camera, X, Edit3 } from "lucide-react"
import type { MapObject, ObjectStyle, ObjectMetadata, CustomField } from "@/lib/db"
import { getPolygonArea, getLineLength } from "@/lib/canvas-utils"
import { formatMeasurement, type MeasurementUnit } from "@/lib/measurement-utils"

interface PropertiesDrawerProps {
  open: boolean
  onClose: () => void
  object: MapObject | null
  pixelToMeterRatio: number | null
  measurementUnit: MeasurementUnit
  savedFieldNames: string[]
  onUpdate: (updates: Partial<MapObject>) => void
  onDelete: () => void
  onEditVertices: () => void
  onAddFieldName: (name: string) => void
}

const PRESET_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"]

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
  savedFieldNames,
  onUpdate,
  onDelete,
  onEditVertices,
  onAddFieldName,
}: PropertiesDrawerProps) {
  const [newTag, setNewTag] = useState("")
  const [newFieldName, setNewFieldName] = useState("")
  const [newFieldValue, setNewFieldValue] = useState("")
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

  const addCustomField = useCallback(() => {
    if (newFieldName.trim() && object) {
      const newField: CustomField = {
        id: crypto.randomUUID(),
        name: newFieldName.trim(),
        value: newFieldValue.trim(),
      }
      const currentFields = object.metadata.customFields || []
      updateMetadata({ customFields: [...currentFields, newField] })
      onAddFieldName(newFieldName.trim())
      setNewFieldName("")
      setNewFieldValue("")
    }
  }, [newFieldName, newFieldValue, object, updateMetadata, onAddFieldName])

  const updateCustomField = useCallback(
    (fieldId: string, value: string) => {
      if (object) {
        const currentFields = object.metadata.customFields || []
        const updatedFields = currentFields.map((f) => (f.id === fieldId ? { ...f, value } : f))
        updateMetadata({ customFields: updatedFields })
      }
    },
    [object, updateMetadata],
  )

  const removeCustomField = useCallback(
    (fieldId: string) => {
      if (object) {
        const currentFields = object.metadata.customFields || []
        updateMetadata({ customFields: currentFields.filter((f) => f.id !== fieldId) })
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
      <SheetContent side="right" className="w-[320px] overflow-y-auto bg-card p-4 sm:w-[380px] sm:p-6">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between text-base sm:text-lg">
            <span>
              {object.type === "polygon" ? "Polygon" : object.type === "threshold" ? "Line" : "Freehand"} Properties
            </span>
            <div className="flex gap-1">
              {(object.type === "polygon" || object.type === "threshold") && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 sm:min-h-[44px] sm:min-w-[44px]"
                  onClick={onEditVertices}
                  title="Edit Vertices"
                >
                  <Edit3 className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-destructive hover:bg-destructive/10 sm:min-h-[44px] sm:min-w-[44px]"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="style" className="mt-4 sm:mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="style" className="min-h-[40px] text-xs sm:min-h-[44px] sm:text-sm">
              Style
            </TabsTrigger>
            <TabsTrigger value="data" className="min-h-[40px] text-xs sm:min-h-[44px] sm:text-sm">
              Data
            </TabsTrigger>
            <TabsTrigger value="photos" className="min-h-[40px] text-xs sm:min-h-[44px] sm:text-sm">
              Photos
            </TabsTrigger>
          </TabsList>

          {/* Style Tab */}
          <TabsContent value="style" className="space-y-4 pt-4 sm:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs sm:text-sm">
                Name
              </Label>
              <Input
                id="name"
                value={object.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="min-h-[40px] text-sm sm:min-h-[44px]"
              />
            </div>

            {measurement && pixelToMeterRatio && (
              <div className="rounded-lg bg-muted p-2 sm:p-3">
                <span className="text-xs text-muted-foreground sm:text-sm">
                  {object.type === "polygon" ? "Area" : "Length"}:
                </span>
                <span className="ml-2 font-mono text-base font-semibold text-foreground sm:text-lg">{measurement}</span>
              </div>
            )}

            {/* Point settings for polygons */}
            {object.type === "polygon" && (
              <>
                <div className="flex items-center justify-between">
                  <Label className="text-xs sm:text-sm">Show Points</Label>
                  <Switch
                    checked={object.style.showPoints !== false}
                    onCheckedChange={(checked) => updateStyle({ showPoints: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Point Size: {object.style.pointSize || 5}px</Label>
                  <Slider
                    value={[object.style.pointSize || 5]}
                    onValueChange={([value]) => updateStyle({ pointSize: value })}
                    min={2}
                    max={15}
                    step={1}
                    className="py-2"
                  />
                </div>
              </>
            )}

            {/* Fill Color (Polygons only) */}
            {object.type === "polygon" && (
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Fill Color</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`h-7 w-7 rounded-full border-2 transition-transform sm:h-8 sm:w-8 ${
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
                    className="h-7 w-7 cursor-pointer rounded-full sm:h-8 sm:w-8"
                  />
                </div>
              </div>
            )}

            {/* Fill Opacity (Polygons only) */}
            {object.type === "polygon" && (
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">
                  Fill Opacity: {Math.round(object.style.fillOpacity * 100)}%
                </Label>
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
              <Label className="text-xs sm:text-sm">Stroke Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`h-7 w-7 rounded-full border-2 transition-transform sm:h-8 sm:w-8 ${
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
                  className="h-7 w-7 cursor-pointer rounded-full sm:h-8 sm:w-8"
                />
              </div>
            </div>

            {/* Stroke Width */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Stroke Width: {object.style.strokeWidth}px</Label>
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
              <Label className="text-xs sm:text-sm">Line Style</Label>
              <Select
                value={object.style.strokeStyle}
                onValueChange={(value: "solid" | "dashed" | "dotted") => updateStyle({ strokeStyle: value })}
              >
                <SelectTrigger className="min-h-[40px] sm:min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Line endpoint options */}
            {object.type === "threshold" && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Line Endpoints</Label>
                  <Select
                    value={object.style.lineEndpoints || "none"}
                    onValueChange={(value: "none" | "points" | "arrows") => updateStyle({ lineEndpoints: value })}
                  >
                    <SelectTrigger className="min-h-[40px] sm:min-h-[44px]">
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
                    <Label className="text-xs sm:text-sm">Endpoint Size: {object.style.endpointSize || 8}px</Label>
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
                  <Label className="text-xs sm:text-sm">Hatch Pattern</Label>
                  <Select
                    value={object.style.hatchPattern}
                    onValueChange={(value: "none" | "diagonal" | "dotted" | "crosshatch") =>
                      updateStyle({ hatchPattern: value })
                    }
                  >
                    <SelectTrigger className="min-h-[40px] sm:min-h-[44px]">
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
                      <Label className="text-xs sm:text-sm">Hatch Spacing: {object.style.hatchSpacing || 10}px</Label>
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
                      <Label className="text-xs sm:text-sm">
                        Hatch Line Width: {object.style.hatchLineWidth || 1}px
                      </Label>
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
          <TabsContent value="data" className="space-y-4 pt-4 sm:space-y-6">
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Type Classification</Label>
              <Select
                value={object.metadata.qualitativeType || ""}
                onValueChange={(value) => updateMetadata({ qualitativeType: value })}
              >
                <SelectTrigger className="min-h-[40px] sm:min-h-[44px]">
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

            {/* Custom Fields */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Custom Fields</Label>
              {(object.metadata.customFields || []).map((field) => (
                <div key={field.id} className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <span className="text-xs text-muted-foreground">{field.name}</span>
                    <Input
                      value={field.value}
                      onChange={(e) => updateCustomField(field.id, e.target.value)}
                      className="min-h-[36px] text-sm"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-5 h-8 w-8"
                    onClick={() => removeCustomField(field.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <Select value={newFieldName} onValueChange={setNewFieldName}>
                  <SelectTrigger className="min-h-[40px] flex-1">
                    <SelectValue placeholder="Field name..." />
                  </SelectTrigger>
                  <SelectContent>
                    {savedFieldNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__">+ New field...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newFieldName === "__new__" && (
                <Input
                  placeholder="Enter field name..."
                  value={newFieldName === "__new__" ? "" : newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="min-h-[40px]"
                />
              )}

              {newFieldName && newFieldName !== "__new__" && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Value..."
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    className="min-h-[40px] flex-1"
                  />
                  <Button onClick={addCustomField} size="icon" className="min-h-[40px] min-w-[40px]">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  className="min-h-[40px] sm:min-h-[44px]"
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                />
                <Button
                  onClick={addTag}
                  size="icon"
                  className="min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px]"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {object.metadata.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 py-1 text-xs">
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
              <Label htmlFor="notes" className="text-xs sm:text-sm">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={object.metadata.notes}
                onChange={(e) => updateMetadata({ notes: e.target.value })}
                placeholder="Add observations..."
                className="min-h-[100px] resize-none text-sm sm:min-h-[120px]"
              />
            </div>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos" className="space-y-4 pt-4">
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

            <Button
              onClick={() => photoInputRef.current?.click()}
              className="min-h-[40px] w-full gap-2 sm:min-h-[44px]"
            >
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
              <p className="py-8 text-center text-xs text-muted-foreground sm:text-sm">No photos added yet</p>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
