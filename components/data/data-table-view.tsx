"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, ImageIcon } from "lucide-react"
import type { MapObject } from "@/lib/db"
import { getPolygonArea, getLineLength, getPolylineLength } from "@/lib/canvas-utils"
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

  // Collect all unique custom field names
  const allCustomFieldNames = useMemo(() => {
    const names = new Set<string>()
    objects.forEach((obj) => {
      ; (obj.metadata.customFields || []).forEach((field) => {
        names.add(field.name)
      })
    })
    return Array.from(names)
  }, [objects])

  const getMeasurement = (obj: MapObject): string => {
    if (obj.type === "polygon" && obj.vertices.length > 2) {
      const area = getPolygonArea(obj.vertices, pixelToMeterRatio)
      return area > 0 ? formatMeasurement(area, measurementUnit, true) : "N/A"
    } else if (obj.type === "threshold" && obj.vertices.length === 2) {
      const length = getLineLength(obj.vertices[0], obj.vertices[1], pixelToMeterRatio)
      return pixelToMeterRatio ? formatMeasurement(length, measurementUnit, false) : "N/A"
    } else if (obj.type === "freehand") {
      const length = getPolylineLength(obj.vertices, pixelToMeterRatio)
      return pixelToMeterRatio ? formatMeasurement(length, measurementUnit, false) : "N/A"
    }
    return "N/A"
  }

  const getCustomFieldValue = (obj: MapObject, fieldName: string): string => {
    const field = (obj.metadata.customFields || []).find((f) => f.name === fieldName)
    return field?.value || "-"
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-[95vw] sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Data Table</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search objects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-[40px] pl-9 sm:min-h-[44px]"
          />
        </div>

        <div className="max-h-[50vh] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] text-xs sm:w-[80px] sm:text-sm">Photo</TableHead>
                <TableHead className="w-[100px] text-xs sm:w-[150px] sm:text-sm">Name</TableHead>
                <TableHead className="w-[60px] text-xs sm:w-[80px] sm:text-sm">Type</TableHead>
                <TableHead className="w-[100px] text-xs sm:w-[120px] sm:text-sm">Measurement</TableHead>
                <TableHead className="w-[80px] text-xs sm:w-[100px] sm:text-sm">Category</TableHead>
                {allCustomFieldNames.map((fieldName) => (
                  <TableHead key={fieldName} className="w-[100px] text-xs sm:text-sm">
                    {fieldName}
                  </TableHead>
                ))}
                <TableHead className="text-xs sm:text-sm">Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredObjects.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6 + allCustomFieldNames.length}
                    className="h-24 text-center text-xs text-muted-foreground sm:text-sm"
                  >
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
                    <TableCell>
                      {obj.metadata.photos.length > 0 ? (
                        <div className="relative h-10 w-10 overflow-hidden rounded sm:h-12 sm:w-12">
                          <img
                            src={obj.metadata.photos[0] || "/placeholder.svg"}
                            alt="Preview"
                            className="h-full w-full object-cover"
                          />
                          {obj.metadata.photos.length > 1 && (
                            <div className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 text-[10px] text-white">
                              +{obj.metadata.photos.length - 1}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted sm:h-12 sm:w-12">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium sm:text-sm">{obj.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize sm:text-xs">
                        {obj.type === "threshold" ? "line" : obj.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs sm:text-sm">{getMeasurement(obj)}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{obj.metadata.qualitativeType || "-"}</TableCell>
                    {allCustomFieldNames.map((fieldName) => (
                      <TableCell key={fieldName} className="text-xs sm:text-sm">
                        {getCustomFieldValue(obj, fieldName)}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {obj.metadata.tags.slice(0, 2).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] sm:text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {obj.metadata.tags.length > 2 && (
                          <Badge variant="secondary" className="text-[10px] sm:text-xs">
                            +{obj.metadata.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground sm:text-sm">
          <span>
            {filteredObjects.length} of {objects.length} objects
          </span>
          <span>Click a row to select</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
