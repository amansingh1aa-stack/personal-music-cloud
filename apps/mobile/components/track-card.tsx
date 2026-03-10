import { formatDuration, type Track } from "@music-cloud/shared";
import { TouchableOpacity, View, Text } from "react-native";

type Props = {
  track: Track;
  active?: boolean;
  onPress: () => void;
};

export function TrackCard({ track, active, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        padding: 16,
        borderRadius: 22,
        backgroundColor: active ? "rgba(30,215,96,0.12)" : "rgba(255,255,255,0.04)",
        borderWidth: 1,
        borderColor: active ? "rgba(30,215,96,0.45)" : "rgba(255,255,255,0.08)",
        marginBottom: 12
      }}
    >
      <Text style={{ color: "#f5f7f5", fontSize: 15, fontWeight: "700" }}>{track.title}</Text>
      <Text style={{ color: "#98a59f", marginTop: 4 }}>{track.artist}{track.album ? ` • ${track.album}` : ""}</Text>
      <Text style={{ color: "#7bf2a6", marginTop: 10, fontSize: 12, fontWeight: "700" }}>{formatDuration(track.duration)}</Text>
    </TouchableOpacity>
  );
}