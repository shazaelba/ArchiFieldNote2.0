"use client"

import { useMemo } from "react"

interface ScaleBarProps {
  pixelToMeterRatio: number | null
  zoomLevel: number
}

export function ScaleBar({ pixelToMeterRatio, zoomLevel }: ScaleBarProps) {
  const scaleInfo = useMemo(() => {
    if (!pixelToMeterRatio) return null

    const targetPixels = 100
    const metersPerPixel = 1 / (pixelToMeterRatio * zoomLevel)
    const targetMeters = targetPixels * metersPerPixel

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
      <div className="absolute bottom-32 left-2 z-10 rounded-lg bg-background/90 px-2 py-1.5 text-xs text-muted-foreground backdrop-blur-sm sm:bottom-20 sm:left-4 sm:px-3 sm:py-2 sm:text-sm">
        Scale not calibrated
      </div>
    )
  }

  return (
    <div className="absolute bottom-32 left-2 z-10 flex flex-col items-start gap-1 rounded-lg bg-background/90 px-2 py-1.5 backdrop-blur-sm sm:bottom-20 sm:left-4 sm:px-3 sm:py-2">
      <div
        className="h-1.5 border-b-2 border-l-2 border-r-2 border-foreground sm:h-2"
        style={{ width: `${Math.min(scaleInfo.width, 150)}px` }}
      />
      <span className="text-[10px] font-medium text-foreground sm:text-xs">{scaleInfo.label}</span>
    </div>
  )
}
