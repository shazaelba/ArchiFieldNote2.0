"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { MousePointer2, Hand, Pentagon, Minus, Ruler, ImageIcon, Route, Download, Pencil } from "lucide-react"
import type { ToolMode } from "@/components/canvas/map-canvas"

interface MainToolbarProps {
  toolMode: ToolMode
  setToolMode: (mode: ToolMode) => void
  sequenceMode: boolean
  setSequenceMode: (mode: boolean) => void
  onImageUpload: () => void
  onExport: () => void
}

export function MainToolbar({
  toolMode,
  setToolMode,
  sequenceMode,
  setSequenceMode,
  onImageUpload,
  onExport,
}: MainToolbarProps) {
  const tools: { mode: ToolMode; icon: React.ReactNode; label: string }[] = [
    { mode: "select", icon: <MousePointer2 className="h-4 w-4 sm:h-5 sm:w-5" />, label: "Select" },
    { mode: "pan", icon: <Hand className="h-4 w-4 sm:h-5 sm:w-5" />, label: "Pan" },
    { mode: "polygon", icon: <Pentagon className="h-4 w-4 sm:h-5 sm:w-5" />, label: "Polygon" },
    { mode: "threshold", icon: <Minus className="h-4 w-4 sm:h-5 sm:w-5" />, label: "Line" },
    { mode: "freehand", icon: <Pencil className="h-4 w-4 sm:h-5 sm:w-5" />, label: "Freehand" },
    { mode: "calibrate", icon: <Ruler className="h-4 w-4 sm:h-5 sm:w-5" />, label: "Calibrate" },
  ]

  return (
    <div className="absolute left-2 top-20 z-20 flex flex-col gap-1 rounded-xl bg-background/95 p-1.5 shadow-lg backdrop-blur-sm sm:left-4 sm:top-1/2 sm:-translate-y-1/2 sm:gap-2 sm:p-2 max-sm:bottom-20 max-sm:left-1/2 max-sm:top-auto max-sm:-translate-x-1/2 max-sm:flex-row">
      {tools.map((tool) => (
        <Button
          key={tool.mode}
          variant={toolMode === tool.mode ? "default" : "ghost"}
          size="icon"
          className="h-10 w-10 sm:min-h-[44px] sm:min-w-[44px]"
          onClick={() => setToolMode(tool.mode)}
          title={tool.label}
        >
          {tool.icon}
        </Button>
      ))}

      <div className="mx-0.5 h-px w-full bg-border sm:my-1 sm:h-px sm:w-auto max-sm:h-8 max-sm:w-px" />

      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 sm:min-h-[44px] sm:min-w-[44px]"
        onClick={onImageUpload}
        title="Upload Base Map"
      >
        <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>

      <Button
        variant={sequenceMode ? "default" : "ghost"}
        size="icon"
        className="h-10 w-10 sm:min-h-[44px] sm:min-w-[44px]"
        onClick={() => setSequenceMode(!sequenceMode)}
        title="Record Journey"
      >
        <Route className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>

      <div className="mx-0.5 h-px w-full bg-border sm:my-1 sm:h-px sm:w-auto max-sm:h-8 max-sm:w-px" />

      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 sm:min-h-[44px] sm:min-w-[44px]"
        onClick={onExport}
        title="Export"
      >
        <Download className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
    </div>
  )
}
