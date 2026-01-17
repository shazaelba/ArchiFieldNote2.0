"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Hand,
  Pentagon,
  Minus,
  Ruler,
  Route,
  Pencil,
  Eraser,
  Highlighter,
  Shapes,
  Copy,
  Circle,
  Square,
  Triangle,
  Navigation,
  FolderOpen,
  MousePointer2
} from "lucide-react"
import type { ToolMode } from "@/components/canvas/map-canvas"

interface MainToolbarProps {
  toolMode: ToolMode
  setToolMode: (mode: ToolMode) => void
  sequenceMode: boolean
  setSequenceMode: (mode: boolean) => void
  onOpenSavedDatasets: () => void
}

export function MainToolbar({
  toolMode,
  setToolMode,
  sequenceMode,
  setSequenceMode,
  onOpenSavedDatasets,
}: MainToolbarProps) {
  const tools: { mode: ToolMode; icon: React.ReactNode; label: string }[] = [
    { mode: "select", icon: <MousePointer2 className="h-4 w-4 sm:h-5 sm:w-5" />, label: "Select" },
    { mode: "pan", icon: <Hand className="h-4 w-4 sm:h-5 sm:w-5" />, label: "Pan" },
    { mode: "match", icon: <Copy className="h-4 w-4 sm:h-5 sm:w-5" />, label: "Match Style" },
    { mode: "highlighter", icon: <Highlighter className="h-4 w-4 sm:h-5 sm:w-5" />, label: "Highlighter" },
    { mode: "eraser", icon: <Eraser className="h-4 w-4 sm:h-5 sm:w-5" />, label: "Eraser" },
    { mode: "calibrate", icon: <Ruler className="h-4 w-4 sm:h-5 sm:w-5" />, label: "Calibrate" },
  ]

  const shapeTools: { mode: ToolMode; icon: React.ReactNode; label: string }[] = [
    { mode: "polygon", icon: <Pentagon className="h-4 w-4 mr-2" />, label: "Polygon" },
    { mode: "circle", icon: <Circle className="h-4 w-4 mr-2" />, label: "Circle" },
    { mode: "square", icon: <Square className="h-4 w-4 mr-2" />, label: "Square" },
    { mode: "triangle", icon: <Triangle className="h-4 w-4 mr-2" />, label: "Triangle" },
  ]

  const lineTools: { mode: ToolMode; icon: React.ReactNode; label: string }[] = [
    { mode: "threshold", icon: <Minus className="h-4 w-4 mr-2" />, label: "Line" },
    { mode: "freehand", icon: <Pencil className="h-4 w-4 mr-2" />, label: "Freehand" },
  ]

  const currentShapeTool = shapeTools.find(t => t.mode === toolMode)
  const currentLineTool = lineTools.find(t => t.mode === toolMode)

  return (
    <div className="absolute left-2 top-20 z-20 flex flex-col gap-1 rounded-xl bg-background/95 p-1.5 shadow-lg backdrop-blur-sm sm:left-4 sm:top-1/2 sm:-translate-y-1/2 sm:gap-2 sm:p-2 max-sm:bottom-20 max-sm:left-1/2 max-sm:top-auto max-sm:-translate-x-1/2 max-sm:flex-row max-sm:flex-wrap max-sm:justify-center max-sm:max-w-[95vw]">
      {/* Top tools: Select and Pan */}
      {tools.slice(0, 2).map((tool) => (
        <Button
          key={tool.mode}
          variant={toolMode === tool.mode ? "default" : "ghost"}
          size="icon"
          className={`h-10 w-10 sm:min-h-[44px] sm:min-w-[44px] transition-all ${toolMode === tool.mode
            ? "bg-primary text-primary-foreground border-primary rounded-md shadow-md"
            : "rounded-md hover:bg-accent hover:text-accent-foreground"
            }`}
          onClick={() => setToolMode(tool.mode)}
          title={tool.label}
        >
          {tool.icon}
        </Button>
      ))}

      {/* Lines Dropdown (above shapes) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={currentLineTool ? "default" : "ghost"}
            size="icon"
            className={`h-10 w-10 sm:min-h-[44px] sm:min-w-[44px] transition-all ${currentLineTool
              ? "bg-primary text-primary-foreground rounded-md shadow-md"
              : "rounded-md hover:bg-accent hover:text-accent-foreground"
              }`}
            title="Line Tools"
          >
            {currentLineTool ? currentLineTool.icon : <Pencil className="h-4 w-4 sm:h-5 sm:w-5" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" className="min-w-[8rem]">
          {lineTools.map((tool) => (
            <DropdownMenuItem
              key={tool.mode}
              onClick={() => setToolMode(tool.mode)}
              className={toolMode === tool.mode ? "bg-accent" : ""}
            >
              <div className="flex items-center">
                {tool.icon}
                <span>{tool.label}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Shapes Dropdown (including Polygon) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={currentShapeTool ? "default" : "ghost"}
            size="icon"
            className={`h-10 w-10 sm:min-h-[44px] sm:min-w-[44px] transition-all ${currentShapeTool
              ? "bg-primary text-primary-foreground rounded-md shadow-md"
              : "rounded-md hover:bg-accent hover:text-accent-foreground"
              }`}
            title="Shapes & Polygons"
          >
            {currentShapeTool ? currentShapeTool.icon : <Shapes className="h-4 w-4 sm:h-5 sm:w-5" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" className="min-w-[8rem]">
          {shapeTools.map((tool) => (
            <DropdownMenuItem
              key={tool.mode}
              onClick={() => setToolMode(tool.mode)}
              className={toolMode === tool.mode ? "bg-accent" : ""}
            >
              {tool.icon}
              <span>{tool.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Remaining tools: Match Style, Highlighter, Eraser, Calibrate */}
      {tools.slice(2).map((tool) => (
        <Button
          key={tool.mode}
          variant={toolMode === tool.mode ? "default" : "ghost"}
          size="icon"
          className={`h-10 w-10 sm:min-h-[44px] sm:min-w-[44px] transition-all ${toolMode === tool.mode
            ? "bg-primary text-primary-foreground border-primary rounded-md shadow-md"
            : "rounded-md hover:bg-accent hover:text-accent-foreground"
            }`}
          onClick={() => setToolMode(tool.mode)}
          title={tool.label}
        >
          {tool.icon}
        </Button>
      ))}

      <div className="mx-0.5 h-px w-full bg-border sm:my-1 sm:h-px sm:w-auto max-sm:h-8 max-sm:w-px" />

      {/* Journeys Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={sequenceMode ? "default" : "ghost"}
            size="icon"
            className={`h-10 w-10 sm:min-h-[44px] sm:min-w-[44px] transition-all ${sequenceMode
              ? "bg-primary text-primary-foreground border-primary rounded-md shadow-md"
              : "rounded-md hover:bg-accent hover:text-accent-foreground"
              }`}
            title="Journeys"
          >
            <Route className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" className="min-w-[8rem]">
          <DropdownMenuItem onClick={() => setSequenceMode(!sequenceMode)}>
            <div className="flex items-center">
              <Route className="h-4 w-4 mr-2" />
              <span>{sequenceMode ? "Stop Recording" : "Record Journey"}</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenSavedDatasets}>
            <div className="flex items-center">
              <FolderOpen className="h-4 w-4 mr-2" />
              <span>View Saved Journeys</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
