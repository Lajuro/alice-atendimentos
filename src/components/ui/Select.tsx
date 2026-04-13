"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  id?: string;
}

export function Select({ value, onChange, options, placeholder, className = "", id }: SelectProps) {
  return (
    <RadixSelect.Root value={value} onValueChange={onChange}>
      <RadixSelect.Trigger
        id={id}
        className={`inline-flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg border border-alice-gray-200 bg-card text-sm text-foreground focus:outline-none focus:border-alice-primary focus:ring-1 focus:ring-alice-primary hover:border-alice-gray-300 transition-colors data-[placeholder]:text-alice-gray-400 ${className}`}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon asChild>
          <ChevronDown className="w-4 h-4 text-alice-gray-400 shrink-0" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          className="z-[200] overflow-hidden rounded-xl border border-alice-gray-200 bg-card shadow-xl"
          position="popper"
          sideOffset={4}
          style={{ width: "var(--radix-select-trigger-width)", maxHeight: "min(var(--radix-select-content-available-height), 260px)" }}
        >
          <RadixSelect.ScrollUpButton className="flex items-center justify-center h-6 text-alice-gray-400 cursor-default">
            <ChevronUp className="w-4 h-4" />
          </RadixSelect.ScrollUpButton>
          <RadixSelect.Viewport className="p-1">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className="relative flex items-center gap-2 pl-3 pr-8 py-2.5 text-sm rounded-lg cursor-default select-none outline-none text-foreground data-[highlighted]:bg-alice-gray-50 data-[state=checked]:text-alice-primary data-[state=checked]:font-medium transition-colors"
              >
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="absolute right-2.5">
                  <Check className="w-3.5 h-3.5" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
          <RadixSelect.ScrollDownButton className="flex items-center justify-center h-6 text-alice-gray-400 cursor-default">
            <ChevronDown className="w-4 h-4" />
          </RadixSelect.ScrollDownButton>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
