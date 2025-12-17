"use client"

import { useState } from "react"
import { FileText, Code, ChevronUp, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type InputMode = 'text' | 'json';

interface ModeSelectorProps {
  currentMode: InputMode;
  onModeChange: (mode: InputMode) => void;
}

const modes = [
  {
    id: 'text',
    icon: <FileText className="h-4 w-4" />,
    iconBg: "bg-blue-100 dark:bg-blue-900",
    title: "Raw Text Chat Logs",
    description: "Paste copy-pasted logs from Slack, WhatsApp, etc.",
    value: 'text' as InputMode
  },
  {
    id: 'json',
    icon: <Code className="h-4 w-4" />,
    iconBg: "bg-purple-100 dark:bg-purple-900",
    title: "JSON Export",
    description: "Paste structured JSON data (e.g. from database export).",
    value: 'json' as InputMode
  },
]

export function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedMode = modes.find(m => m.value === currentMode) || modes[0];

  const handleSelect = (mode: InputMode, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling if we want, but here we probably want to close after select? 
    // Actually, let's just select and keep it the way the user interaction feels best. 
    // The original component toggles on main click. 
    onModeChange(mode);
    setIsOpen(false);
  };

  return (
    <div
      className={cn(
        "w-full max-w-lg rounded-2xl shadow-sm border border-border overflow-hidden cursor-pointer select-none",
        "bg-card text-card-foreground",
        "transition-all duration-500 ease-in-out",
        isOpen ? "rounded-3xl ring-2 ring-primary/20" : "rounded-2xl",
      )}
      onClick={() => setIsOpen(!isOpen)}
    >
      {/* Header */}
      <div className="flex items-center gap-4 p-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-300", selectedMode.iconBg)}>
          {selectedMode.icon}
        </div>
        <div className="flex-1 overflow-hidden">
          <h3 className="text-base font-semibold">
            {selectedMode.title}
          </h3>
          <p
            className={cn(
              "text-sm text-muted-foreground",
              "transition-all duration-500 ease-in-out",
              isOpen ? "opacity-0 max-h-0 mt-0" : "opacity-100 max-h-6 mt-0.5",
            )}
          >
            Click to change input format
          </p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center">
          <ChevronUp
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-500 ease-in-out",
              isOpen ? "rotate-0" : "rotate-180",
            )}
          />
        </div>
      </div>

      {/* Mode List */}
      <div
        className={cn(
          "grid",
          "transition-all duration-500 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="px-2 pb-4">
            <div className="space-y-1">
              {modes.map((mode, index) => (
                <div
                  key={mode.id}
                  onClick={(e) => handleSelect(mode.value, e)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl p-3 cursor-pointer",
                    "transition-all duration-500 ease-in-out",
                    "hover:bg-muted/50",
                    currentMode === mode.value && "bg-muted",
                    isOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                  )}
                  style={{
                    transitionDelay: isOpen ? `${index * 75}ms` : "0ms",
                  }}
                >
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300", mode.iconBg)}>
                    {mode.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold">{mode.title}</h4>
                    <p className="text-sm text-muted-foreground truncate">{mode.description}</p>
                  </div>
                  {currentMode === mode.value && (
                    <span className="text-primary shrink-0 pt-0.5">
                        <CheckCircle2 className="h-5 w-5" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
