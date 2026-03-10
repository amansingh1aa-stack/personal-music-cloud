export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  duration: number | null;
  audioUrl: string;
  coverUrl: string | null;
  sourceUrl: string | null;
  lyrics: string | null;
  lyricsSource: string | null;
  createdAt: string | Date;
  order?: number;
};

export type Playlist = {
  id: string;
  name: string;
  description: string | null;
  trackCount?: number;
  tracks: Track[];
};

export type ImportJob = {
  id: string;
  sourceUrl: string;
  status: string;
  message?: string | null;
  imported: number;
  failed: number;
  startedAt: string | Date;
  completedAt?: string | null | Date;
};

export type LibraryPayload = {
  recentTracks: Track[];
  playlists: Playlist[];
  importJobs: ImportJob[];
};

export type LyricsCandidate = {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  plainLyrics?: string;
  syncedLyrics?: string;
  score: number;
};

export type LoginResponse = {
  token: string;
};

export function formatDuration(duration?: number | null) {
  if (!duration && duration !== 0) {
    return "--:--";
  }

  const minutes = Math.floor(duration / 60);
  const seconds = `${duration % 60}`.padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function summarizeLibrary(payload: LibraryPayload) {
  const totalTracks = payload.playlists.reduce((count, playlist) => count + playlist.tracks.length, 0);
  return {
    playlistCount: payload.playlists.length,
    recentTrackCount: payload.recentTracks.length,
    totalTracks,
    importCount: payload.importJobs.length
  };
}