"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { X, Route, ChevronRight, Save } from "lucide-react"
import type { Sequence, MapObject } from "@/lib/db"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

interface SequencePanelProps {
  sequence: Sequence | null
  objects: MapObject[]
  onClose: () => void
  onObjectClick: (id: string) => void
  onSaveDataset: (name: string, description: string, objectIds: string[], photoStripImage: string | null) => void
}

export function SequencePanel({ sequence, objects, onClose, onObjectClick, onSaveDataset }: SequencePanelProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [datasetName, setDatasetName] = useState("")
  const [datasetDescription, setDatasetDescription] = useState("")

  const sequenceObjects = sequence
    ? sequence.objectIds
        .map((id) => objects.find((o) => o.id === id))
        .filter((obj): obj is MapObject => obj !== undefined)
    : []

  const allPhotos = sequenceObjects.flatMap((obj) => obj.metadata.photos || [])

  // Generate photo strip without distortion - side by side with natural aspect ratios
  const generatePhotoStrip = useCallback(async (): Promise<string | null> => {
    if (allPhotos.length === 0) return null

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    const maxHeight = 200
    const maxPhotos = Math.min(allPhotos.length, 10)
    const gap = 4

    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
      })
    }

    try {
      // Load all images first to calculate total width
      const images: HTMLImageElement[] = []
      for (let i = 0; i < maxPhotos; i++) {
        const img = await loadImage(allPhotos[i])
        images.push(img)
      }

      // Calculate total width based on natural aspect ratios
      let totalWidth = 0
      const scaledWidths: number[] = []
      for (const img of images) {
        const scale = maxHeight / img.height
        const scaledWidth = img.width * scale
        scaledWidths.push(scaledWidth)
        totalWidth += scaledWidth
      }
      totalWidth += gap * (images.length - 1)

      canvas.width = totalWidth
      canvas.height = maxHeight

      // Draw images side by side without distortion
      let x = 0
      for (let i = 0; i < images.length; i++) {
        ctx.drawImage(images[i], x, 0, scaledWidths[i], maxHeight)
        x += scaledWidths[i] + gap
      }

      return canvas.toDataURL("image/jpeg", 0.85)
    } catch {
      return null
    }
  }, [allPhotos])

  const handleSave = useCallback(async () => {
    if (!datasetName.trim()) return

    const photoStrip = await generatePhotoStrip()
    onSaveDataset(datasetName, datasetDescription, sequence?.objectIds || [], photoStrip)
    setSaveDialogOpen(false)
    setDatasetName("")
    setDatasetDescription("")
  }, [datasetName, datasetDescription, sequence, generatePhotoStrip, onSaveDataset])

  return (
    <>
      <Card className="absolute bottom-16 right-2 z-20 w-72 bg-card/95 backdrop-blur-sm sm:bottom-20 sm:right-4 sm:w-80">
        <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 sm:p-4 sm:pb-2">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Route className="h-4 w-4 text-primary" />
            {sequence?.name}
          </CardTitle>
          <div className="flex gap-1">
            {sequenceObjects.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSaveDialogOpen(true)}
                title="Save as Dataset"
              >
                <Save className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
          {sequenceObjects.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground sm:text-sm">Tap objects to add to sequence</p>
          ) : (
            <>
              <div className="max-h-40 space-y-1.5 overflow-y-auto sm:max-h-48 sm:space-y-2">
                {sequenceObjects.map((obj, index) => (
                  <div key={`${obj.id}-${index}`} className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="h-5 w-5 justify-center rounded-full p-0 text-[10px] sm:h-6 sm:w-6 sm:text-xs"
                    >
                      {index + 1}
                    </Badge>
                    <button
                      onClick={() => onObjectClick(obj.id)}
                      className="flex flex-1 items-center justify-between rounded-md px-2 py-1 text-xs hover:bg-muted sm:text-sm"
                    >
                      <span className="truncate">{obj.name}</span>
                      <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground sm:h-4 sm:w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {allPhotos.length > 0 && (
                <div className="mt-3 border-t pt-3 sm:mt-4 sm:pt-4">
                  <p className="mb-2 text-[10px] font-medium text-muted-foreground sm:text-xs">Journey Photos</p>
                  <div className="flex gap-1 overflow-x-auto pb-2">
                    {allPhotos.slice(0, 6).map((photo, idx) => (
                      <div key={idx} className="h-10 w-10 flex-shrink-0 overflow-hidden rounded sm:h-12 sm:w-12">
                        <img
                          src={photo || "/placeholder.svg"}
                          alt={`Photo ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                    {allPhotos.length > 6 && (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground sm:h-12 sm:w-12 sm:text-xs">
                        +{allPhotos.length - 6}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground sm:mt-3 sm:text-xs">
            {sequenceObjects.length} objects in journey
          </p>
        </CardContent>
      </Card>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="w-[90vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Save as Dataset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dataset-name" className="text-xs sm:text-sm">
                Dataset Name
              </Label>
              <Input
                id="dataset-name"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="e.g., Morning Circulation Route"
                className="min-h-[40px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataset-desc" className="text-xs sm:text-sm">
                Description
              </Label>
              <Textarea
                id="dataset-desc"
                value={datasetDescription}
                onChange={(e) => setDatasetDescription(e.target.value)}
                placeholder="Add notes about this journey..."
                rows={3}
              />
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground sm:text-sm">
                {sequenceObjects.length} objects • {allPhotos.length} photos
              </p>
              {allPhotos.length > 0 && (
                <div className="mt-2 flex gap-1 overflow-x-auto">
                  {allPhotos.slice(0, 5).map((photo, idx) => (
                    <div key={idx} className="h-10 w-10 flex-shrink-0 overflow-hidden rounded">
                      <img src={photo || "/placeholder.svg"} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                  {allPhotos.length > 5 && (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-muted text-xs">
                      +{allPhotos.length - 5}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)} className="min-h-[40px]">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!datasetName.trim()} className="min-h-[40px]">
              Save Dataset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
