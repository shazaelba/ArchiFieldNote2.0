"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trash2, Lock, Unlock, Eye, EyeOff, Layers, ArrowUp, ArrowDown } from "lucide-react"
import type { MapImage } from "@/lib/db"

interface ImagePropertiesDrawerProps {
    open: boolean
    onClose: () => void
    image: MapImage | null
    onUpdate: (updates: Partial<MapImage>) => void
    onDelete: () => void
}

export function ImagePropertiesDrawer({
    open,
    onClose,
    image,
    onUpdate,
    onDelete,
}: ImagePropertiesDrawerProps) {
    if (!image) return null

    return (
        <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="w-[320px] overflow-y-auto bg-card p-4 sm:w-[380px] sm:p-6">
                <SheetHeader>
                    <SheetTitle className="flex items-center justify-between text-base sm:text-lg">
                        <span>Image Properties</span>
                        <div className="flex gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 sm:min-h-[44px] sm:min-w-[44px]"
                                onClick={() => onUpdate({ locked: !image.locked })}
                                title={image.locked ? "Unlock" : "Lock"}
                            >
                                {image.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 sm:min-h-[44px] sm:min-w-[44px]"
                                onClick={() => onUpdate({ visible: !image.visible })}
                                title={image.visible ? "Hide" : "Show"}
                            >
                                {image.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-destructive hover:bg-destructive/10 sm:min-h-[44px] sm:min-w-[44px]"
                                onClick={onDelete}
                            >
                                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                        </div>
                    </SheetTitle>
                </SheetHeader>

                <Tabs defaultValue="transform" className="mt-4 sm:mt-6">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="transform">Transform</TabsTrigger>
                        <TabsTrigger value="style">Style</TabsTrigger>
                    </TabsList>

                    <TabsContent value="transform" className="space-y-4 pt-4">
                        {/* Opacity */}
                        <div className="space-y-2">
                            <Label>Opacity: {Math.round(image.opacity * 100)}%</Label>
                            <Slider
                                value={[image.opacity * 100]}
                                onValueChange={([value]) => onUpdate({ opacity: value / 100 })}
                                min={0}
                                max={100}
                                step={1}
                                className="py-2"
                            />
                        </div>

                        {/* Scale */}
                        <div className="space-y-2">
                            <Label>Scale: {image.scale.toFixed(2)}x</Label>
                            <Slider
                                value={[image.scale]}
                                onValueChange={([value]) => onUpdate({ scale: value })}
                                min={0.1}
                                max={5}
                                step={0.01}
                                className="py-2"
                            />
                        </div>

                        {/* Rotation */}
                        <div className="space-y-2">
                            <Label>Rotation: {image.rotation}°</Label>
                            <Slider
                                value={[image.rotation]}
                                onValueChange={([value]) => onUpdate({ rotation: value })}
                                min={0}
                                max={360}
                                step={1}
                                className="py-2"
                            />
                        </div>

                        {/* Position Manual Input */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs">X Position</Label>
                                <Input
                                    type="number"
                                    value={image.position.x}
                                    onChange={(e) => onUpdate({ position: { ...image.position, x: parseFloat(e.target.value) || 0 } })}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Y Position</Label>
                                <Input
                                    type="number"
                                    value={image.position.y}
                                    onChange={(e) => onUpdate({ position: { ...image.position, y: parseFloat(e.target.value) || 0 } })}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="style" className="space-y-4 pt-4">
                        {/* Saturation */}
                        <div className="space-y-2">
                            <Label>Saturation: {image.saturation}%</Label>
                            <Slider
                                value={[image.saturation]}
                                onValueChange={([value]) => onUpdate({ saturation: value })}
                                min={0}
                                max={200}
                                step={1}
                            />
                        </div>

                        {/* Grayscale */}
                        <div className="space-y-2">
                            <Label>Grayscale: {image.grayscale}%</Label>
                            <Slider
                                value={[image.grayscale]}
                                onValueChange={([value]) => onUpdate({ grayscale: value })}
                                min={0}
                                max={100}
                                step={1}
                            />
                        </div>
                    </TabsContent>
                </Tabs>
            </SheetContent>
        </Sheet>
    )
}
