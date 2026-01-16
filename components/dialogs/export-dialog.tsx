"use client"

import { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Download, FileJson, FileSpreadsheet, ImageIcon, Loader2 } from "lucide-react"
import type { Project, MapObject, Sequence } from "@/lib/db"
import { createExportZip } from "@/lib/export-utils"

interface ExportDialogProps {
  open: boolean
  onClose: () => void
  project: Project | undefined
  objects: MapObject[]
  sequences: Sequence[]
}

export function ExportDialog({ open, onClose, project, objects, sequences }: ExportDialogProps) {
  const [includeJson, setIncludeJson] = useState(true)
  const [includeCsv, setIncludeCsv] = useState(true)
  const [includePhotos, setIncludePhotos] = useState(true)
  const [includeSequenceStrips, setIncludeSequenceStrips] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = useCallback(async () => {
    if (!project) return

    setIsExporting(true)
    try {
      const zip = await createExportZip(project, objects, sequences)

      // Download the zip file
      const url = URL.createObjectURL(zip)
      const a = document.createElement("a")
      a.href = url
      a.download = `${project.name.replace(/\s+/g, "_")}_export.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      onClose()
    } catch (error) {
      console.error("Export failed:", error)
      alert("Export failed. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }, [project, objects, sequences, onClose])

  const photoCount = objects.reduce((acc, obj) => acc + obj.metadata.photos.length, 0)

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Project
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Export "{project?.name}" with {objects.length} objects and {sequences.length} sequences.
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox id="json" checked={includeJson} onCheckedChange={(c) => setIncludeJson(!!c)} />
              <Label htmlFor="json" className="flex cursor-pointer items-center gap-2">
                <FileJson className="h-4 w-4 text-muted-foreground" />
                data.json (Full coordinates & metadata)
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox id="csv" checked={includeCsv} onCheckedChange={(c) => setIncludeCsv(!!c)} />
              <Label htmlFor="csv" className="flex cursor-pointer items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                summary.csv (Table format)
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox id="photos" checked={includePhotos} onCheckedChange={(c) => setIncludePhotos(!!c)} />
              <Label htmlFor="photos" className="flex cursor-pointer items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                Photos ({photoCount} images)
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="strips"
                checked={includeSequenceStrips}
                onCheckedChange={(c) => setIncludeSequenceStrips(!!c)}
                disabled={sequences.length === 0}
              />
              <Label
                htmlFor="strips"
                className={`flex cursor-pointer items-center gap-2 ${sequences.length === 0 ? "text-muted-foreground" : ""}`}
              >
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                Sequence strips ({sequences.length} journeys)
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="min-h-[44px] bg-transparent" disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} className="min-h-[44px] gap-2" disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export ZIP
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
