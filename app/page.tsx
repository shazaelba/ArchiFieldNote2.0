"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import {
  MapCanvas,
  type ToolMode,
  type MapCanvasRef,
  type DisplaySettings,
  type GridStyle,
} from "@/components/canvas/map-canvas"
import { MainToolbar } from "@/components/toolbar/main-toolbar"
import { TopBar } from "@/components/toolbar/top-bar"
import { ScaleBar } from "@/components/canvas/scale-bar"
import { CalibrationDialog } from "@/components/dialogs/calibration-dialog"
import { ExportDialog } from "@/components/dialogs/export-dialog"
import { SettingsDialog } from "@/components/dialogs/settings-dialog"
import { SavedDatasetsDialog } from "@/components/dialogs/saved-datasets-dialog"
import { PropertiesDrawer } from "@/components/properties/properties-drawer"
import { SequencePanel } from "@/components/sequence/sequence-panel"
import { DataTableView } from "@/components/data/data-table-view"
import { DataChartsView } from "@/components/data/data-charts-view"
import { useProject } from "@/hooks/use-project"
import { useTheme } from "@/hooks/use-theme"
import { useUndo } from "@/hooks/use-undo"
import {
  createMapObject,
  createProject,
  createSequence,
  addToSequence,
  updateMapObject,
  deleteMapObject,
  updateProject,
  createSavedDataset,
  addSavedFieldName,
  db,
  type ObjectStyle,
  type MapObject,
  type Sequence,
} from "@/lib/db"
import type { MeasurementUnit } from "@/lib/measurement-utils"

export default function ArchiFieldNote() {
  const {
    projects,
    currentProject,
    currentProjectId,
    setCurrentProjectId,
    objects,
    sequences,
    setBaseMap,
    setCalibration,
    refetch,
  } = useProject()

  const { theme, setTheme, resolvedTheme } = useTheme()
  const { pushState, undo, redo, canUndo, canRedo } = useUndo()

  const [toolMode, setToolMode] = useState<ToolMode>("pan")
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null)
  const [sequenceMode, setSequenceMode] = useState(false)
  const [activeSequence, setActiveSequence] = useState<Sequence | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [propertiesOpen, setPropertiesOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dataTableOpen, setDataTableOpen] = useState(false)
  const [dataChartsOpen, setDataChartsOpen] = useState(false)
  const [savedDatasetsOpen, setSavedDatasetsOpen] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const [gridStyle, setGridStyle] = useState<GridStyle>(currentProject?.gridStyle || "lines")
  const [gridSize, setGridSize] = useState(currentProject?.gridSize || 50)
  const [measurementUnit, setMeasurementUnit] = useState<MeasurementUnit>(currentProject?.measurementUnit || "m")

  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    pointSize: 5,
    hatchSpacing: 10,
    hatchLineWidth: 1,
    freehandStrokeWidth: 4,
    freehandSmoothing: 3,
  })

  const [calibrationDialog, setCalibrationDialog] = useState(false)
  const [pendingCalibration, setPendingCalibration] = useState<{
    start: { x: number; y: number }
    end: { x: number; y: number }
    pixelDistance: number
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<MapCanvasRef>(null)

  useEffect(() => {
    if (currentProject) {
      setGridStyle(currentProject.gridStyle || "lines")
      setGridSize(currentProject.gridSize || 50)
      setMeasurementUnit(currentProject.measurementUnit || "m")
    }
  }, [currentProject])

  const handleGridStyleChange = useCallback(
    async (style: GridStyle) => {
      setGridStyle(style)
      if (currentProjectId) {
        setIsSaving(true)
        await updateProject(currentProjectId, { gridStyle: style })
        setIsSaving(false)
        setLastSaved(new Date())
      }
    },
    [currentProjectId],
  )

  const handleGridSizeChange = useCallback(
    async (size: number) => {
      setGridSize(size)
      if (currentProjectId) {
        setIsSaving(true)
        await updateProject(currentProjectId, { gridSize: size })
        setIsSaving(false)
        setLastSaved(new Date())
      }
    },
    [currentProjectId],
  )

  const handleMeasurementUnitChange = useCallback(
    async (unit: MeasurementUnit) => {
      setMeasurementUnit(unit)
      if (currentProjectId) {
        setIsSaving(true)
        await updateProject(currentProjectId, { measurementUnit: unit })
        setIsSaving(false)
        setLastSaved(new Date())
      }
    },
    [currentProjectId],
  )

  const handleAddFieldName = useCallback(
    async (fieldName: string) => {
      if (currentProjectId) {
        await addSavedFieldName(currentProjectId, fieldName)
        refetch()
      }
    },
    [currentProjectId, refetch],
  )

  useEffect(() => {
    const handler = (e: TouchEvent) => {
      if (e.touches.length > 1) return
      e.preventDefault()
    }

    document.addEventListener("touchmove", handler, { passive: false })
    return () => document.removeEventListener("touchmove", handler)
  }, [])

  useEffect(() => {
    if (activeSequence) {
      db.sequences.get(activeSequence.id).then((seq) => {
        if (seq) setActiveSequence(seq)
      })
    }
  }, [sequences])

  useEffect(() => {
    if (objects.length > 0) {
      pushState(objects)
    }
  }, [])

  const selectedObject = objects.find((o) => o.id === selectedObjectId) || null

  const handleSelectObject = useCallback((id: string | null) => {
    setSelectedObjectId(id)
    if (id) {
      setPropertiesOpen(true)
    }
  }, [])

  const handleUpdateObject = useCallback(
    async (updates: Partial<MapObject>) => {
      if (selectedObjectId) {
        setIsSaving(true)
        await updateMapObject(selectedObjectId, updates)
        pushState(objects)
        setIsSaving(false)
        setLastSaved(new Date())
        refetch()
      }
    },
    [selectedObjectId, objects, pushState, refetch],
  )

  const handleDeleteObject = useCallback(async () => {
    if (selectedObjectId) {
      setIsSaving(true)
      pushState(objects)
      await deleteMapObject(selectedObjectId)
      setSelectedObjectId(null)
      setPropertiesOpen(false)
      setToolMode("select")
      setIsSaving(false)
      setLastSaved(new Date())
      refetch()
    }
  }, [selectedObjectId, objects, pushState, refetch])

  const handleVertexUpdate = useCallback(
    async (objectId: string, vertices: { x: number; y: number }[]) => {
      setIsSaving(true)
      await updateMapObject(objectId, { vertices })
      setIsSaving(false)
      setLastSaved(new Date())
      refetch()
    },
    [refetch],
  )

  const handleEditVertices = useCallback(() => {
    setToolMode("editVertices")
    setPropertiesOpen(false)
  }, [])

  const handleUndo = useCallback(async () => {
    const prevState = undo()
    if (prevState) {
      const currentObjects = await db.objects.toArray()
      for (const obj of currentObjects) {
        await db.objects.delete(obj.id)
      }
      for (const obj of prevState) {
        await db.objects.add(obj)
      }
      refetch()
    }
  }, [undo, refetch])

  const handleRedo = useCallback(async () => {
    const nextState = redo()
    if (nextState) {
      const currentObjects = await db.objects.toArray()
      for (const obj of currentObjects) {
        await db.objects.delete(obj.id)
      }
      for (const obj of nextState) {
        await db.objects.add(obj)
      }
      refetch()
    }
  }, [redo, refetch])

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string
        setIsSaving(true)
        await setBaseMap(dataUrl)
        setIsSaving(false)
        setLastSaved(new Date())
      }
      reader.readAsDataURL(file)
      e.target.value = ""
    },
    [setBaseMap],
  )

  const getDefaultStyle = (type: "polygon" | "threshold" | "freehand"): ObjectStyle => ({
    fillColor: type === "polygon" ? "#3b82f6" : "#ef4444",
    fillOpacity: type === "polygon" ? 0.3 : 0,
    strokeColor: type === "polygon" ? "#3b82f6" : type === "freehand" ? "#3C00BB" : "#ef4444",
    strokeWidth: type === "freehand" ? displaySettings.freehandStrokeWidth : 2,
    strokeStyle: "solid",
    hatchPattern: "none",
    lineEndpoints: "none",
    endpointSize: 8,
    hatchSpacing: 10,
    hatchLineWidth: 1,
    pointSize: 5,
    showPoints: type === "polygon",
  })

  const handlePolygonComplete = useCallback(
    async (vertices: { x: number; y: number }[]) => {
      setIsSaving(true)
      pushState(objects)
      const newObject = await createMapObject({
        type: "polygon",
        name: `Polygon ${objects.filter((o) => o.type === "polygon").length + 1}`,
        vertices,
        style: getDefaultStyle("polygon"),
        metadata: { tags: [], notes: "", photos: [], qualitativeType: "", customFields: [] },
      })
      setToolMode("select")
      setSelectedObjectId(newObject.id)
      setPropertiesOpen(true)
      setIsSaving(false)
      setLastSaved(new Date())
      refetch()
    },
    [objects, pushState, displaySettings, refetch],
  )

  const handleThresholdComplete = useCallback(
    async (start: { x: number; y: number }, end: { x: number; y: number }) => {
      setIsSaving(true)
      pushState(objects)
      const newObject = await createMapObject({
        type: "threshold",
        name: `Line ${objects.filter((o) => o.type === "threshold").length + 1}`,
        vertices: [start, end],
        style: getDefaultStyle("threshold"),
        metadata: { tags: [], notes: "", photos: [], qualitativeType: "", customFields: [] },
      })
      setToolMode("select")
      setSelectedObjectId(newObject.id)
      setPropertiesOpen(true)
      setIsSaving(false)
      setLastSaved(new Date())
      refetch()
    },
    [objects, pushState, refetch],
  )

  const handleFreehandComplete = useCallback(
    async (vertices: { x: number; y: number }[]) => {
      setIsSaving(true)
      pushState(objects)
      const newObject = await createMapObject({
        type: "freehand",
        name: `Drawing ${objects.filter((o) => o.type === "freehand").length + 1}`,
        vertices,
        style: getDefaultStyle("freehand"),
        metadata: { tags: [], notes: "", photos: [], qualitativeType: "", customFields: [] },
      })
      setToolMode("select")
      setSelectedObjectId(newObject.id)
      setPropertiesOpen(true)
      setIsSaving(false)
      setLastSaved(new Date())
      refetch()
    },
    [objects, pushState, displaySettings, refetch],
  )

  const handleCalibrationComplete = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }, pixelDistance: number) => {
      setPendingCalibration({ start, end, pixelDistance })
      setCalibrationDialog(true)
    },
    [],
  )

  const confirmCalibration = useCallback(
    async (realWorldMeters: number) => {
      if (pendingCalibration) {
        setIsSaving(true)
        await setCalibration(
          { start: pendingCalibration.start, end: pendingCalibration.end },
          realWorldMeters,
          pendingCalibration.pixelDistance,
        )
        setPendingCalibration(null)
        setToolMode("select")
        setIsSaving(false)
        setLastSaved(new Date())
      }
    },
    [pendingCalibration, setCalibration],
  )

  const handleSequenceAdd = useCallback(
    async (objectId: string) => {
      if (!activeSequence && currentProjectId) {
        const newSequence = await createSequence(currentProjectId, `Journey ${sequences.length + 1}`)
        setActiveSequence(newSequence)
        await addToSequence(newSequence.id, objectId)
      } else if (activeSequence) {
        await addToSequence(activeSequence.id, objectId)
      }
    },
    [activeSequence, currentProjectId, sequences.length],
  )

  const handleSaveDataset = useCallback(
    async (name: string, description: string, objectIds: string[], photoStripImage: string | null) => {
      if (currentProjectId) {
        setIsSaving(true)
        await createSavedDataset(currentProjectId, name, description, objectIds, photoStripImage)
        setIsSaving(false)
        setLastSaved(new Date())
      }
    },
    [currentProjectId],
  )

  const toggleSequenceMode = useCallback((enabled: boolean) => {
    setSequenceMode(enabled)
    if (!enabled) {
      setActiveSequence(null)
    }
  }, [])

  const handleNewProject = useCallback(async () => {
    const project = await createProject(`Project ${projects.length + 1}`)
    setCurrentProjectId(project.id)
  }, [projects.length, setCurrentProjectId])

  const handleExport = useCallback(() => {
    setExportOpen(true)
  }, [])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <TopBar
        project={currentProject}
        projects={projects}
        onSelectProject={setCurrentProjectId}
        onNewProject={handleNewProject}
        theme={theme}
        onThemeChange={setTheme}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenDataTable={() => setDataTableOpen(true)}
        onOpenDataCharts={() => setDataChartsOpen(true)}
        onOpenSavedDatasets={() => setSavedDatasetsOpen(true)}
        isSaving={isSaving}
        lastSaved={lastSaved}
      />

      <MainToolbar
        toolMode={toolMode}
        setToolMode={setToolMode}
        sequenceMode={sequenceMode}
        setSequenceMode={toggleSequenceMode}
        onImageUpload={handleImageUpload}
        onExport={handleExport}
      />

      <MapCanvas
        ref={canvasRef}
        project={currentProject}
        objects={objects}
        toolMode={toolMode}
        selectedObjectId={selectedObjectId}
        onSelectObject={handleSelectObject}
        onPolygonComplete={handlePolygonComplete}
        onThresholdComplete={handleThresholdComplete}
        onCalibrationComplete={handleCalibrationComplete}
        onFreehandComplete={handleFreehandComplete}
        onVertexUpdate={handleVertexUpdate}
        sequenceMode={sequenceMode}
        onSequenceAdd={handleSequenceAdd}
        onZoomChange={setZoomLevel}
        displaySettings={displaySettings}
        isDark={resolvedTheme === "dark"}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        gridStyle={gridStyle}
        gridSize={gridSize}
      />

      <ScaleBar pixelToMeterRatio={currentProject?.pixelToMeterRatio || null} zoomLevel={zoomLevel} />

      {sequenceMode && (
        <div className="absolute right-2 top-16 z-20 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground sm:right-4 sm:top-20 sm:px-4 sm:py-2 sm:text-sm">
          Recording Journey - Tap objects
        </div>
      )}

      {sequenceMode && (
        <SequencePanel
          sequence={activeSequence}
          objects={objects}
          onClose={() => toggleSequenceMode(false)}
          onObjectClick={handleSelectObject}
          onSaveDataset={handleSaveDataset}
        />
      )}

      <CalibrationDialog
        open={calibrationDialog}
        onClose={() => setCalibrationDialog(false)}
        pixelDistance={pendingCalibration?.pixelDistance || 0}
        onConfirm={confirmCalibration}
      />

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        project={currentProject}
        objects={objects}
        sequences={sequences}
      />

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        displaySettings={displaySettings}
        onDisplaySettingsChange={setDisplaySettings}
        gridStyle={gridStyle}
        gridSize={gridSize}
        onGridStyleChange={handleGridStyleChange}
        onGridSizeChange={handleGridSizeChange}
        measurementUnit={measurementUnit}
        onMeasurementUnitChange={handleMeasurementUnitChange}
      />

      <SavedDatasetsDialog
        open={savedDatasetsOpen}
        onClose={() => setSavedDatasetsOpen(false)}
        projectId={currentProjectId}
        objects={objects}
      />

      <DataTableView
        open={dataTableOpen}
        onClose={() => setDataTableOpen(false)}
        objects={objects}
        pixelToMeterRatio={currentProject?.pixelToMeterRatio || null}
        measurementUnit={measurementUnit}
        onSelectObject={handleSelectObject}
      />

      <DataChartsView
        open={dataChartsOpen}
        onClose={() => setDataChartsOpen(false)}
        objects={objects}
        pixelToMeterRatio={currentProject?.pixelToMeterRatio || null}
      />

      <PropertiesDrawer
        open={propertiesOpen}
        onClose={() => setPropertiesOpen(false)}
        object={selectedObject}
        pixelToMeterRatio={currentProject?.pixelToMeterRatio || null}
        measurementUnit={measurementUnit}
        savedFieldNames={currentProject?.savedFieldNames || []}
        onUpdate={handleUpdateObject}
        onDelete={handleDeleteObject}
        onEditVertices={handleEditVertices}
        onAddFieldName={handleAddFieldName}
      />
    </div>
  )
}
