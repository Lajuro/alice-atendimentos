"use client";

import { useState } from "react";
import { DayPicker } from "react-day-picker";
import * as Popover from "@radix-ui/react-popover";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, X } from "lucide-react";
import "react-day-picker/style.css";

interface DatePickerInputProps {
  value: string; // "yyyy-MM-dd"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = "Selecionar data",
  className = "",
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false);

  const selectedDate = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
  const isValidDate = selectedDate !== undefined && isValid(selectedDate);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-alice-gray-200 bg-card text-sm w-full focus:outline-none focus:border-alice-primary focus:ring-1 focus:ring-alice-primary hover:border-alice-gray-300 transition-colors ${
            !value ? "text-alice-gray-400" : "text-foreground"
          } ${className}`}
        >
          <Calendar className="w-4 h-4 text-alice-gray-400 shrink-0" />
          <span className="flex-1 text-left">
            {isValidDate ? format(selectedDate!, "dd/MM/yyyy") : placeholder}
          </span>
          {value && (
            <span
              role="button"
              aria-label="Remover data"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange("");
                }
              }}
              className="text-alice-gray-300 hover:text-alice-gray-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-[200] rounded-2xl border border-alice-gray-200 bg-card shadow-2xl p-2"
          sideOffset={6}
          align="start"
          avoidCollisions
        >
          <DayPicker
            mode="single"
            selected={isValidDate ? selectedDate : undefined}
            onSelect={(date) => {
              if (date) {
                onChange(format(date, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
            locale={ptBR}
            weekStartsOn={0}
            style={
              {
                "--rdp-accent-color": "var(--alice-primary)",
                "--rdp-accent-background-color": "color-mix(in srgb, var(--alice-primary) 12%, transparent)",
                "--rdp-day-height": "36px",
                "--rdp-day-width": "36px",
                "--rdp-day_button-height": "34px",
                "--rdp-day_button-width": "34px",
                "--rdp-day_button-border-radius": "8px",
                "--rdp-today-color": "var(--alice-primary)",
              } as React.CSSProperties
            }
          />
          <Popover.Arrow className="fill-alice-gray-200" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
