"use client"

import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Maximize, RotateCcw, Undo2, Redo2 } from "lucide-react"

interface BottomControlsProps {
  zoomLevel: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  onFit: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export function BottomControls({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onReset,
  onFit,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: BottomControlsProps) {
  return (
    <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-card/95 p-1.5 shadow-lg backdrop-blur-sm">
      {/* Undo/Redo group */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px]"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
        >
          <Undo2 className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px]"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
        >
          <Redo2 className="h-5 w-5" />
        </Button>
      </div>

      <div className="mx-1 h-8 w-px bg-border" />

      {/* Zoom group */}
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={onZoomOut} title="Zoom Out">
          <ZoomOut className="h-5 w-5" />
        </Button>

        <div className="flex min-w-[60px] items-center justify-center px-2 font-mono text-sm text-muted-foreground">
          {Math.round(zoomLevel * 100)}%
        </div>

        <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={onZoomIn} title="Zoom In">
          <ZoomIn className="h-5 w-5" />
        </Button>
      </div>

      <div className="mx-1 h-8 w-px bg-border" />

      {/* View group */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px]"
          onClick={onReset}
          title="Reset (100%)"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={onFit} title="Fit to View">
          <Maximize className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
