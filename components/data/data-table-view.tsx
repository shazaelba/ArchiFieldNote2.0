"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, ImageIcon } from "lucide-react"
import type { MapObject } from "@/lib/db"
import { getPolygonArea, getLineLength } from "@/lib/canvas-utils"
import { formatMeasurement, type MeasurementUnit } from "@/lib/measurement-utils"

interface DataTableViewProps {
  open: boolean
  onClose: () => void
  objects: MapObject[]
  pixelToMeterRatio: number | null
  measurementUnit: MeasurementUnit
  onSelectObject: (id: string) => void
}

export function DataTableView({
  open,
  onClose,
  objects,
  pixelToMeterRatio,
  measurementUnit,
  onSelectObject,
}: DataTableViewProps) {
  const [search, setSearch] = useState("")

  const filteredObjects = objects.filter(
    (obj) =>
      obj.name.toLowerCase().includes(search.toLowerCase()) ||
      obj.metadata.qualitativeType.toLowerCase().includes(search.toLowerCase()) ||
      obj.metadata.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase())),
  )

  const getMeasurement = (obj: MapObject): string => {
    if (obj.type === "polygon" && obj.vertices.length > 2) {
      const area = getPolygonArea(obj.vertices, pixelToMeterRatio)
      return area > 0 ? formatMeasurement(area, measurementUnit, true) : "N/A"
    } else if (obj.type === "threshold" && obj.vertices.length === 2) {
      const length = getLineLength(obj.vertices[0], obj.vertices[1], pixelToMeterRatio)
      return pixelToMeterRatio ? formatMeasurement(length, measurementUnit, false) : `${length.toFixed(0)} px`
    } else if (obj.type === "freehand") {
      return `${obj.vertices.length} points`
    }
    return "N/A"
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[80vh] sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Data Table</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search objects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="max-h-[50vh] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Name</TableHead>
                <TableHead className="w-[80px]">Type</TableHead>
                <TableHead className="w-[120px]">Measurement</TableHead>
                <TableHead className="w-[100px]">Category</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="w-[100px]">Photo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredObjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No objects found
                  </TableCell>
                </TableRow>
              ) : (
                filteredObjects.map((obj) => (
                  <TableRow
                    key={obj.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      onSelectObject(obj.id)
                      onClose()
                    }}
                  >
                    <TableCell className="font-medium">{obj.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {obj.type === "threshold" ? "line" : obj.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{getMeasurement(obj)}</TableCell>
                    <TableCell>{obj.metadata.qualitativeType || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {obj.metadata.tags.slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {obj.metadata.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{obj.metadata.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {obj.metadata.photos.length > 0 ? (
                        <div className="relative h-12 w-12 overflow-hidden rounded">
                          <img
                            src={obj.metadata.photos[0] || "/placeholder.svg"}
                            alt="Preview"
                            className="h-full w-full object-cover"
                          />
                          {obj.metadata.photos.length > 1 && (
                            <div className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 text-xs text-white">
                              +{obj.metadata.photos.length - 1}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            {filteredObjects.length} of {objects.length} objects
          </span>
          <span>Click a row to select the object</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
