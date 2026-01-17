"use client"

import { Button } from "@/components/ui/button"
import { Map, ChevronDown, Sun, Moon, Monitor, Settings, Table, BarChart3, Check, FolderOpen, Trash2, ImageIcon, Download } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import type { Project } from "@/lib/db"

interface TopBarProps {
  project: Project | undefined
  projects: Project[]
  onSelectProject: (id: string) => void
  onNewProject: () => void
  onDeleteProject?: (id: string) => void
  theme: "light" | "dark" | "system"
  onThemeChange: (theme: "light" | "dark" | "system") => void
  onOpenSettings: () => void
  onOpenDataTable: () => void
  onOpenDataCharts: () => void
  onImageUpload: () => void
  onExport: () => void
  isSaving?: boolean
  lastSaved?: Date | null
}

export function TopBar({
  project,
  projects,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  theme,
  onThemeChange,
  onOpenSettings,
  onOpenDataTable,
  onOpenDataCharts,
  onImageUpload,
  onExport,
  isSaving,
  lastSaved,
}: TopBarProps) {
  return (
    <div className="absolute left-0 right-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-2 backdrop-blur-sm sm:h-16 sm:px-4">
      {/* Left section - logo and title */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary sm:h-10 sm:w-10">
          <Map className="h-4 w-4 text-primary-foreground sm:h-5 sm:w-5" />
        </div>
        <span className="hidden text-base font-semibold text-foreground sm:inline sm:text-lg">ArchiFieldNote</span>

        {/* Save status - only on larger screens */}
        <div className="ml-2 hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          {isSaving ? (
            <>
              <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              <span>Saving...</span>
            </>
          ) : lastSaved ? (
            <>
              <Check className="h-3 w-3 text-green-500" />
              <span>Saved</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Right section - actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 bg-transparent sm:min-h-[44px] sm:min-w-[44px]"
          onClick={onOpenDataTable}
          title="Data Table"
        >
          <Table className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 bg-transparent sm:min-h-[44px] sm:min-w-[44px]"
          onClick={onOpenDataCharts}
          title="Charts"
        >
          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        <div className="mx-0.5 h-6 w-px bg-border sm:mx-1 sm:h-8" />

        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 bg-transparent sm:min-h-[44px] sm:min-w-[44px]"
          onClick={onImageUpload}
          title="Upload Base Map"
        >
          <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 bg-transparent sm:min-h-[44px] sm:min-w-[44px]"
          onClick={onExport}
          title="Export"
        >
          <Download className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        <div className="mx-0.5 hidden h-8 w-px bg-border sm:mx-1 sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 bg-transparent sm:min-h-[44px] sm:min-w-[44px]">
              {theme === "light" && <Sun className="h-4 w-4 sm:h-5 sm:w-5" />}
              {theme === "dark" && <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
              {theme === "system" && <Monitor className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onThemeChange("light")}>
              <Sun className="mr-2 h-4 w-4" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onThemeChange("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onThemeChange("system")}>
              <Monitor className="mr-2 h-4 w-4" />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 bg-transparent sm:min-h-[44px] sm:min-w-[44px]"
          onClick={onOpenSettings}
        >
          <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10 gap-1 bg-transparent px-2 sm:min-h-[44px] sm:gap-2 sm:px-3">
              <span className="max-w-[80px] truncate text-xs sm:max-w-[120px] sm:text-sm">
                {project?.name || "Project"}
              </span>
              <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <DropdownMenuItem
                  onClick={() => onSelectProject(p.id)}
                  className="flex-1"
                >
                  {p.name}
                </DropdownMenuItem>
                {onDeleteProject && projects.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteProject(p.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onNewProject}>+ New Project</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
