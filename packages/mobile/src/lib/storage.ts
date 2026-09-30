const storage = new Map<string, string>();

export async function setItem(key: string, value: string): Promise<void> {
  storage.set(key, value);
}

export async function getItem(key: string): Promise<string | null> {
  return storage.get(key) ?? null;
}

export async function removeItem(key: string): Promise<void> {
  storage.delete(key);
}