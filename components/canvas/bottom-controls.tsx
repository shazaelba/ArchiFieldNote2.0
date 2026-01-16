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
    <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-border bg-card/95 p-1 shadow-lg backdrop-blur-sm sm:bottom-4 sm:gap-1 sm:p-1.5">
      {/* Undo/Redo group */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 sm:min-h-[44px] sm:min-w-[44px]"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
        >
          <Undo2 className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 sm:min-h-[44px] sm:min-w-[44px]"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
        >
          <Redo2 className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>

      <div className="mx-0.5 h-6 w-px bg-border sm:mx-1 sm:h-8" />

      {/* Zoom group */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 sm:min-h-[44px] sm:min-w-[44px]"
          onClick={onZoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        <div className="flex min-w-[45px] items-center justify-center px-1 font-mono text-xs text-muted-foreground sm:min-w-[60px] sm:px-2 sm:text-sm">
          {Math.round(zoomLevel * 100)}%
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 sm:min-h-[44px] sm:min-w-[44px]"
          onClick={onZoomIn}
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>

      <div className="mx-0.5 h-6 w-px bg-border sm:mx-1 sm:h-8" />

      {/* View group */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 sm:min-h-[44px] sm:min-w-[44px]"
          onClick={onReset}
          title="Reset (100%)"
        >
          <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 sm:min-h-[44px] sm:min-w-[44px]"
          onClick={onFit}
          title="Fit to View"
        >
          <Maximize className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  )
}
