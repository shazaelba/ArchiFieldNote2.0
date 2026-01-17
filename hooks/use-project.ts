"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getDb,
  createProject,
  updateProject,
  type Project,
  type MapObject,
  type Sequence,
  type MapImage,
} from "@/lib/db"



export function useProject() {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | undefined>(undefined)
  const [objects, setObjects] = useState<MapObject[]>([])
  const [sequences, setSequences] = useState<Sequence[]>([])

  const fetchData = useCallback(async () => {
    try {
      const db = getDb()
      const allProjects = await db.projects.toArray()
      setProjects(allProjects)

      if (currentProjectId) {
        const project = await db.projects.get(currentProjectId)
        setCurrentProject(project)

        const projectSequences = await db.sequences.where("projectId").equals(currentProjectId).toArray()
        setSequences(projectSequences)
      }

      const allObjects = await db.objects.toArray()
      const projectObjects = currentProjectId
        ? allObjects.filter(obj => obj.projectId === currentProjectId)
        : []
      setObjects(projectObjects)
    } catch (error) {
      console.error("Error fetching data:", error)
    }
  }, [currentProjectId])

  // Initialize with first project or create one
  useEffect(() => {
    async function init() {
      const db = getDb()
      const allProjects = await db.projects.toArray()
      if (allProjects.length === 0) {
        const newProject = await createProject("Untitled Project")
        setCurrentProjectId(newProject.id)
      } else if (!currentProjectId) {
        setCurrentProjectId(allProjects[0].id)
      }
      fetchData()
    }
    init()
  }, [currentProjectId, fetchData])

  // Refetch data when currentProjectId changes
  useEffect(() => {
    fetchData()
  }, [currentProjectId, fetchData])

  const addImage = useCallback(
    async (imageData: string) => {
      if (currentProjectId && currentProject) {
        const newImage: MapImage = {
          id: crypto.randomUUID(),
          src: imageData,
          position: { x: 0, y: 0 },
          scale: 1,
          rotation: 0,
          opacity: 1,
          locked: false,
          visible: true,
          zIndex: currentProject.images.length,
          grayscale: 0,
          saturation: 100,
          brightness: 100,
          contrast: 100,
          sepia: 0,
          blendingMode: "normal",
        }
        await updateProject(currentProjectId, {
          images: [...currentProject.images, newImage],
        })
        fetchData()
      }
    },
    [currentProjectId, currentProject, fetchData],
  )

  const updateImage = useCallback(
    async (imageId: string, updates: Partial<MapImage>) => {
      if (currentProjectId && currentProject) {
        const updatedImages = currentProject.images.map((img) =>
          img.id === imageId ? { ...img, ...updates } : img,
        )
        await updateProject(currentProjectId, { images: updatedImages })
        fetchData()
      }
    },
    [currentProjectId, currentProject, fetchData],
  )

  const deleteImage = useCallback(
    async (imageId: string) => {
      if (currentProjectId && currentProject) {
        const updatedImages = currentProject.images.filter((img) => img.id !== imageId)
        await updateProject(currentProjectId, { images: updatedImages })
        fetchData()
      }
    },
    [currentProjectId, currentProject, fetchData],
  )

  const setCalibration = useCallback(
    async (
      points: { start: { x: number; y: number }; end: { x: number; y: number } },
      realWorldMeters: number,
      pixelDistance: number,
    ) => {
      if (currentProjectId) {
        const pixelToMeterRatio = pixelDistance / realWorldMeters
        await updateProject(currentProjectId, {
          calibrationPoints: points,
          pixelToMeterRatio,
        })
        fetchData()
      }
    },
    [currentProjectId, fetchData],
  )

  return {
    projects,
    currentProject,
    currentProjectId,
    setCurrentProjectId,
    objects,
    sequences,
    addImage,
    updateImage,
    deleteImage,
    setCalibration,
    refetch: fetchData,
  }
}
