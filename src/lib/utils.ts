import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Timezone utility functions
export function getCurrentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset();
}

export function formatDateInTimezone(date: Date, timezone?: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || getCurrentTimezone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

// Convert a local date to UTC
export function convertLocalToUTC(localDate: Date): Date {
  // Create a new date with the same local time but in UTC
  const utcTime = localDate.getTime() - localDate.getTimezoneOffset() * 60000;
  return new Date(utcTime);
}

// Convert a UTC date to local time
export function convertUTCToLocal(utcDate: Date): Date {
  // Create a new date with the same UTC time but displayed in local timezone
  const localTime = utcDate.getTime() + utcDate.getTimezoneOffset() * 60000;
  return new Date(localTime);
}

export function debugTimezoneInfo(date: Date): void {
  console.log('=== Timezone Debug Info ===');
  console.log('Original date:', date);
  console.log('ISO string:', date.toISOString());
  console.log('Local timezone:', getCurrentTimezone());
  console.log('Timezone offset (minutes):', getTimezoneOffset());
  console.log('Formatted in local timezone:', formatDateInTimezone(date));
  console.log('Formatted in UTC:', formatDateInTimezone(date, 'UTC'));
  console.log('==========================');
}
