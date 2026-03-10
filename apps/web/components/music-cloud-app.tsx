"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  ArrowRight,
  BarChart3,
  Database,
  Disc3,
  Download,
  Expand,
  FolderKanban,
  Library,
  ListMusic,
  LockKeyhole,
  Mic2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Smartphone,
  Waves
} from "lucide-react";
import { api, API_BASE } from "../lib/api";
import { formatDuration, summarizeLibrary, type ImportJob, type LibraryPayload, type LyricsCandidate, type Track } from "../lib/types";
import { SortableTrackRow } from "./sortable-track-row";

const TOKEN_KEY = "music-cloud-token";

type Tab = "overview" | "operations" | "playlists" | "player";

const tabs: Array<{ id: Tab; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "operations", label: "Operations", icon: FolderKanban },
  { id: "playlists", label: "Playlists", icon: ListMusic },
  { id: "player", label: "Player", icon: Disc3 }
];

export function MusicCloudApp() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [library, setLibrary] = useState<LibraryPayload | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fullPlayer, setFullPlayer] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [lyricsCandidates, setLyricsCandidates] = useState<LyricsCandidate[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  useEffect(() => {
    const saved = window.localStorage.getItem(TOKEN_KEY);
    if (saved) {
      setToken(saved);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    loadLibrary(token).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load library");
      window.localStorage.removeItem(TOKEN_KEY);
      setToken(null);
    });
  }, [token]);

  useEffect(() => {
    if (!currentTrack || !audioRef.current) {
      return;
    }

    audioRef.current.src = `${API_BASE}${currentTrack.audioUrl}`;
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [currentTrack]);

  const selectedPlaylist = useMemo(() => {
    if (!library?.playlists.length) {
      return null;
    }

    return library.playlists.find((playlist) => playlist.id === selectedPlaylistId) || library.playlists[0];
  }, [library, selectedPlaylistId]);

  const stats = library ? summarizeLibrary(library) : null;

  async function loadLibrary(activeToken: string) {
    const payload = (await api.getLibrary(activeToken)) as LibraryPayload;
    setLibrary(payload);
    setSelectedPlaylistId((current) => current || payload.playlists[0]?.id || null);
    if (!currentTrack) {
      setCurrentTrack(payload.recentTracks[0] || payload.playlists[0]?.tracks[0] || null);
    }
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setBusy("login");
    setError(null);

    try {
      const result = await api.login(password);
      window.localStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
      setPassword("");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in");
    } finally {
      setBusy(null);
    }
  }

  async function handleImport() {
    if (!token || !playlistUrl) {
      return;
    }

    setBusy("import");
    setError(null);

    try {
      await api.importPlaylist(token, playlistUrl);
      setPlaylistUrl("");
      await loadLibrary(token);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleCreatePlaylist() {
    if (!token || !newPlaylistName) {
      return;
    }

    setBusy("playlist");
    try {
      await api.createPlaylist(token, newPlaylistName);
      setNewPlaylistName("");
      await loadLibrary(token);
      setActiveTab("playlists");
    } catch (playlistError) {
      setError(playlistError instanceof Error ? playlistError.message : "Could not create playlist");
    } finally {
      setBusy(null);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    if (!token || !selectedPlaylist || !event.over || event.active.id === event.over.id) {
      return;
    }

    const currentIndex = selectedPlaylist.tracks.findIndex((track) => track.id === event.active.id);
    const nextIndex = selectedPlaylist.tracks.findIndex((track) => track.id === event.over.id);
    const reordered = arrayMove(selectedPlaylist.tracks, currentIndex, nextIndex);

    setLibrary((current) =>
      current
        ? {
            ...current,
            playlists: current.playlists.map((playlist) =>
              playlist.id === selectedPlaylist.id ? { ...playlist, tracks: reordered } : playlist
            )
          }
        : current
    );

    try {
      await api.reorderPlaylist(token, selectedPlaylist.id, reordered.map((track) => track.id));
      await loadLibrary(token);
    } catch (reorderError) {
      setError(reorderError instanceof Error ? reorderError.message : "Could not reorder playlist");
    }
  }

  async function handleFindLyrics(track: Track) {
    if (!token) {
      return;
    }

    setBusy("lyrics");
    try {
      const result = (await api.lyricsMatch(token, track.artist, track.title)) as {
        best: (LyricsCandidate & { plainLyrics?: string }) | null;
        candidates: LyricsCandidate[];
      };
      setLyricsCandidates(result.candidates);
      if (result.best?.plainLyrics) {
        await api.saveLyrics(token, track.id, result.best.plainLyrics, "LRCLIB");
        await loadLibrary(token);
      }
    } catch (lyricsError) {
      setError(lyricsError instanceof Error ? lyricsError.message : "Lyrics lookup failed");
    } finally {
      setBusy(null);
    }
  }

  function togglePlayback() {
    if (!audioRef.current) {
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <section className="w-full max-w-md rounded-[32px] border border-white/10 bg-panel/80 p-8 shadow-glow backdrop-blur-xl">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-canvas">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-accentSoft">Web ERP + Android Cloud</p>
              <h1 className="text-3xl font-extrabold">Open your music stack.</h1>
            </div>
          </div>
          <form className="space-y-4" onSubmit={handleLogin}>
            <label className="block space-y-2">
              <span className="text-sm text-muted">Master Password</span>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <LockKeyhole className="h-5 w-5 text-accent" />
                <input className="w-full bg-transparent text-sm" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your personal access key" />
              </div>
            </label>
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 font-bold text-canvas transition hover:bg-accentSoft" type="submit" disabled={busy === "login"}>
              <ArrowRight className="h-4 w-4" />
              {busy === "login" ? "Unlocking..." : "Unlock Dashboard"}
            </button>
          </form>
          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-6">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
      <div className="mb-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <section className="rounded-[28px] border border-white/10 bg-panel/80 p-5 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.32em] text-accentSoft">Workspace</p>
          <h1 className="mt-3 text-3xl font-black">Personal Music Cloud</h1>
          <p className="mt-3 text-sm leading-6 text-muted">A GitHub-ready personal streaming stack with web ERP controls, Android playback, local storage, and YouTube import automation.</p>
          <div className="mt-6 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    activeTab === tab.id ? "border-accent/60 bg-accent/10 text-text" : "border-white/5 bg-white/5 text-muted hover:border-white/10"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-muted">
            <div className="flex items-center gap-2 text-text">
              <Smartphone className="h-4 w-4 text-accent" />
              Android companion ready
            </div>
            <p className="mt-2">Expo mobile app lives in `apps/mobile` and uses the same master-password API flow.</p>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-panelAlt/75 p-5 backdrop-blur-xl">
          {activeTab === "overview" ? (
            <div>
              <div className="grid gap-4 md:grid-cols-4">
                <MetricCard label="Playlists" value={String(stats?.playlistCount ?? 0)} icon={<ListMusic className="h-5 w-5" />} />
                <MetricCard label="Tracked Songs" value={String(stats?.totalTracks ?? 0)} icon={<Disc3 className="h-5 w-5" />} />
                <MetricCard label="Import Jobs" value={String(stats?.importCount ?? 0)} icon={<Download className="h-5 w-5" />} />
                <MetricCard label="Recent Tracks" value={String(stats?.recentTrackCount ?? 0)} icon={<Library className="h-5 w-5" />} />
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <Panel title="System Architecture" icon={<Database className="h-4 w-4 text-accent" />}>
                  <ul className="space-y-3 text-sm text-muted">
                    <li>Next.js 15 web dashboard for admin workflows and desktop playback</li>
                    <li>Fastify API with Prisma + SQLite for portable metadata and auth</li>
                    <li>Local `/music` storage for audio and local API streaming</li>
                    <li>Expo Android app for personal mobile listening and import control</li>
                  </ul>
                </Panel>
                <Panel title="Latest Imports" icon={<Download className="h-4 w-4 text-accent" />}>
                  <div className="space-y-3 text-sm text-muted">
                    {library?.importJobs.length ? library.importJobs.map((job: ImportJob) => (
                      <div key={job.id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <p className="truncate text-text">{job.sourceUrl}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.25em] text-accentSoft">{job.status}</p>
                      </div>
                    )) : <p>No import jobs yet.</p>}
                  </div>
                </Panel>
              </div>
            </div>
          ) : null}

          {activeTab === "operations" ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <Panel title="YouTube Importer" icon={<Download className="h-4 w-4 text-accent" />}>
                <p className="text-sm text-muted">Paste a playlist URL and let `yt-dlp` extract audio, thumbnails, and metadata into your local library.</p>
                <input className="mt-4 w-full rounded-2xl border border-white/10 bg-canvas/70 px-4 py-3 text-sm" value={playlistUrl} onChange={(event) => setPlaylistUrl(event.target.value)} placeholder="https://www.youtube.com/playlist?list=..." />
                <button className="mt-3 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-bold text-canvas transition hover:bg-accentSoft" type="button" onClick={handleImport} disabled={busy === "import"}>
                  {busy === "import" ? "Importing..." : "Run Import"}
                </button>
              </Panel>
              <Panel title="Playlist Provisioning" icon={<Plus className="h-4 w-4 text-accent" />}>
                <p className="text-sm text-muted">Create curated listening spaces for desktop and Android playback.</p>
                <input className="mt-4 w-full rounded-2xl border border-white/10 bg-canvas/70 px-4 py-3 text-sm" value={newPlaylistName} onChange={(event) => setNewPlaylistName(event.target.value)} placeholder="Sunday Vinyl Stack" />
                <button className="mt-3 w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold transition hover:border-accent hover:text-accent" type="button" onClick={handleCreatePlaylist} disabled={busy === "playlist"}>
                  {busy === "playlist" ? "Creating..." : "Create Playlist"}
                </button>
              </Panel>
            </div>
          ) : null}

          {activeTab === "playlists" ? (
            <div>
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-accentSoft">Drag to reorder</p>
                  <h2 className="mt-2 text-3xl font-extrabold">{selectedPlaylist?.name || "Your queue"}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted">Use the ERP view to manage listening order, then stream the same result on web and Android.</p>
                </div>
                <button className="rounded-full border border-white/10 p-2 text-muted transition hover:border-accent hover:text-accent" type="button" onClick={() => token && loadLibrary(token)}>
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-5 grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
                <div className="space-y-3">
                  {library?.playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      type="button"
                      onClick={() => setSelectedPlaylistId(playlist.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        selectedPlaylist?.id === playlist.id ? "border-accent/60 bg-accent/10" : "border-white/5 bg-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span>
                          <span className="block font-semibold text-text">{playlist.name}</span>
                          <span className="block text-xs text-muted">{playlist.tracks.length} tracks</span>
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted" />
                      </div>
                    </button>
                  ))}
                </div>
                <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
                  {selectedPlaylist ? (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={selectedPlaylist.tracks.map((track) => track.id)} strategy={verticalListSortingStrategy}>
                        {selectedPlaylist.tracks.map((track) => (
                          <SortableTrackRow key={track.id} track={track} active={currentTrack?.id === track.id} onClick={() => { setCurrentTrack(track); setActiveTab("player"); }} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-muted">Import or create a playlist to begin.</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "player" ? (
            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[28px] border border-white/10 bg-panel/80 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-accentSoft">Now Playing</p>
                    <h2 className="mt-2 text-2xl font-extrabold">Premium Player</h2>
                  </div>
                  <button className="rounded-full border border-white/10 p-2 text-muted transition hover:border-accent hover:text-accent" type="button" onClick={() => setFullPlayer(true)}>
                    <Expand className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-accent/20 via-white/5 to-transparent p-5">
                  <div className="aspect-square rounded-[24px] bg-black/30 p-3">
                    {currentTrack?.coverUrl ? <img alt={currentTrack.title} src={`${API_BASE}${currentTrack.coverUrl}`} className="h-full w-full rounded-[20px] object-cover" /> : <div className="flex h-full w-full items-center justify-center rounded-[20px] bg-canvas/80 text-accent"><Disc3 className="h-20 w-20" /></div>}
                  </div>
                  <div className="mt-5">
                    <h3 className="text-2xl font-extrabold">{currentTrack?.title || "Pick a track"}</h3>
                    <p className="mt-2 text-sm text-muted">{currentTrack ? `${currentTrack.artist}${currentTrack.album ? ` • ${currentTrack.album}` : ""}` : "Choose a track from your ERP queue."}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.25em] text-accentSoft">{currentTrack ? formatDuration(currentTrack.duration) : "--:--"}</p>
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    <button className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-canvas transition hover:bg-accentSoft" type="button" onClick={togglePlayback}>
                      {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current" />}
                    </button>
                    <button className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold transition hover:border-accent hover:text-accent" type="button" onClick={() => currentTrack && handleFindLyrics(currentTrack)} disabled={!currentTrack || busy === "lyrics"}>
                      <span className="flex items-center gap-2">
                        <Mic2 className="h-4 w-4" />
                        {busy === "lyrics" ? "Finding lyrics..." : "Likely Matches"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <Panel title="Lyrics Intelligence" icon={<Sparkles className="h-4 w-4 text-accent" />}>
                  {currentTrack?.lyrics ? <p className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-muted">{currentTrack.lyrics}</p> : <p className="text-sm text-muted">Use Likely Matches to query LRCLIB and save the best lyrical match to your library.</p>}
                  <div className="mt-4 space-y-3">
                    {lyricsCandidates.map((candidate) => (
                      <div key={candidate.id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-text">{candidate.trackName}</p>
                            <p className="text-xs text-muted">{candidate.artistName}{candidate.albumName ? ` • ${candidate.albumName}` : ""}</p>
                          </div>
                          <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accentSoft">{(candidate.score * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel title="Recent Tracks" icon={<Waves className="h-4 w-4 text-accent" />}>
                  <div className="space-y-3">
                    {library?.recentTracks.slice(0, 6).map((track) => (
                      <button key={track.id} type="button" onClick={() => setCurrentTrack(track)} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left">
                        <span>
                          <span className="block font-semibold text-text">{track.title}</span>
                          <span className="block text-xs text-muted">{track.artist}</span>
                        </span>
                        <span className="text-xs text-accentSoft">{formatDuration(track.duration)}</span>
                      </button>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {fullPlayer && currentTrack ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/95 p-6">
          <div className="grid w-full max-w-6xl gap-8 rounded-[36px] border border-white/10 bg-panel/80 p-8 backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-sm uppercase tracking-[0.35em] text-accentSoft">
                <Waves className="h-4 w-4" />
                Immersive Player
              </div>
              <div className="overflow-hidden rounded-[32px] border border-white/10 bg-black/30 p-4 shadow-glow">
                {currentTrack.coverUrl ? <img alt={currentTrack.title} src={`${API_BASE}${currentTrack.coverUrl}`} className="aspect-square w-full rounded-[28px] object-cover" /> : <div className="flex aspect-square w-full items-center justify-center rounded-[28px] bg-canvas/70 text-accent"><Disc3 className="h-24 w-24" /></div>}
              </div>
            </div>
            <div className="flex flex-col justify-between gap-6">
              <div>
                <button className="text-sm text-muted transition hover:text-text" type="button" onClick={() => setFullPlayer(false)}>Close player</button>
                <h2 className="mt-6 text-5xl font-black leading-tight">{currentTrack.title}</h2>
                <p className="mt-3 text-lg text-muted">{currentTrack.artist}{currentTrack.album ? ` • ${currentTrack.album}` : ""}</p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-accentSoft">Playback</p>
                <div className="mt-4 flex items-center gap-3">
                  <button className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-canvas" type="button" onClick={togglePlayback}>
                    {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 fill-current" />}
                  </button>
                  <div className="text-sm text-muted">Desktop player and Android app share the same backend and local library URLs.</div>
                </div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-accentSoft">Lyrics</p>
                <p className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-muted">{currentTrack.lyrics || "No lyrics saved yet. Use Likely Matches to search LRCLIB and attach the best result."}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <div className="fixed bottom-5 right-5 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
    </main>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-panel/70 p-5">
      <div className="flex items-center justify-between text-muted">
        <span className="text-sm">{label}</span>
        {icon}
      </div>
      <div className="mt-4 text-4xl font-black text-text">{value}</div>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-panel/70 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-text">
        {icon}
        {title}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}