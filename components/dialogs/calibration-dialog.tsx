"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface CalibrationDialogProps {
  open: boolean
  onClose: () => void
  pixelDistance: number
  onConfirm: (realWorldMeters: number) => void
}

export function CalibrationDialog({ open, onClose, pixelDistance, onConfirm }: CalibrationDialogProps) {
  const [meters, setMeters] = useState("")

  const handleConfirm = () => {
    const value = Number.parseFloat(meters)
    if (!isNaN(value) && value > 0) {
      onConfirm(value)
      setMeters("")
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Calibrate Scale</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">You drew a line of {Math.round(pixelDistance)} pixels.</p>
          <div className="space-y-2">
            <Label htmlFor="meters">Real-world distance (meters)</Label>
            <Input
              id="meters"
              type="number"
              step="0.01"
              min="0"
              value={meters}
              onChange={(e) => setMeters(e.target.value)}
              placeholder="Enter distance in meters"
              className="min-h-[44px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="min-h-[44px] bg-transparent">
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="min-h-[44px]">
            Set Scale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
