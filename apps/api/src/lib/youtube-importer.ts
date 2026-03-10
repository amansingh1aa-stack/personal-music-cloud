import fs from "node:fs/promises";
import path from "node:path";
import YTDlpWrap from "yt-dlp-wrap";
import { prisma } from "./prisma.js";
import { appStoragePath, coverStoragePath, env, musicLibraryPath } from "./env.js";
import { ensureStorage, safeSlug } from "./storage.js";

type PlaylistInfo = {
  title?: string;
  entries?: Array<{ id?: string; url?: string; title?: string }>;
};

type VideoInfo = {
  id?: string;
  title?: string;
  duration?: number;
  artist?: string;
  uploader?: string;
  album?: string;
  thumbnail?: string;
  webpage_url?: string;
};

export class YouTubeImporter {
  private readonly client: YTDlpWrap;

  constructor() {
    this.client = env.YTDLP_BINARY_PATH ? new YTDlpWrap(env.YTDLP_BINARY_PATH) : new YTDlpWrap();
  }

  async importPlaylist(sourceUrl: string) {
    await ensureStorage();

    const job = await prisma.importJob.create({
      data: {
        sourceUrl,
        status: "running"
      }
    });

    try {
      const rawPlaylist = await this.client.execPromise([
        "--flat-playlist",
        "--dump-single-json",
        sourceUrl,
        ...(env.YOUTUBE_COOKIES_PATH ? ["--cookies", env.YOUTUBE_COOKIES_PATH] : [])
      ]);
      const playlist = JSON.parse(rawPlaylist) as PlaylistInfo;
      const playlistName = playlist.title || "Imported Playlist";
      const persistedPlaylist = await prisma.playlist.upsert({
        where: { id: safeSlug(playlistName) },
        update: {},
        create: {
          id: safeSlug(playlistName),
          name: playlistName,
          description: `Imported from ${sourceUrl}`
        }
      }).catch(async () => {
        return prisma.playlist.findFirst({ where: { name: playlistName } }) ?? prisma.playlist.create({
          data: { name: playlistName, description: `Imported from ${sourceUrl}` }
        });
      });

      let imported = 0;
      let failed = 0;
      const tmpDir = path.join(appStoragePath, "tmp", job.id);
      await fs.mkdir(tmpDir, { recursive: true });

      for (const [index, entry] of (playlist.entries || []).entries()) {
        try {
          const videoUrl = entry.url?.startsWith("http") ? entry.url : `https://www.youtube.com/watch?v=${entry.id}`;
          const rawInfo = await this.client.execPromise([
            "--dump-single-json",
            videoUrl,
            ...(env.YOUTUBE_COOKIES_PATH ? ["--cookies", env.YOUTUBE_COOKIES_PATH] : [])
          ]);
          const info = JSON.parse(rawInfo) as VideoInfo;
          const baseName = `${safeSlug(info.artist || info.uploader || "artist")}-${safeSlug(info.title || entry.title || `track-${index + 1}`)}`;
          const outputTemplate = path.join(musicLibraryPath, `${baseName}.%(ext)s`);

          await this.client.execPromise([
            "-x",
            "--audio-format",
            "mp3",
            "--audio-quality",
            "0",
            "-o",
            outputTemplate,
            videoUrl,
            ...(env.YOUTUBE_COOKIES_PATH ? ["--cookies", env.YOUTUBE_COOKIES_PATH] : [])
          ]);

          const finalFilePath = path.join(musicLibraryPath, `${baseName}.mp3`);
          let coverPath: string | null = null;

          if (info.thumbnail) {
            const response = await fetch(info.thumbnail);
            if (response.ok) {
              const buffer = Buffer.from(await response.arrayBuffer());
              coverPath = path.join(coverStoragePath, `${baseName}.jpg`);
              await fs.writeFile(coverPath, buffer);
            }
          }

          const track = await prisma.track.upsert({
            where: { filePath: finalFilePath },
            update: {
              title: info.title || entry.title || "Unknown Title",
              artist: info.artist || info.uploader || "Unknown Artist",
              album: info.album || playlistName,
              duration: info.duration,
              coverPath,
              sourceUrl: info.webpage_url || videoUrl,
              youtubeId: info.id
            },
            create: {
              title: info.title || entry.title || "Unknown Title",
              artist: info.artist || info.uploader || "Unknown Artist",
              album: info.album || playlistName,
              duration: info.duration,
              filePath: finalFilePath,
              coverPath,
              sourceUrl: info.webpage_url || videoUrl,
              youtubeId: info.id
            }
          });

          await prisma.playlistTrack.upsert({
            where: {
              playlistId_trackId: {
                playlistId: persistedPlaylist.id,
                trackId: track.id
              }
            },
            update: { order: index },
            create: {
              playlistId: persistedPlaylist.id,
              trackId: track.id,
              order: index
            }
          });

          imported += 1;
        } catch {
          failed += 1;
        }
      }

      await prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: failed > 0 ? "completed_with_errors" : "completed",
          imported,
          failed,
          completedAt: new Date()
        }
      });

      return { jobId: job.id, imported, failed, playlistId: persistedPlaylist.id };
    } catch (error) {
      await prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          message: error instanceof Error ? error.message : "Unknown import error",
          completedAt: new Date()
        }
      });
      throw error;
    }
  }
}