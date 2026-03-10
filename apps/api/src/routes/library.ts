import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { toPublicCoverPath, toPublicMusicPath } from "../lib/storage.js";

const createPlaylistSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  trackIds: z.array(z.string()).default([])
});

const addTracksSchema = z.object({
  trackIds: z.array(z.string()).min(1)
});

const reorderSchema = z.object({
  trackIds: z.array(z.string()).min(1)
});

function mapTrack(track: {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  duration: number | null;
  filePath: string;
  coverPath: string | null;
  sourceUrl: string | null;
  lyrics: string | null;
  lyricsSource: string | null;
  createdAt: Date;
}) {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    duration: track.duration,
    audioUrl: toPublicMusicPath(track.filePath),
    coverUrl: toPublicCoverPath(track.coverPath),
    sourceUrl: track.sourceUrl,
    lyrics: track.lyrics,
    lyricsSource: track.lyricsSource,
    createdAt: track.createdAt
  };
}

export async function libraryRoutes(app: FastifyInstance) {
  app.get("/library", { preHandler: authenticate }, async () => {
    const [tracks, playlists, importJobs] = await Promise.all([
      prisma.track.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
      prisma.playlist.findMany({
        include: {
          tracks: {
            orderBy: { order: "asc" },
            include: { track: true }
          }
        },
        orderBy: { updatedAt: "desc" }
      }),
      prisma.importJob.findMany({ orderBy: { startedAt: "desc" }, take: 10 })
    ]);

    return {
      recentTracks: tracks.map(mapTrack),
      playlists: playlists.map((playlist) => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        trackCount: playlist.tracks.length,
        tracks: playlist.tracks.map((item) => ({
          id: item.track.id,
          order: item.order,
          ...mapTrack(item.track)
        }))
      })),
      importJobs
    };
  });

  app.get("/tracks", { preHandler: authenticate }, async () => {
    const tracks = await prisma.track.findMany({ orderBy: { createdAt: "desc" } });
    return { tracks: tracks.map(mapTrack) };
  });

  app.post("/playlists", { preHandler: authenticate }, async (request) => {
    const { name, description, trackIds } = createPlaylistSchema.parse(request.body);
    const playlist = await prisma.playlist.create({
      data: {
        name,
        description,
        tracks: {
          create: trackIds.map((trackId, index) => ({
            trackId,
            order: index
          }))
        }
      },
      include: {
        tracks: {
          orderBy: { order: "asc" },
          include: { track: true }
        }
      }
    });

    return {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      tracks: playlist.tracks.map((item) => ({ id: item.track.id, order: item.order, ...mapTrack(item.track) }))
    };
  });

  app.post("/playlists/:id/tracks", { preHandler: authenticate }, async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const { trackIds } = addTracksSchema.parse(request.body);
    const count = await prisma.playlistTrack.count({ where: { playlistId: params.id } });

    await prisma.$transaction(
      trackIds.map((trackId, index) =>
        prisma.playlistTrack.upsert({
          where: {
            playlistId_trackId: {
              playlistId: params.id,
              trackId
            }
          },
          update: { order: count + index },
          create: {
            playlistId: params.id,
            trackId,
            order: count + index
          }
        })
      )
    );

    return { ok: true };
  });

  app.patch("/playlists/:id/reorder", { preHandler: authenticate }, async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const { trackIds } = reorderSchema.parse(request.body);

    await prisma.$transaction(
      trackIds.map((trackId, index) =>
        prisma.playlistTrack.update({
          where: {
            playlistId_trackId: {
              playlistId: params.id,
              trackId
            }
          },
          data: { order: index }
        })
      )
    );

    const playlist = await prisma.playlist.findUniqueOrThrow({
      where: { id: params.id },
      include: {
        tracks: {
          orderBy: { order: "asc" },
          include: { track: true }
        }
      }
    });

    return {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      tracks: playlist.tracks.map((item) => ({ id: item.track.id, order: item.order, ...mapTrack(item.track) }))
    };
  });
}