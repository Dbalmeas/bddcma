"use client"

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Logo } from "./logo";
import { Settings, Sun, Moon } from "lucide-react";
import { Switch } from "./ui/switch";

export const Header = () => {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/50 shadow-sm">
      <div className="flex items-center justify-between px-4 md:px-6 lg:px-8 py-3 md:py-4">
        {/* Logo à gauche - reste fixe en haut */}
        <Link href="/" className="flex items-center transition-opacity hover:opacity-80" style={{ backgroundColor: 'transparent' }}>
          <Logo className={isDark ? "w-[240px] md:w-[280px]" : "w-[130px] md:w-[160px]"} />
        </Link>

        {/* Contrôles à droite */}
        <div className="flex items-center gap-3">
          {mounted && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background/70">
              <Sun className="h-4 w-4" />
              <Switch
                checked={isDark}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                aria-label="Basculer thème clair/sombre"
              />
              <Moon className="h-4 w-4" />
            </div>
          )}
          <button
            type="button"
            aria-label="Settings"
            className="inline-flex items-center justify-center h-9 w-9 border border-border rounded-full bg-background/80 text-foreground hover:bg-foreground/5"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
