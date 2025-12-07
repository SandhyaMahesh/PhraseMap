import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function SavedSessionsScreen() {
  const router = useRouter();

  const sessions = [
    { title: "Etude in G Major", instrument: "Flute", date: "Nov 18, 2025", stat: "Stability 82%", color: "#4CAF50" },
    { title: "Bach Sonata No. 2", instrument: "Violin", date: "Nov 14, 2025", stat: "Expression 88%", color: "#F9A826" },
    { title: "Vocal Warmup C", instrument: "Voice", date: "Nov 29, 2025", stat: "Tone 79%", color: "#E57373" },
    { title: "Piano Prelude Op. 28", instrument: "Piano", date: "Dec 1, 2025", stat: "Dynamics 85%", color: "#F9A826" },
    { title: "Clarinet Solo Study", instrument: "Clarinet", date: "Dec 2, 2025", stat: "Tone 81%", color: "#4CAF50" },
  ];

  return (
    <LinearGradient colors={["#3C3B6E", "#4A69BB", "#A8C0FF"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.backBtn} onPress={() => router.push("/(tabs)/home")}>
            ← Back
          </Text>
          <Text style={styles.title}>Saved Sessions</Text>
          <Text style={styles.icon}>🎵</Text>
        </View>

        {sessions.map((s, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.cardTitle}>{s.title}</Text>
            <Text style={styles.cardMeta}>
              {s.instrument} • {s.date}
            </Text>
            <View style={styles.barBackground}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: s.color,
                    width: `${s.stat.match(/\d+/) ? s.stat.match(/\d+/)[0] : 0}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.cardStat, { color: s.color }]}>{s.stat}</Text>
          </View>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 60,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backBtn: {
    color: "#fff",
    fontSize: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  icon: {
    fontSize: 20,
    color: "#fff",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  cardMeta: {
    color: "#ddd",
    marginBottom: 8,
  },
  barBackground: {
    width: "100%",
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 5,
  },
  cardStat: {
    marginTop: 6,
    fontWeight: "700",
  },
});
