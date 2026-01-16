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

  const allPhotos = sequence
    ? sequence.objectIds.flatMap((id) => objects.find((o) => o.id === id)?.metadata.photos || [])
    : []

  const generatePhotoStrip = useCallback(async (): Promise<string | null> => {
    if (allPhotos.length === 0) return null

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    const photoSize = 150
    const maxPhotos = Math.min(allPhotos.length, 10)
    canvas.width = photoSize * maxPhotos
    canvas.height = photoSize

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
      for (let i = 0; i < maxPhotos; i++) {
        const img = await loadImage(allPhotos[i])
        ctx.drawImage(img, i * photoSize, 0, photoSize, photoSize)
      }
      return canvas.toDataURL("image/jpeg", 0.8)
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

  const sequenceObjects = sequence
    ? sequence.objectIds
        .map((id) => objects.find((o) => o.id === id))
        .filter((obj): obj is MapObject => obj !== undefined)
    : []

  return (
    <>
      <Card className="absolute bottom-20 right-4 z-20 w-80 bg-card/95 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
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
        <CardContent>
          {sequenceObjects.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Tap objects to add to sequence</p>
          ) : (
            <>
              <div className="space-y-2">
                {sequenceObjects.map((obj, index) => (
                  <div key={`${obj.id}-${index}`} className="flex items-center gap-2">
                    <Badge variant="outline" className="h-6 w-6 justify-center rounded-full p-0 text-xs">
                      {index + 1}
                    </Badge>
                    <button
                      onClick={() => onObjectClick(obj.id)}
                      className="flex flex-1 items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-muted"
                    >
                      <span>{obj.name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>

              {allPhotos.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Journey Photos</p>
                  <div className="flex gap-1 overflow-x-auto pb-2">
                    {allPhotos.slice(0, 6).map((photo, idx) => (
                      <div key={idx} className="h-12 w-12 flex-shrink-0 overflow-hidden rounded">
                        <img
                          src={photo || "/placeholder.svg"}
                          alt={`Photo ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                    {allPhotos.length > 6 && (
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                        +{allPhotos.length - 6}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          <p className="mt-3 text-xs text-muted-foreground">{sequenceObjects.length} objects in journey</p>
        </CardContent>
      </Card>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Dataset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dataset-name">Dataset Name</Label>
              <Input
                id="dataset-name"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="e.g., Morning Circulation Route"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataset-desc">Description</Label>
              <Textarea
                id="dataset-desc"
                value={datasetDescription}
                onChange={(e) => setDatasetDescription(e.target.value)}
                placeholder="Add notes about this journey..."
                rows={3}
              />
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">
                {sequenceObjects.length} objects • {allPhotos.length} photos
              </p>
              {allPhotos.length > 0 && (
                <div className="mt-2 flex gap-1">
                  {allPhotos.slice(0, 5).map((photo, idx) => (
                    <div key={idx} className="h-10 w-10 overflow-hidden rounded">
                      <img src={photo || "/placeholder.svg"} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                  {allPhotos.length > 5 && (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-xs">
                      +{allPhotos.length - 5}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!datasetName.trim()}>
              Save Dataset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
