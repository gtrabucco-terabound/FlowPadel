"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
}

export function Tabs({
  tabs,
  value,
  onValueChange,
  className,
}: {
  tabs: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-1 rounded-2xl border border-border-soft bg-surface p-1 text-sm font-medium",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(tab.value)}
            className={cn(
              "flex-1 rounded-xl px-3 py-2 transition-colors",
              active
                ? "bg-accent text-accent-ink"
                : "text-muted hover:bg-surface-2 hover:text-ink"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
