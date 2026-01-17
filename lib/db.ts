import Dexie, { type EntityTable } from "dexie"

export interface ObjectStyle {
  fillColor: string
  fillOpacity: number
  strokeColor: string
  strokeWidth: number
  strokeStyle: "solid" | "dashed" | "dotted" | "none"
  hatchPattern: "none" | "diagonal" | "dotted" | "crosshatch"
  hatchAngle: number
  hatchSpacing: number
  hatchLineWidth: number
  strokeHatch: boolean
  lineEndpoints: "none" | "points" | "arrows"
  endpointSize: number
  pointSize: number
  showPoints: boolean
  // Freehand specific
  smoothing: number
  dashSpacing: number
}

export interface MapImage {
  id: string
  src: string
  position: { x: number; y: number }
  scale: number
  rotation: number
  opacity: number
  locked: boolean
  visible: boolean
  zIndex: number
  // Effects
  grayscale: number
  saturation: number
  brightness: number
  contrast: number
  sepia: number
  blendingMode: "normal" | "multiply" | "screen" | "overlay"
}

export interface CustomField {
  id: string
  name: string
  value: string
}

export interface PathSection {
  type: string // "pedestrian", "car", etc.
  startIdx: number
  endIdx: number
}

export interface ObjectMetadata {
  tags: string[]
  notes: string
  photos: string[]
  qualitativeType: string
  customFields: CustomField[]
  pathType?: "pedestrian" | "car" | "bike" | "other"
}

export interface MapObject {
  id: string
  projectId: string
  type: "polygon" | "threshold" | "freehand" | "circle" | "square" | "triangle"
  name: string
  vertices: { x: number; y: number }[]
  style: ObjectStyle
  metadata: ObjectMetadata
  createdAt: number
  updatedAt: number
}

export interface Project {
  id: string
  name: string
  images: MapImage[]
  pixelToMeterRatio: number | null
  calibrationPoints: { start: { x: number; y: number }; end: { x: number; y: number } } | null
  gridStyle: "lines" | "dots" | "smallSquares"
  gridSize: number
  measurementUnit: "m" | "cm" | "mm" | "ft" | "in"
  savedFieldNames: string[]
  createdAt: number
  updatedAt: number
}

export interface Sequence {
  id: string
  projectId: string
  name: string
  objectIds: string[]
  createdAt: number
}

export interface SavedDataset {
  id: string
  projectId: string
  name: string
  description: string
  objectIds: string[]
  photoStripImage: string | null
  createdAt: number
}

class ThresholdMapperDB extends Dexie {
  projects!: EntityTable<Project, "id">
  objects!: EntityTable<MapObject, "id">
  sequences!: EntityTable<Sequence, "id">
  savedDatasets!: EntityTable<SavedDataset, "id">

  constructor() {
    super("ThresholdMapperDB")
    this.version(5).stores({
      projects: "id, name, createdAt, gridStyle, gridSize",
      objects: "id, projectId, type, createdAt",
      sequences: "id, projectId, createdAt",
      savedDatasets: "id, projectId, createdAt",
    }).upgrade(async tx => {
      // Migration: add projectId to existing objects
      const objects = await tx.table('objects').toArray()
      const projects = await tx.table('projects').toArray()

      if (projects.length > 0 && objects.length > 0) {
        const firstProjectId = projects[0].id
        for (const obj of objects) {
          if (!obj.projectId) {
            await tx.table('objects').update(obj.id, { projectId: firstProjectId })
          }
        }
      }
    })
  }
}

let dbInstance: ThresholdMapperDB | null = null

export function getDb(): ThresholdMapperDB {
  if (!dbInstance) {
    dbInstance = new ThresholdMapperDB()
  }
  return dbInstance
}

export const db = {
  get projects() {
    return getDb().projects
  },
  get objects() {
    return getDb().objects
  },
  get sequences() {
    return getDb().sequences
  },
  get savedDatasets() {
    return getDb().savedDatasets
  },
}

export async function createProject(name: string): Promise<Project> {
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    images: [],
    pixelToMeterRatio: null,
    calibrationPoints: null,
    gridStyle: "lines",
    gridSize: 50,
    measurementUnit: "m",
    savedFieldNames: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await getDb().projects.add(project)
  return project
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<void> {
  await getDb().projects.update(id, { ...updates, updatedAt: Date.now() })
}

export async function deleteProject(id: string): Promise<void> {
  // Delete all objects associated with this project
  const objects = await getDb().objects.toArray()
  const projectObjects = objects.filter(obj => {
    // Assuming objects don't have projectId - they're global
    // We'll just delete the project for now
    return false
  })

  // Delete all sequences for this project
  const sequences = await getDb().sequences.where('projectId').equals(id).toArray()
  for (const seq of sequences) {
    await getDb().sequences.delete(seq.id)
  }

  // Delete all saved datasets for this project
  const datasets = await getDb().savedDatasets.where('projectId').equals(id).toArray()
  for (const dataset of datasets) {
    await getDb().savedDatasets.delete(dataset.id)
  }

  // Finally delete the project itself
  await getDb().projects.delete(id)
}

export async function createMapObject(obj: Omit<MapObject, "id" | "createdAt" | "updatedAt">): Promise<MapObject> {
  const mapObject: MapObject = {
    ...obj,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await getDb().objects.add(mapObject)
  return mapObject
}

export async function updateMapObject(id: string, updates: Partial<MapObject>): Promise<void> {
  await getDb().objects.update(id, { ...updates, updatedAt: Date.now() })
}

export async function deleteMapObject(id: string): Promise<void> {
  await getDb().objects.delete(id)
}

export async function createSequence(projectId: string, name: string): Promise<Sequence> {
  const sequence: Sequence = {
    id: crypto.randomUUID(),
    projectId,
    name,
    objectIds: [],
    createdAt: Date.now(),
  }
  await getDb().sequences.add(sequence)
  return sequence
}

export async function addToSequence(sequenceId: string, objectId: string): Promise<void> {
  const sequence = await getDb().sequences.get(sequenceId)
  if (sequence) {
    await getDb().sequences.update(sequenceId, {
      objectIds: [...sequence.objectIds, objectId],
    })
  }
}

export async function createSavedDataset(
  projectId: string,
  name: string,
  description: string,
  objectIds: string[],
  photoStripImage: string | null = null,
): Promise<SavedDataset> {
  const dataset: SavedDataset = {
    id: crypto.randomUUID(),
    projectId,
    name,
    description,
    objectIds,
    photoStripImage,
    createdAt: Date.now(),
  }
  await getDb().savedDatasets.add(dataset)
  return dataset
}

export async function getSavedDatasets(projectId: string): Promise<SavedDataset[]> {
  return await getDb().savedDatasets.where("projectId").equals(projectId).toArray()
}

export async function addSavedFieldName(projectId: string, fieldName: string): Promise<void> {
  const project = await getDb().projects.get(projectId)
  if (project && !project.savedFieldNames.includes(fieldName)) {
    await updateProject(projectId, {
      savedFieldNames: [...(project.savedFieldNames || []), fieldName],
    })
  }
}
