"use client";

import { Clock } from "lucide-react";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
}

/**
 * Styled time input — replaces the native `<input type="time">` with a consistent,
 * accessible design that hides the browser default clock/spinner chrome.
 */
export function TimeInput({ value, onChange, className = "", id }: TimeInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-alice-gray-400 pointer-events-none z-10" />
      <input
        id={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-alice-gray-200 bg-card text-sm text-foreground focus:outline-none focus:border-alice-primary focus:ring-1 focus:ring-alice-primary transition-colors time-input"
      />
    </div>
  );
}

/** Compact variant for inline use (e.g. inside flex rows with small text) */
export function TimeInputSm({ value, onChange, className = "", id }: TimeInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-alice-gray-400 pointer-events-none z-10" />
      <input
        id={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-8 pr-2 py-1 rounded-md border border-alice-gray-200 bg-card text-xs text-foreground focus:outline-none focus:border-alice-primary focus:ring-1 focus:ring-alice-primary transition-colors time-input"
      />
    </div>
  );
}
