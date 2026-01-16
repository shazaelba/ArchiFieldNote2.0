"use client"

import { useState, useEffect, useCallback } from "react"
import { getDb, createProject, updateProject, type Project, type MapObject, type Sequence } from "@/lib/db"

function useDexieQuery<T>(queryFn: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const [result, setResult] = useState<T | undefined>(undefined)

  useEffect(() => {
    let isMounted = true
    const db = getDb()

    const runQuery = async () => {
      try {
        const data = await queryFn()
        if (isMounted) {
          setResult(data)
        }
      } catch (error) {
        console.error("Dexie query error:", error)
      }
    }

    // Run initial query
    runQuery()

    // Subscribe to changes on all tables
    const subscription = db.on("changes", () => {
      runQuery()
    })

    return () => {
      isMounted = false
      // Dexie's on() returns an unsubscribe function in newer versions
      if (typeof subscription === "function") {
        subscription()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return result
}

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
      setObjects(allObjects)
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

  // Set up polling for data updates
  useEffect(() => {
    const interval = setInterval(fetchData, 500)
    return () => clearInterval(interval)
  }, [fetchData])

  const setBaseMap = useCallback(
    async (imageData: string) => {
      if (currentProjectId) {
        await updateProject(currentProjectId, { baseMapImage: imageData })
        fetchData()
      }
    },
    [currentProjectId, fetchData],
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
    setBaseMap,
    setCalibration,
    refetch: fetchData,
  }
}
