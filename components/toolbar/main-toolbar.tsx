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
    { mode: "select", icon: <MousePointer2 className="h-5 w-5" />, label: "Select" },
    { mode: "pan", icon: <Hand className="h-5 w-5" />, label: "Pan" },
    { mode: "polygon", icon: <Pentagon className="h-5 w-5" />, label: "Polygon" },
    { mode: "threshold", icon: <Minus className="h-5 w-5" />, label: "Line" },
    { mode: "freehand", icon: <Pencil className="h-5 w-5" />, label: "Freehand" },
    { mode: "calibrate", icon: <Ruler className="h-5 w-5" />, label: "Calibrate" },
  ]

  return (
    <div className="absolute left-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2 rounded-xl bg-background/95 p-2 shadow-lg backdrop-blur-sm">
      {tools.map((tool) => (
        <Button
          key={tool.mode}
          variant={toolMode === tool.mode ? "default" : "ghost"}
          size="icon"
          className="min-h-[44px] min-w-[44px]"
          onClick={() => setToolMode(tool.mode)}
          title={tool.label}
        >
          {tool.icon}
        </Button>
      ))}

      <div className="my-1 h-px bg-border" />

      <Button
        variant="ghost"
        size="icon"
        className="min-h-[44px] min-w-[44px]"
        onClick={onImageUpload}
        title="Upload Base Map"
      >
        <ImageIcon className="h-5 w-5" />
      </Button>

      <Button
        variant={sequenceMode ? "default" : "ghost"}
        size="icon"
        className="min-h-[44px] min-w-[44px]"
        onClick={() => setSequenceMode(!sequenceMode)}
        title="Record Journey"
      >
        <Route className="h-5 w-5" />
      </Button>

      <div className="my-1 h-px bg-border" />

      <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={onExport} title="Export">
        <Download className="h-5 w-5" />
      </Button>
    </div>
  )
}
