"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DisplaySettings, GridStyle } from "@/components/canvas/map-canvas"
import type { MeasurementUnit } from "@/lib/measurement-utils"

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  displaySettings: DisplaySettings
  onDisplaySettingsChange: (settings: DisplaySettings) => void
  gridStyle: GridStyle
  gridSize: number
  onGridStyleChange: (style: GridStyle) => void
  onGridSizeChange: (size: number) => void
  measurementUnit: MeasurementUnit
  onMeasurementUnitChange: (unit: MeasurementUnit) => void
}

export function SettingsDialog({
  open,
  onClose,
  displaySettings,
  onDisplaySettingsChange,
  gridStyle,
  gridSize,
  onGridStyleChange,
  onGridSizeChange,
  measurementUnit,
  onMeasurementUnitChange,
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Display Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Measurement Unit</Label>
            <Select value={measurementUnit} onValueChange={(v) => onMeasurementUnitChange(v as MeasurementUnit)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="m">Meters (m)</SelectItem>
                <SelectItem value="cm">Centimeters (cm)</SelectItem>
                <SelectItem value="mm">Millimeters (mm)</SelectItem>
                <SelectItem value="ft">Feet (ft)</SelectItem>
                <SelectItem value="in">Inches (in)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Grid Style</Label>
            <Select value={gridStyle} onValueChange={(v) => onGridStyleChange(v as GridStyle)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lines">Lines</SelectItem>
                <SelectItem value="dots">Dots</SelectItem>
                <SelectItem value="smallSquares">Small Squares</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Grid Size</Label>
              <span className="font-mono text-sm text-muted-foreground">{gridSize}px</span>
            </div>
            <Slider
              value={[gridSize]}
              onValueChange={([value]) => onGridSizeChange(value)}
              min={20}
              max={100}
              step={10}
              className="py-2"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Freehand Stroke Width</Label>
              <span className="font-mono text-sm text-muted-foreground">{displaySettings.freehandStrokeWidth}px</span>
            </div>
            <Slider
              value={[displaySettings.freehandStrokeWidth]}
              onValueChange={([value]) => onDisplaySettingsChange({ ...displaySettings, freehandStrokeWidth: value })}
              min={1}
              max={20}
              step={1}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground">Thickness of freehand drawing strokes</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Freehand Smoothing</Label>
              <span className="font-mono text-sm text-muted-foreground">{displaySettings.freehandSmoothing}px</span>
            </div>
            <Slider
              value={[displaySettings.freehandSmoothing]}
              onValueChange={([value]) => onDisplaySettingsChange({ ...displaySettings, freehandSmoothing: value })}
              min={1}
              max={15}
              step={1}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground">Higher values create smoother lines but less detail</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
