"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Route, Calendar, ImageIcon } from "lucide-react"
import { getSavedDatasets, type SavedDataset, type MapObject } from "@/lib/db"

interface SavedDatasetsDialogProps {
  open: boolean
  onClose: () => void
  projectId: string | null
  objects: MapObject[]
}

export function SavedDatasetsDialog({ open, onClose, projectId, objects }: SavedDatasetsDialogProps) {
  const [datasets, setDatasets] = useState<SavedDataset[]>([])

  useEffect(() => {
    if (open && projectId) {
      getSavedDatasets(projectId).then(setDatasets)
    }
  }, [open, projectId])

  const getObjectsForDataset = (dataset: SavedDataset) => {
    return dataset.objectIds
      .map((id) => objects.find((o) => o.id === id))
      .filter((obj): obj is MapObject => obj !== undefined)
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] w-[95vw] max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Route className="h-5 w-5 text-primary" />
            Saved Journeys
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {datasets.length === 0 ? (
            <div className="py-12 text-center">
              <Route className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">No saved journeys yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Record a journey and save it to see it here</p>
            </div>
          ) : (
            <div className="space-y-4 pr-4">
              {datasets.map((dataset) => {
                const datasetObjects = getObjectsForDataset(dataset)
                const allPhotos = datasetObjects.flatMap((obj) => obj.metadata.photos || [])

                return (
                  <Card key={dataset.id}>
                    <CardHeader className="p-3 pb-2 sm:p-4 sm:pb-2">
                      <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                        <span>{dataset.name}</span>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground sm:text-xs">
                          <Calendar className="h-3 w-3" />
                          {new Date(dataset.createdAt).toLocaleDateString()}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                      {dataset.description && (
                        <p className="mb-3 text-xs text-muted-foreground sm:text-sm">{dataset.description}</p>
                      )}

                      {/* Photo strip preview */}
                      {dataset.photoStripImage && (
                        <div className="mb-3 overflow-hidden rounded-lg border">
                          <img
                            src={dataset.photoStripImage || "/placeholder.svg"}
                            alt="Journey photos"
                            className="w-full object-contain"
                          />
                        </div>
                      )}

                      {/* Objects in journey */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">
                          Objects in journey ({datasetObjects.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {datasetObjects.slice(0, 6).map((obj, idx) => (
                            <div key={obj.id} className="flex items-center gap-1">
                              <Badge variant="outline" className="h-5 w-5 justify-center rounded-full p-0 text-[10px]">
                                {idx + 1}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground sm:text-xs">{obj.name}</span>
                              {obj.metadata.photos.length > 0 && (
                                <div className="ml-1 flex h-6 w-6 items-center justify-center overflow-hidden rounded">
                                  <img
                                    src={obj.metadata.photos[0] || "/placeholder.svg"}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                          {datasetObjects.length > 6 && (
                            <Badge variant="secondary" className="text-[10px]">
                              +{datasetObjects.length - 6} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground sm:text-xs">
                        <span>{datasetObjects.length} objects</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          {allPhotos.length} photos
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
