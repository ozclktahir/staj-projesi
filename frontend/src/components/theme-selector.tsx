"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const themes = [
  {
    value: "light" as const,
    label: "Açık Mod",
    description: "Beyaz arka plan, turuncu ve mavi vurgular",
    icon: Sun,
  },
  {
    value: "dark" as const,
    label: "Koyu Mod",
    description: "Koyu arka plan, turuncu vurgu",
    icon: Moon,
  },
  {
    value: "system" as const,
    label: "Sistem Teması",
    description: "Cihaz / tarayıcı tercihine uyum",
    icon: Monitor,
  },
];

function applyHtmlThemeClass(next: "light" | "dark" | "system") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");

  if (next === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.add(prefersDark ? "dark" : "light");
  } else {
    root.classList.add(next);
  }

  console.info("[ThemeSelector] html.className =", root.className);
}

export function ThemeSelector() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {themes.map((item) => (
          <div
            key={item.value}
            className="h-[108px] animate-pulse rounded-lg border border-border bg-muted/50"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {themes.map(({ value, label, description, icon: Icon }) => {
        const selected = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => {
              setTheme(value);
              applyHtmlThemeClass(value);
            }}
            className={cn(
              "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
              selected
                ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                : "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
            )}
            aria-pressed={selected}
          >
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-md",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="text-sm font-semibold text-foreground">
              {label}
            </span>
            <span className="text-xs text-muted-foreground">{description}</span>
            {value !== "system" && resolvedTheme === value ? (
              <span className="text-[10px] font-medium uppercase tracking-wide text-primary">
                Aktif
              </span>
            ) : null}
            {value === "system" && selected ? (
              <span className="text-[10px] font-medium uppercase tracking-wide text-primary">
                Şu an: {resolvedTheme === "dark" ? "Koyu" : "Açık"}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
