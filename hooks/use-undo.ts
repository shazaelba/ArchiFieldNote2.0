"use client"

import { useState, useCallback } from "react"
import type { MapObject } from "@/lib/db"

interface HistoryState {
  objects: MapObject[]
}

export function useUndo(maxHistory = 50) {
  const [history, setHistory] = useState<HistoryState[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)

  const canUndo = currentIndex > 0
  const canRedo = currentIndex < history.length - 1

  const pushState = useCallback(
    (objects: MapObject[]) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, currentIndex + 1)
        newHistory.push({ objects: JSON.parse(JSON.stringify(objects)) })
        if (newHistory.length > maxHistory) {
          newHistory.shift()
          return newHistory
        }
        return newHistory
      })
      setCurrentIndex((prev) => Math.min(prev + 1, maxHistory - 1))
    },
    [currentIndex, maxHistory],
  )

  const undo = useCallback((): MapObject[] | null => {
    if (!canUndo) return null
    const newIndex = currentIndex - 1
    setCurrentIndex(newIndex)
    return history[newIndex].objects
  }, [canUndo, currentIndex, history])

  const redo = useCallback((): MapObject[] | null => {
    if (!canRedo) return null
    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)
    return history[newIndex].objects
  }, [canRedo, currentIndex, history])

  return { pushState, undo, redo, canUndo, canRedo }
}
