"use client";

import { Minus, Plus } from "lucide-react";

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  id?: string;
}

/**
 * Number input with +/− stepper buttons — replaces `<input type="number">`.
 * Hides the native spinner and provides accessible, styled increment/decrement controls.
 */
export function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  className = "",
  id,
}: NumberInputProps) {
  const decrement = () => onChange(Math.max(min, value - step));
  const increment = () => {
    const next = value + step;
    onChange(max !== undefined ? Math.min(max, next) : next);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") return;
    const n = Number(raw);
    if (isNaN(n)) return;
    const clamped = max !== undefined ? Math.min(max, Math.max(min, n)) : Math.max(min, n);
    onChange(clamped);
  };

  return (
    <div
      className={`flex items-center border border-alice-gray-200 rounded-lg overflow-hidden bg-card focus-within:border-alice-primary focus-within:ring-1 focus-within:ring-alice-primary transition-colors ${className}`}
    >
      <button
        type="button"
        onClick={decrement}
        disabled={value <= min}
        aria-label="Diminuir"
        className="px-3 py-2.5 text-alice-gray-400 hover:text-foreground hover:bg-alice-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-alice-gray-200 shrink-0"
      >
        <Minus className="w-4 h-4" />
      </button>

      <input
        id={id}
        type="number"
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        className="flex-1 text-center text-sm font-medium bg-transparent focus:outline-none text-foreground py-2.5 px-2 min-w-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <button
        type="button"
        onClick={increment}
        disabled={max !== undefined && value >= max}
        aria-label="Aumentar"
        className="px-3 py-2.5 text-alice-gray-400 hover:text-foreground hover:bg-alice-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-l border-alice-gray-200 shrink-0"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
