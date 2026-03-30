import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && 
    window.navigator.userAgent.toLowerCase().indexOf(' electron/') > -1;
}
export function hexToHSL(hex: string) {
  // Remove the hash if it exists
  hex = hex.replace(/^#/, "");

  // Parse r, g, b
  let r = 0, g = 0, b = 0;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16) / 255;
    g = parseInt(hex[1] + hex[1], 16) / 255;
    b = parseInt(hex[2] + hex[2], 16) / 255;
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
  } else {
    return null;
  }

  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function applyTheme(primaryColorHex: string) {
  const hsl = hexToHSL(primaryColorHex);
  if (!hsl) return;

  const root = document.documentElement;
  const primary = `${hsl.h} ${hsl.s}% ${hsl.l}%`;
  
  // Choose white or dark text for foreground based on lightness
  const primaryForeground = hsl.l > 65 ? "222 47% 11%" : "0 0% 100%";
  
  // Background-ish version for accents
  const lightAccent = `${hsl.h} ${hsl.s}% 96%`;
  
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-foreground", primaryForeground);
  root.style.setProperty("--ring", primary);
  root.style.setProperty("--accent", lightAccent);
  root.style.setProperty("--accent-foreground", primary);
  
  // Also update selection color indirectly if possible or just stick to those
}
