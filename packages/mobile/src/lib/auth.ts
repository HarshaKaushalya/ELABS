let inMemoryToken: string | null = null;

export function setAccessToken(token: string): void {
  inMemoryToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryToken;
}

export function clearAccessToken(): void {
  inMemoryToken = null;
}