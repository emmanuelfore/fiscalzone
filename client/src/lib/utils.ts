import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && 
    window.navigator.userAgent.toLowerCase().indexOf(' electron/') > -1;
}
