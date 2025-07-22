
"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  ArrowUpRight,
  Minus,
  Maximize,
  Type,
  MousePointer,
  Trash2,
  Pipette,
  Eraser
} from 'lucide-react';
import { Separator } from "./ui/separator";

const drawingTools = [
  { name: 'Cursor', icon: MousePointer },
  { name: 'Trend Line', icon: TrendingUp },
  { name: 'Arrow Ray', icon: ArrowUpRight },
  { name: 'Horizontal Line', icon: Minus },
  { name: 'Rectangle', icon: Maximize },
  { name: 'Text', icon: Type },
  { name: 'Color Picker', icon: Pipette },
  { name: 'Eraser', icon: Eraser },
];

export default function DrawingToolbar() {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="h-full flex flex-col justify-center">
        <div className="flex flex-col gap-2 p-2 border rounded-lg bg-card">
          {drawingTools.map((tool, index) => (
            <Tooltip key={tool.name}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <tool.icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">
                <p>{tool.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          <Separator className="my-1" />
          <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">
                <p>Remove Drawings</p>
              </TooltipContent>
            </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
