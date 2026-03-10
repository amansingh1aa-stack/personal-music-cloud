import { LinearGradient } from "expo-linear-gradient";
import { Music2 } from "lucide-react-native";
import { View, Text } from "react-native";

export function EmptyArt() {
  return (
    <LinearGradient
      colors={["rgba(30,215,96,0.35)", "rgba(8,12,10,0.92)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        aspectRatio: 1,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <View
        style={{
          width: 110,
          height: 110,
          borderRadius: 55,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.25)"
        }}
      >
        <Music2 color="#1ed760" size={54} />
      </View>
      <Text style={{ color: "#d9e3dd", marginTop: 18, fontSize: 15, fontWeight: "700" }}>Mobile Player Ready</Text>
    </LinearGradient>
  );
}