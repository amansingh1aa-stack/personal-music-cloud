import { env } from "./env.js";
import { scoreMatch } from "./matching.js";

type LrcLibResult = {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  plainLyrics?: string;
  syncedLyrics?: string;
};

export async function findLyricsMatch(artist: string, title: string) {
  const url = new URL(`${env.LRCLIB_API_BASE}/search`);
  url.searchParams.set("artist_name", artist);
  url.searchParams.set("track_name", title);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`LRCLIB request failed with ${response.status}`);
  }

  const results = (await response.json()) as LrcLibResult[];
  const ranked = results
    .map((item) => ({
      item,
      score: scoreMatch(`${item.artistName} ${item.trackName}`, `${artist} ${title}`)
    }))
    .sort((left, right) => right.score - left.score);

  return {
    best: ranked[0]?.item ?? null,
    candidates: ranked.slice(0, 5).map(({ item, score }) => ({ ...item, score }))
  };
}

export async function persistLyrics(trackId: string, lyrics: string, source = "LRCLIB") {
  const { prisma } = await import("./prisma.js");
  return prisma.track.update({
    where: { id: trackId },
    data: {
      lyrics,
      lyricsSource: source
    }
  });
}