"use client"

import { useState, useEffect, useCallback } from "react"

type Theme = "light" | "dark" | "system"

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system")
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark")

  // Initialize from localStorage and system preference
  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null
    if (stored) {
      setThemeState(stored)
    }
  }, [])

  // Update resolved theme and apply to document
  useEffect(() => {
    const updateResolvedTheme = () => {
      let resolved: "light" | "dark"
      if (theme === "system") {
        resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      } else {
        resolved = theme
      }
      setResolvedTheme(resolved)

      // Apply to document
      document.documentElement.classList.remove("light", "dark")
      document.documentElement.classList.add(resolved)
    }

    updateResolvedTheme()

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      if (theme === "system") {
        updateResolvedTheme()
      }
    }
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [theme])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem("theme", newTheme)
  }, [])

  return { theme, setTheme, resolvedTheme }
}
