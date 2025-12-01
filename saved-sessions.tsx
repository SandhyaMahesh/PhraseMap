import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  PinchGestureHandler,
  PinchGestureHandlerGestureEvent,
} from "react-native-gesture-handler";
import Svg, { Path } from "react-native-svg";

export default function SessionReviewScreen() {
  const router = useRouter();
  const { numMarkedPhrases, waveformData } = useLocalSearchParams();

  // Parse parameters
  const numPhrases = Number(numMarkedPhrases) || 0;
  const waveformPoints: number[] = waveformData
    ? JSON.parse(waveformData as string)
    : [];

  const { width } = Dimensions.get("window");
  const colors = ["#4CAF50", "#F9A826", "#E57373", "#29B6F6", "#AB47BC"];
  const segments = numPhrases + 1;
  const segmentLength = Math.floor(waveformPoints.length / segments);

  const segmentedData = Array.from({ length: segments }, (_, i) =>
    waveformPoints.slice(i * segmentLength, (i + 1) * segmentLength)
  );

  //Interactivity States
  const [selectedPhrase, setSelectedPhrase] = useState<number | null>(null);
  const scale = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);

  // Pinch zoom gesture
  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale: scale } }],
    { useNativeDriver: true }
  );

  const onPinchStateChange = (event: PinchGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state === 5) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  // Path generator
  const createPath = (data: number[]) => {
    if (data.length === 0) return "";
    const height = 100;
    const step = (width * 0.9) / data.length;
    let d = `M 0 ${height / 2}`;
    data.forEach((amp, i) => {
      const y = height / 2 - amp * 40;
      const x = i * step;
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return d;
  };

  // Scroll to a particular segment when a card is pressed
  const scrollToPhrase = (index: number) => {
    const scrollX = index * (width * 0.4);
    scrollRef.current?.scrollTo({ x: scrollX, animated: true });
    setSelectedPhrase(index);
  };

  return (
    <LinearGradient colors={["#3C3B6E", "#4A69BB", "#A8C0FF"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Session Review</Text>

        {/* Waveform visualization with zoom and scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          ref={scrollRef}
          contentContainerStyle={{ alignItems: "center" }}
        >
          <PinchGestureHandler
            onGestureEvent={onPinchEvent}
            onHandlerStateChange={onPinchStateChange}
          >
            <Animated.View
              style={{
                transform: [{ scale }],
                backgroundColor: "rgba(255,255,255,0.85)",
                borderRadius: 16,
                padding: 20,
                marginBottom: 15,
              }}
            >
              <Svg height="100" width={width * 1.8}>
                {segmentedData.map((segment, i) => (
                  <Path
                    key={i}
                    d={createPath(segment)}
                    stroke={colors[i % colors.length]}
                    strokeWidth={selectedPhrase === null || selectedPhrase === i ? 3.5 : 1.5}
                    strokeOpacity={selectedPhrase === null || selectedPhrase === i ? 1 : 0.2}
                    fill="none"
                    strokeLinecap="round"
                  />
                ))}
              </Svg>
            </Animated.View>
          </PinchGestureHandler>
        </ScrollView>

        {/* Interactive Legend */}
        <View style={styles.legend}>
          {Array.from({ length: segments }, (_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() =>
                setSelectedPhrase(selectedPhrase === i ? null : i)
              }
              style={[
                styles.legendItem,
                selectedPhrase === i && { opacity: 1.0 },
              ]}
            >
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: colors[i % colors.length] },
                ]}
              />
              <Text
                style={[
                  styles.legendText,
                  selectedPhrase === i && { fontWeight: "700" },
                ]}
              >
                {i < numPhrases
                  ? `Phrase ${String.fromCharCode(65 + i)}`
                  : "End Section"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Interactive Summary Cards */}
        <View style={styles.cards}>
          <TouchableOpacity
            style={[styles.card, { borderLeftColor: "#4CAF50" }]}
            onPress={() => scrollToPhrase(1)} // Phrase B
          >
            <Text style={styles.cardTitle}>Most Stable Phrase</Text>
            <Text style={styles.cardValue}>B (82%)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { borderLeftColor: "#F9A826" }]}
            onPress={() => scrollToPhrase(2)} // Phrase C
          >
            <Text style={styles.cardTitle}>Most Expressive Phrase</Text>
            <Text style={styles.cardValue}>C (88%)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { borderLeftColor: "#E57373" }]}
            onPress={() => scrollToPhrase(0)} // Phrase A
          >
            <Text style={styles.cardTitle}>Next Focus</Text>
            <Text style={styles.cardValue}>Even tone in Phrase A</Text>
          </TouchableOpacity>
        </View>

        {/* Save Session Button */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => router.push("/(tabs)/home")}
        >
          <Text style={styles.saveBtnText}>Save Session ✓</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 20, alignItems: "center", paddingBottom: 60 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 20,
  },
  legend: { marginTop: 10, width: "90%" },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    opacity: 0.7,
  },
  legendColor: {
    width: 18,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: { color: "#fff", fontSize: 15 },
  cards: { width: "100%", gap: 10, marginTop: 20 },
  card: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 6,
  },
  cardTitle: { color: "#333", fontSize: 16, fontWeight: "700" },
  cardValue: { color: "#444", fontSize: 15, marginTop: 4 },
  saveBtn: {
    backgroundColor: "#4CAF50",
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 50,
    marginTop: 30,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  saveBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
