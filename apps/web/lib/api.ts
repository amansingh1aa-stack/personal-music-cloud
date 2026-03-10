const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit, token?: string | null): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  login(password: string) {
    return request<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ password })
    });
  },
  getLibrary(token: string) {
    return request("/library", undefined, token);
  },
  importPlaylist(token: string, playlistUrl: string) {
    return request("/import/youtube", {
      method: "POST",
      body: JSON.stringify({ playlistUrl })
    }, token);
  },
  reorderPlaylist(token: string, playlistId: string, trackIds: string[]) {
    return request(`/playlists/${playlistId}/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ trackIds })
    }, token);
  },
  createPlaylist(token: string, name: string) {
    return request("/playlists", {
      method: "POST",
      body: JSON.stringify({ name, trackIds: [] })
    }, token);
  },
  lyricsMatch(token: string, artist: string, title: string) {
    const query = new URLSearchParams({ artist, title }).toString();
    return request(`/lyrics/match?${query}`, undefined, token);
  },
  saveLyrics(token: string, trackId: string, lyrics: string, source?: string) {
    return request("/lyrics/save", {
      method: "POST",
      body: JSON.stringify({ trackId, lyrics, source })
    }, token);
  }
};

export { API_BASE };