import { useEffect, useState } from "react";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { formatDuration, summarizeLibrary, type LibraryPayload, type Track } from "@music-cloud/shared";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Disc3, Download, LogOut, Mic2, Pause, Play, ShieldCheck } from "lucide-react-native";
import { EmptyArt } from "./empty-art";
import { TrackCard } from "./track-card";
import { API_BASE, mobileApi, tokenStore } from "../lib/api";

export function MusicCloudMobile() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [library, setLibrary] = useState<LibraryPayload | null>(null);
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [player, setPlayer] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tokenStore.get().then((saved) => {
      if (saved) {
        setToken(saved);
      }
    });
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    loadLibrary(token).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load library");
    });
  }, [token]);

  useEffect(() => {
    return () => {
      player?.unloadAsync().catch(() => undefined);
    };
  }, [player]);

  async function loadLibrary(activeToken: string) {
    const payload = await mobileApi.library(activeToken);
    setLibrary(payload);
    setActiveTrack((current) => current || payload.recentTracks[0] || payload.playlists[0]?.tracks[0] || null);
  }

  async function login() {
    setBusy("login");
    setError(null);
    try {
      const result = await mobileApi.login(password);
      await tokenStore.set(result.token);
      setToken(result.token);
      setPassword("");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in");
    } finally {
      setBusy(null);
    }
  }

  async function playTrack(track: Track) {
    try {
      if (player) {
        await player.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: `${API_BASE}${track.audioUrl}` },
        { shouldPlay: true }
      );
      setPlayer(sound);
      setActiveTrack(track);
      setPlaying(true);
    } catch (playError) {
      setError(playError instanceof Error ? playError.message : "Playback failed");
    }
  }

  async function togglePlayback() {
    if (!player) {
      if (activeTrack) {
        await playTrack(activeTrack);
      }
      return;
    }

    const status = await player.getStatusAsync();
    if (!status.isLoaded) {
      return;
    }

    if (status.isPlaying) {
      await player.pauseAsync();
      setPlaying(false);
    } else {
      await player.playAsync();
      setPlaying(true);
    }
  }

  async function runImport() {
    if (!token || !playlistUrl) {
      return;
    }

    setBusy("import");
    setError(null);
    try {
      await mobileApi.importPlaylist(token, playlistUrl);
      setPlaylistUrl("");
      await loadLibrary(token);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed");
    } finally {
      setBusy(null);
    }
  }

  async function logout() {
    await tokenStore.clear();
    setToken(null);
    setLibrary(null);
    setActiveTrack(null);
    setPlaying(false);
  }

  if (!token) {
    return (
      <LinearGradient colors={["#07100b", "#030504"]} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, justifyContent: "center", padding: 24 }}>
          <View style={{ padding: 24, borderRadius: 30, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <ShieldCheck color="#1ed760" size={30} />
              <View>
                <Text style={{ color: "#7bf2a6", fontSize: 12, fontWeight: "800", letterSpacing: 2 }}>ANDROID APP</Text>
                <Text style={{ color: "#f4f7f5", fontSize: 30, fontWeight: "800" }}>Music Cloud</Text>
              </View>
            </View>
            <TextInput
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="Master password"
              placeholderTextColor="#71807a"
              style={{ color: "white", backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}
            />
            <Pressable onPress={login} style={{ backgroundColor: "#1ed760", marginTop: 16, paddingVertical: 16, borderRadius: 18, alignItems: "center" }}>
              <Text style={{ color: "#041009", fontWeight: "800" }}>{busy === "login" ? "Unlocking..." : "Unlock Library"}</Text>
            </Pressable>
            {error ? <Text style={{ color: "#fca5a5", marginTop: 14 }}>{error}</Text> : null}
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const stats = library ? summarizeLibrary(library) : null;

  return (
    <LinearGradient colors={["#07100b", "#030504"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <View>
              <Text style={{ color: "#7bf2a6", fontSize: 12, fontWeight: "800", letterSpacing: 2 }}>PERSONAL MUSIC CLOUD</Text>
              <Text style={{ color: "#f5f7f5", fontSize: 28, fontWeight: "900", marginTop: 4 }}>Android Companion</Text>
            </View>
            <Pressable onPress={logout} style={{ padding: 12, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
              <LogOut color="#d7dfda" size={18} />
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
            <View style={{ flex: 1, padding: 14, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)" }}>
              <Text style={{ color: "#8fa099", fontSize: 12 }}>Playlists</Text>
              <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 4 }}>{stats?.playlistCount ?? 0}</Text>
            </View>
            <View style={{ flex: 1, padding: 14, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)" }}>
              <Text style={{ color: "#8fa099", fontSize: 12 }}>Tracks</Text>
              <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 4 }}>{stats?.totalTracks ?? 0}</Text>
            </View>
          </View>

          <View style={{ padding: 16, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Download color="#1ed760" size={18} />
              <Text style={{ color: "#fff", fontWeight: "800" }}>YouTube Import</Text>
            </View>
            <TextInput
              value={playlistUrl}
              onChangeText={setPlaylistUrl}
              placeholder="Paste a playlist URL"
              placeholderTextColor="#71807a"
              style={{ color: "white", backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginTop: 12 }}
            />
            <Pressable onPress={runImport} style={{ backgroundColor: "#1ed760", marginTop: 12, paddingVertical: 14, borderRadius: 16, alignItems: "center" }}>
              <Text style={{ color: "#041009", fontWeight: "800" }}>{busy === "import" ? "Importing..." : "Import Playlist"}</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 18 }}>
            {activeTrack?.coverUrl ? (
              <Image source={{ uri: `${API_BASE}${activeTrack.coverUrl}` }} style={{ width: "100%", aspectRatio: 1, borderRadius: 28 }} />
            ) : (
              <EmptyArt />
            )}
          </View>

          <View style={{ marginTop: 18, padding: 18, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
            <Text style={{ color: "#fff", fontSize: 26, fontWeight: "900" }}>{activeTrack?.title || "Select a track"}</Text>
            <Text style={{ color: "#9eaaa5", marginTop: 6 }}>{activeTrack ? `${activeTrack.artist}${activeTrack.album ? ` • ${activeTrack.album}` : ""}` : "Your library is ready for mobile playback."}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18 }}>
              <Pressable onPress={togglePlayback} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#1ed760", alignItems: "center", justifyContent: "center" }}>
                {playing ? <Pause color="#041009" size={26} /> : <Play color="#041009" size={26} />}
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#7bf2a6", fontWeight: "800" }}>Mobile streaming</Text>
                <Text style={{ color: "#91a09a", marginTop: 4 }}>{formatDuration(activeTrack?.duration)} • local API playback</Text>
              </View>
            </View>
            {activeTrack?.lyrics ? (
              <View style={{ marginTop: 18, padding: 16, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.18)" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Mic2 color="#1ed760" size={16} />
                  <Text style={{ color: "#fff", fontWeight: "800" }}>Saved Lyrics</Text>
                </View>
                <Text style={{ color: "#c7d0cb", lineHeight: 22 }}>{activeTrack.lyrics}</Text>
              </View>
            ) : null}
          </View>

          <View style={{ marginTop: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Disc3 color="#1ed760" size={18} />
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>Recent Tracks</Text>
            </View>
            {library?.recentTracks.map((track) => (
              <TrackCard key={track.id} track={track} active={track.id === activeTrack?.id} onPress={() => playTrack(track)} />
            ))}
            {!library ? <ActivityIndicator color="#1ed760" style={{ marginTop: 24 }} /> : null}
          </View>

          {error ? <Text style={{ color: "#fca5a5", marginTop: 18 }}>{error}</Text> : null}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}