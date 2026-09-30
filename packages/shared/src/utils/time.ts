export function isoNow(): string {
  return new Date().toISOString();
}

export function toUnixMs(date: Date): number {
  return date.getTime();
}