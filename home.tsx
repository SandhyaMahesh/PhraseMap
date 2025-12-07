import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const [instrument, setInstrument] = useState("Flute");
  const [pieceTitle, setPieceTitle] = useState("");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>PhraseMap</Text>
      <Text style={styles.subtitle}>Visualize your phrasing. Master your sound.</Text>

      <View style={styles.setup}>
        <Text style={styles.label}>Instrument</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={instrument}
            onValueChange={(itemValue) => setInstrument(itemValue)}
            style={styles.picker}
            dropdownIconColor="#fff"
          >
            {/* Woodwinds */}
            <Picker.Item label="Flute" value="Flute" />
            <Picker.Item label="Piccolo" value="Piccolo" />
            <Picker.Item label="Oboe" value="Oboe" />
            <Picker.Item label="English Horn" value="English Horn" />
            <Picker.Item label="Clarinet" value="Clarinet" />
            <Picker.Item label="Bass Clarinet" value="Bass Clarinet" />
            <Picker.Item label="Bassoon" value="Bassoon" />
            <Picker.Item label="Contrabassoon" value="Contrabassoon" />
            <Picker.Item label="Saxophone" value="Saxophone" />
            <Picker.Item label="Recorder" value="Recorder" />

            {/* Brass */}
            <Picker.Item label="Trumpet" value="Trumpet" />
            <Picker.Item label="Cornet" value="Cornet" />
            <Picker.Item label="French Horn" value="French Horn" />
            <Picker.Item label="Trombone" value="Trombone" />
            <Picker.Item label="Bass Trombone" value="Bass Trombone" />
            <Picker.Item label="Euphonium" value="Euphonium" />
            <Picker.Item label="Tuba" value="Tuba" />

            {/* Other */}
            <Picker.Item label="Voice" value="Voice" />
            <Picker.Item label="Piano" value="Piano" />
          </Picker>
        </View>

        <Text style={styles.label}>Piece Title</Text>
        <TextInput
          placeholder="Enter piece name..."
          style={styles.input}
          placeholderTextColor="#999"
          value={pieceTitle}
          onChangeText={setPieceTitle}
        />
      </View>

      <Text style={styles.tip}>
        Tip: Tap <Text style={{ fontWeight: "700" }}>START</Text>, then tap “Mark Phrase” at breaks.
      </Text>

      <TouchableOpacity
        style={styles.startBtn}
        onPress={() => router.push("/(tabs)/mark-phase")}
      >
        <Text style={styles.startBtnText}>Start Practice</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Recent Sessions</Text>
      <View style={styles.sessionCard}>
        <View>
          <Text style={styles.sessionTitle}>Etude in G Major</Text>
          <Text style={styles.sessionMeta}>Oct 18, 2025 • Flute</Text>
        </View>
        <Text style={[styles.metric, { backgroundColor: "#4CAF50" }]}>Stability 82%</Text>
      </View>

      <TouchableOpacity onPress={() => router.push("/(tabs)/saved-sessions")}>
        <Text style={styles.viewAll}>View All Sessions ›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", padding: 20, backgroundColor: "#3C3B6E" },
  title: { fontSize: 40, fontWeight: "700", color: "#fff", marginBottom: 5 },
  subtitle: { color: "#eee", marginBottom: 15 },
  setup: { width: "100%", marginVertical: 10 },
  label: { color: "#fff", marginBottom: 4 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    width: "100%",
  },
  pickerContainer: {
    backgroundColor: "#4A69BB",
    borderRadius: 8,
    marginBottom: 10,
    overflow: "hidden",
  },
  picker: {
    color: "#fff",
    width: "100%",
  },
  tip: {
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 10,
    borderRadius: 12,
    marginVertical: 10,
    textAlign: "center",
  },
  startBtn: {
    backgroundColor: "#4CAF50",
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginVertical: 20,
  },
  startBtnText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  divider: { width: "100%", height: 1, backgroundColor: "rgba(255,255,255,0.3)", marginVertical: 20 },
  sectionTitle: { color: "#fff", fontSize: 20, fontWeight: "600", alignSelf: "flex-start" },
  sessionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    width: "100%",
  },
  sessionTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  sessionMeta: { color: "#ddd" },
  metric: {
    color: "#fff",
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  viewAll: { color: "#fff", marginTop: 10, alignSelf: "flex-start", opacity: 0.9 },
});
