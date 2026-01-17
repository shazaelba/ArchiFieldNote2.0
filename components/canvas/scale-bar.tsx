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
      <div className="absolute bottom-2 left-[calc(50%-160px)] z-10 -translate-x-full rounded-lg bg-background/90 px-2 py-1.5 text-[10px] text-muted-foreground backdrop-blur-sm sm:bottom-4 sm:left-[calc(50%-200px)] sm:px-3 sm:py-2 sm:text-xs">
        Scale not calibrated
      </div>
    )
  }

  return (
    <div className="absolute bottom-2 left-[calc(50%-160px)] z-10 flex -translate-x-full flex-col items-start gap-0.5 rounded-lg bg-background/90 px-2 py-1 backdrop-blur-sm sm:bottom-4 sm:left-[calc(50%-200px)] sm:px-3 sm:py-1.5">
      <div
        className="h-1 border-b-2 border-l-2 border-r-2 border-foreground sm:h-1.5"
        style={{ width: `${Math.min(scaleInfo.width, 100)}px` }}
      />
      <span className="text-[9px] font-medium text-foreground sm:text-[10px]">{scaleInfo.label}</span>
    </div>
  )
}
