"use client"

import { useMemo } from "react"

interface ScaleBarProps {
  pixelToMeterRatio: number | null
  zoomLevel: number
}

export function ScaleBar({ pixelToMeterRatio, zoomLevel }: ScaleBarProps) {
  const scaleInfo = useMemo(() => {
    if (!pixelToMeterRatio) return null

    // Calculate a nice round number for the scale bar
    const targetPixels = 100 // Target width in pixels
    const metersPerPixel = 1 / (pixelToMeterRatio * zoomLevel)
    const targetMeters = targetPixels * metersPerPixel

    // Find a nice round number
    const niceNumbers = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]
    let bestNumber = niceNumbers[0]
    for (const num of niceNumbers) {
      if (num <= targetMeters * 1.5) {
        bestNumber = num
      }
    }

    const actualPixels = bestNumber * pixelToMeterRatio * zoomLevel
    const label = bestNumber >= 1000 ? `${bestNumber / 1000} km` : `${bestNumber} m`

    return { width: actualPixels, label }
  }, [pixelToMeterRatio, zoomLevel])

  if (!scaleInfo) {
    return (
      <div className="absolute bottom-4 left-4 z-10 rounded-lg bg-background/90 px-3 py-2 text-sm text-muted-foreground backdrop-blur-sm">
        Scale not calibrated
      </div>
    )
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col items-start gap-1 rounded-lg bg-background/90 px-3 py-2 backdrop-blur-sm">
      <div
        className="h-2 border-l-2 border-r-2 border-b-2 border-foreground"
        style={{ width: `${scaleInfo.width}px` }}
      />
      <span className="text-xs font-medium text-foreground">{scaleInfo.label}</span>
    </div>
  )
}
