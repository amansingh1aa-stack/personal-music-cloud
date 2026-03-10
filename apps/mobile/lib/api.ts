import * as SecureStore from "expo-secure-store";
import type { LibraryPayload, LoginResponse, LyricsCandidate } from "@music-cloud/shared";

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.1.2:4000";
const TOKEN_KEY = "music-cloud-token";

async function request<T>(path: string, init?: RequestInit, token?: string | null) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {})
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const mobileApi = {
  login(password: string) {
    return request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ password })
    });
  },
  library(token: string) {
    return request<LibraryPayload>("/library", undefined, token);
  },
  lyrics(token: string, artist: string, title: string) {
    const query = new URLSearchParams({ artist, title }).toString();
    return request<{ best: LyricsCandidate | null; candidates: LyricsCandidate[] }>(`/lyrics/match?${query}`, undefined, token);
  },
  importPlaylist(token: string, playlistUrl: string) {
    return request("/import/youtube", {
      method: "POST",
      body: JSON.stringify({ playlistUrl })
    }, token);
  }
};

export const tokenStore = {
  get() {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  set(token: string) {
    return SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  clear() {
    return SecureStore.deleteItemAsync(TOKEN_KEY);
  }
};