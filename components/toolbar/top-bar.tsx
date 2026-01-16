"use client"

import { Button } from "@/components/ui/button"
import { Map, ChevronDown, Sun, Moon, Monitor, Settings, Table, BarChart3, Check } from "lucide-react"
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
  theme: "light" | "dark" | "system"
  onThemeChange: (theme: "light" | "dark" | "system") => void
  onOpenSettings: () => void
  onOpenDataTable: () => void
  onOpenDataCharts: () => void
  isSaving?: boolean
  lastSaved?: Date | null
}

export function TopBar({
  project,
  projects,
  onSelectProject,
  onNewProject,
  theme,
  onThemeChange,
  onOpenSettings,
  onOpenDataTable,
  onOpenDataCharts,
  isSaving,
  lastSaved,
}: TopBarProps) {
  return (
    <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Map className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold text-foreground">ArchiFieldNote</span>

        <div className="ml-4 flex items-center gap-1.5 text-xs text-muted-foreground">
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

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="min-h-[44px] min-w-[44px] bg-transparent"
          onClick={onOpenDataTable}
          title="Data Table"
        >
          <Table className="h-5 w-5" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="min-h-[44px] min-w-[44px] bg-transparent"
          onClick={onOpenDataCharts}
          title="Charts"
        >
          <BarChart3 className="h-5 w-5" />
        </Button>

        <div className="mx-1 h-8 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px] bg-transparent">
              {theme === "light" && <Sun className="h-5 w-5" />}
              {theme === "dark" && <Moon className="h-5 w-5" />}
              {theme === "system" && <Monitor className="h-5 w-5" />}
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
          className="min-h-[44px] min-w-[44px] bg-transparent"
          onClick={onOpenSettings}
        >
          <Settings className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-h-[44px] gap-2 bg-transparent">
              {project?.name || "Select Project"}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {projects.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => onSelectProject(p.id)}>
                {p.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onNewProject}>+ New Project</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
