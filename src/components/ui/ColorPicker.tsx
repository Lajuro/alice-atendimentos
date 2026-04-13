"use client";

import { useState } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import * as Popover from "@radix-ui/react-popover";

const PRESET_COLORS = [
  "#BE0380",
  "#e11d48",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
  "#141414",
  "#ffffff",
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export function ColorPicker({ value, onChange, className = "", size = "md" }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const sizeClass = size === "sm" ? "w-8 h-8 rounded" : "w-10 h-10 rounded-lg";

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`${sizeClass} border-2 border-transparent hover:border-alice-primary focus:outline-none focus:border-alice-primary focus:ring-2 focus:ring-alice-primary/20 transition-all shrink-0 shadow-sm ${className}`}
          style={{ backgroundColor: value }}
          aria-label={`Cor atual: ${value}. Clique para alterar.`}
        />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-[200] rounded-2xl border border-alice-gray-200 bg-card shadow-2xl p-3 space-y-3"
          sideOffset={6}
          align="start"
          avoidCollisions
        >
          {/* Color wheel */}
          <HexColorPicker
            color={value}
            onChange={onChange}
            style={{ width: "100%", height: "160px" }}
          />

          {/* Hex input */}
          <div className="flex items-center gap-1.5 border border-alice-gray-200 rounded-lg px-2.5 py-1.5 focus-within:border-alice-primary focus-within:ring-1 focus-within:ring-alice-primary transition-colors">
            <span className="text-xs text-alice-gray-400 font-mono select-none">#</span>
            <HexColorInput
              color={value}
              onChange={onChange}
              className="flex-1 text-sm font-mono bg-transparent focus:outline-none text-foreground uppercase"
              prefixed={false}
            />
            <div
              className="w-5 h-5 rounded shrink-0"
              style={{ backgroundColor: value }}
            />
          </div>

          {/* Preset swatches */}
          <div className="grid grid-cols-6 gap-1.5">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onChange(color)}
                className="w-8 h-8 rounded-md border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-alice-primary/40"
                style={{
                  backgroundColor: color,
                  borderColor:
                    value.toLowerCase() === color.toLowerCase()
                      ? "var(--alice-primary)"
                      : "transparent",
                  boxShadow: "0 1px 3px rgba(0,0,0,.15)",
                }}
                aria-label={`Selecionar cor ${color}`}
              />
            ))}
          </div>
          <Popover.Arrow className="fill-alice-gray-200" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
