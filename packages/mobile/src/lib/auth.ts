import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "elabs_access_token";
const REFRESH_KEY = "elabs_refresh_token";
const USER_KEY = "elabs_user";

let inMemoryToken: string | null = null;

export async function setAccessToken(token: string): Promise<void> {
  inMemoryToken = token;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export function getAccessToken(): string | null {
  return inMemoryToken;
}

export async function loadTokenFromStorage(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) inMemoryToken = token;
  return token;
}

export async function clearAccessToken(): Promise<void> {
  inMemoryToken = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export type User = {
  id: number;
  email: string;
  fullName: string;
  roles: string[];
};

export async function saveUser(user: User): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function loadUser(): Promise<User | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}