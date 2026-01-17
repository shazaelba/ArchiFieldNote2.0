"use client"

import { useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { MapObject } from "@/lib/db"
import { getPolygonArea, getLineLength } from "@/lib/canvas-utils"

interface DataChartsViewProps {
  open: boolean
  onClose: () => void
  objects: MapObject[]
  pixelToMeterRatio: number | null
}

const COLORS = ["#3C00BB", "#6B21A8", "#9333EA", "#A855F7", "#C084FC", "#D8B4FE", "#7C3AED", "#8B5CF6"]

export function DataChartsView({ open, onClose, objects, pixelToMeterRatio }: DataChartsViewProps) {
  // Type distribution data
  const typeData = useMemo(() => {
    const counts: Record<string, number> = {}
    objects.forEach((obj) => {
      counts[obj.type] = (counts[obj.type] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [objects])

  // Category distribution data
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {}
    objects.forEach((obj) => {
      const cat = obj.metadata.qualitativeType || "Uncategorized"
      counts[cat] = (counts[cat] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [objects])

  // Area/Length comparison for polygons
  const measurementData = useMemo(() => {
    return objects
      .filter((obj) => obj.type === "polygon" || obj.type === "threshold")
      .slice(0, 10)
      .map((obj) => {
        if (obj.type === "polygon" && obj.vertices.length > 2) {
          return {
            name: obj.name.length > 15 ? obj.name.slice(0, 15) + "..." : obj.name,
            value: getPolygonArea(obj.vertices, pixelToMeterRatio),
            unit: "m²",
          }
        } else if (obj.type === "threshold" && obj.vertices.length === 2) {
          return {
            name: obj.name.length > 15 ? obj.name.slice(0, 15) + "..." : obj.name,
            value: getLineLength(obj.vertices[0], obj.vertices[1], pixelToMeterRatio),
            unit: "m",
          }
        }
        return null
      })
      .filter(Boolean)
  }, [objects, pixelToMeterRatio])

  // Tag frequency
  const tagData = useMemo(() => {
    const counts: Record<string, number> = {}
    objects.forEach((obj) => {
      obj.metadata.tags.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1
      })
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }))
  }, [objects])

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Data Visualization</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="measurements">Measurements</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Object Types Donut */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Object Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={typeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => {
                            const shortName = name.length > 8 ? name.slice(0, 8) + ".." : name
                            return `${shortName} ${(percent * 100).toFixed(0)}%`
                          }}
                          labelLine={false}
                          style={{ fontSize: '10px' }}
                        >
                          {typeData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Categories Donut */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => {
                            const shortName = name.length > 6 ? name.slice(0, 6) + ".." : name
                            return `${shortName} ${(percent * 100).toFixed(0)}%`
                          }}
                          labelLine={false}
                          style={{ fontSize: '10px' }}
                        >
                          {categoryData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{objects.length}</div>
                    <div className="text-sm text-muted-foreground">Total Objects</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      {objects.filter((o) => o.type === "polygon").length}
                    </div>
                    <div className="text-sm text-muted-foreground">Polygons</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      {objects.filter((o) => o.type === "threshold").length}
                    </div>
                    <div className="text-sm text-muted-foreground">Thresholds</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      {objects.reduce((acc, o) => acc + o.metadata.photos.length, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Photos</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="measurements" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {pixelToMeterRatio ? "Area & Length Comparison" : "Area & Length (Calibrate for meters)"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {measurementData.length === 0 ? (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    No polygons or thresholds to display
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={measurementData} layout="vertical" margin={{ left: 80 }}>
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => value.toFixed(2)} />
                        <Bar dataKey="value" fill="#3C00BB" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tags" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tag Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                {tagData.length === 0 ? (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    No tags added to objects yet
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tagData}>
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3C00BB" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
