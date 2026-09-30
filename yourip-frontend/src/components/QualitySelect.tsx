"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

interface Option { value: string; label: string; detail: string }

export default function QualitySelect({ id, label, value, onChange, options }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{label}</label>
      <Select.Root value={value} onValueChange={onChange}>
        <Select.Trigger id={id} aria-label={label} className="flex h-11 w-full items-center justify-between rounded-xl border border-white/10 bg-[#18181b] px-3.5 text-left text-sm text-zinc-100 outline-none transition-colors hover:border-white/20 focus-visible:ring-2 focus-visible:ring-[var(--accent)] data-[state=open]:border-[var(--accent)]">
          <Select.Value />
          <Select.Icon><ChevronDown aria-hidden size={16} strokeWidth={1.8} className="text-zinc-400" /></Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content position="popper" sideOffset={6} className="z-[80] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-white/10 bg-[#202023] p-1 shadow-2xl shadow-black/60">
            <Select.Viewport>
              {options.map(option => (
                <Select.Item key={option.value} value={option.value} className="relative flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 pr-9 text-sm text-zinc-100 outline-none data-[highlighted]:bg-white/10">
                  <span className="flex flex-1 flex-col">
                    <Select.ItemText>{option.label}</Select.ItemText>
                    <span className="text-xs text-zinc-400">{option.detail}</span>
                  </span>
                  <Select.ItemIndicator className="absolute right-3 text-[var(--accent)]"><Check aria-hidden size={16} strokeWidth={1.9} /></Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
