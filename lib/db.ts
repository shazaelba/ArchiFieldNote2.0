import Dexie, { type EntityTable } from "dexie"

export interface ObjectStyle {
  fillColor: string
  fillOpacity: number
  strokeColor: string
  strokeWidth: number
  strokeStyle: "solid" | "dashed" | "dotted"
  hatchPattern: "none" | "diagonal" | "dotted" | "crosshatch"
  // New line endpoint options
  lineEndpoints: "none" | "points" | "arrows"
  endpointSize: number
  // Per-object hatch settings
  hatchSpacing: number
  hatchLineWidth: number
  // Point size per object
  pointSize: number
}

export interface ObjectMetadata {
  tags: string[]
  notes: string
  photos: string[] // Base64 image strings
  qualitativeType: string
}

export interface MapObject {
  id: string
  type: "polygon" | "threshold" | "freehand"
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
  baseMapImage: string | null
  baseMapPosition: { x: number; y: number }
  baseMapScale: number
  pixelToMeterRatio: number | null
  calibrationPoints: { start: { x: number; y: number }; end: { x: number; y: number } } | null
  gridStyle: "lines" | "dots" | "smallSquares"
  gridSize: number
  measurementUnit: "m" | "cm" | "mm" | "ft" | "in"
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
    this.version(2).stores({
      projects: "id, name, createdAt, gridStyle, gridSize",
      objects: "id, type, createdAt",
      sequences: "id, projectId, createdAt",
      savedDatasets: "id, projectId, createdAt",
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
    baseMapImage: null,
    baseMapPosition: { x: 0, y: 0 },
    baseMapScale: 1,
    pixelToMeterRatio: null,
    calibrationPoints: null,
    gridStyle: "lines",
    gridSize: 50,
    measurementUnit: "m",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await getDb().projects.add(project)
  return project
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<void> {
  await getDb().projects.update(id, { ...updates, updatedAt: Date.now() })
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
