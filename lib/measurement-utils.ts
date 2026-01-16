// Utility functions for measurement unit conversion

export type MeasurementUnit = "m" | "cm" | "mm" | "ft" | "in"

export function convertFromMeters(meters: number, unit: MeasurementUnit): number {
  switch (unit) {
    case "m":
      return meters
    case "cm":
      return meters * 100
    case "mm":
      return meters * 1000
    case "ft":
      return meters * 3.28084
    case "in":
      return meters * 39.3701
    default:
      return meters
  }
}

export function getUnitLabel(unit: MeasurementUnit): string {
  switch (unit) {
    case "m":
      return "m"
    case "cm":
      return "cm"
    case "mm":
      return "mm"
    case "ft":
      return "ft"
    case "in":
      return "in"
    default:
      return "m"
  }
}

export function getAreaUnitLabel(unit: MeasurementUnit): string {
  switch (unit) {
    case "m":
      return "m²"
    case "cm":
      return "cm²"
    case "mm":
      return "mm²"
    case "ft":
      return "ft²"
    case "in":
      return "in²"
    default:
      return "m²"
  }
}

export function convertAreaFromSquareMeters(sqMeters: number, unit: MeasurementUnit): number {
  switch (unit) {
    case "m":
      return sqMeters
    case "cm":
      return sqMeters * 10000
    case "mm":
      return sqMeters * 1000000
    case "ft":
      return sqMeters * 10.7639
    case "in":
      return sqMeters * 1550.0031
    default:
      return sqMeters
  }
}

export function formatMeasurement(value: number, unit: MeasurementUnit, isArea = false): string {
  const converted = isArea ? convertAreaFromSquareMeters(value, unit) : convertFromMeters(value, unit)
  const label = isArea ? getAreaUnitLabel(unit) : getUnitLabel(unit)

  // Format with appropriate precision
  if (converted >= 100) {
    return `${converted.toFixed(1)} ${label}`
  } else if (converted >= 1) {
    return `${converted.toFixed(2)} ${label}`
  } else {
    return `${converted.toFixed(3)} ${label}`
  }
}
