import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const WAVEFORM_WIDTH = 400;
const WAVEFORM_HEIGHT = 100;
const MAX_POINTS = 200; // Number of points to keep in view for oscilloscope effect
const SAMPLING_INTERVAL = 16; // ms between samples (~60 fps) - optimized for <50ms latency
const RIGHT_PADDING = 5; // px offset from right edge to prevent cutoff
const NOISE_GATE_THRESHOLD = 0.01; // Linear amplitude threshold below which we render flat
const BASELINE_POSITION = 0.72; // Baseline at 72% down from top (70-75% range)

export default function MarkPhaseScreen() {
  const router = useRouter();
  const [marks, setMarks] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [waveform, setWaveform] = useState<number[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousAmplitudeRef = useRef<number>(0);
  const waveformRef = useRef<number[]>([]); // Direct ref for immediate updates (last 200 points for display)
  const fullWaveformRef = useRef<number[]>([]); // Full waveform history for phrase segmentation
  const phraseMarkIndicesRef = useRef<number[]>([]); // Track indices where "Mark Phrase" was pressed

  // Convert dB metering value to normalized amplitude (0-1) with noise gate
  const dbToAmplitude = useCallback((db: number | undefined): number => {
    if (db === undefined || db === null || isNaN(db)) return 0;
    
    // Noise gate: anything below -60dB is considered silence
    const minDb = -60;
    if (db < minDb) return 0;
    
    // Convert to 0-1 range
    const maxDb = 0;
    const normalized = Math.max(0, Math.min(1, (db - minDb) / (maxDb - minDb)));
    
    // Apply exponential scaling for better visual response to loudness
    let amplitude = Math.pow(normalized, 0.6);
    
    // Noise gate: if amplitude is below threshold, render as perfectly flat
    if (amplitude < NOISE_GATE_THRESHOLD) {
      return 0;
    }
    
    return amplitude;
  }, []);

  // Complete cleanup function for recording
  const cleanupRecording = useCallback(async () => {
    try {
      // Clear interval first to stop polling
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Stop and unload recording
      const recording = recordingRef.current;
      if (recording) {
        try {
          // Try to stop and unload the recording
          try {
            const status = await recording.getStatusAsync();
            if (status.isRecording || status.canRecord) {
              await recording.stopAndUnloadAsync();
            }
          } catch (statusErr) {
            // Recording might be in a bad state, try stopAndUnloadAsync anyway
            try {
              await recording.stopAndUnloadAsync();
            } catch (stopErr) {
              // Recording is likely already cleaned up, ignore error
            }
          }
        } catch (err) {
          console.log("Error cleaning up recording:", err);
        }
        recordingRef.current = null;
      }

      // Reset audio mode to release microphone resources
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: false,
          shouldDuckAndroid: false,
        });
      } catch (err) {
        console.log("Error resetting audio mode:", err);
      }

      setIsListening(false);
    } catch (err) {
      console.error("Error in cleanupRecording:", err);
    }
  }, []);

  // Start recording function
  const startRecording = useCallback(async () => {
    try {
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        alert("Microphone access is required to visualize sound.");
        return;
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create new recording instance
      const recording = new Audio.Recording();
      
      // Enable metering to get real-time audio levels
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      
      await recording.startAsync();
      recordingRef.current = recording;
      setIsListening(true);

      // Reset waveform tracking when starting a new recording
      waveformRef.current = [];
      fullWaveformRef.current = [];
      phraseMarkIndicesRef.current = [];
      previousAmplitudeRef.current = 0;
      setWaveform([]);

      // High-frequency polling loop for minimal latency (~60fps)
intervalRef.current = setInterval(async () => {
    if (!recordingRef.current) return;
  
        try {
          const status = await recordingRef.current.getStatusAsync();
          
          if (status.isRecording && status.metering !== undefined) {
            // Get the metering value (dB level)
            const meteringDb = status.metering;
            
            // Convert to normalized amplitude with noise gate
            let amplitude = dbToAmplitude(meteringDb);
            
            // Ultra-minimal smoothing for fastest response (96% new, 4% old)
            // This minimal smoothing reduces jitter while maintaining near-instant response
            if (amplitude > NOISE_GATE_THRESHOLD || previousAmplitudeRef.current > NOISE_GATE_THRESHOLD) {
              amplitude = 0.96 * amplitude + 0.04 * previousAmplitudeRef.current;
            }
            previousAmplitudeRef.current = amplitude;
            
            // Store in full waveform history (for phrase segmentation)
            fullWaveformRef.current.push(amplitude);
            
            // Store in display buffer (last 200 points for oscilloscope view)
            waveformRef.current.push(amplitude);
            if (waveformRef.current.length > MAX_POINTS) {
              waveformRef.current.shift(); // Remove oldest point
            }
            
            // Force immediate re-render by updating state with new array reference
            setWaveform([...waveformRef.current]);
          }
        } catch (err) {
          console.error("Error getting recording status:", err);
        }
      }, SAMPLING_INTERVAL);
    } catch (err) {
      console.error("Error starting recording:", err);
      setIsListening(false);
    }
  }, [dbToAmplitude]);

  // Lifecycle management: cleanup on blur, initialize on focus
  useFocusEffect(
    React.useCallback(() => {
      // Reset UI state immediately when screen gains focus
      setMarks(0);
      fadeAnim.setValue(0);
      setWaveform([]);
      waveformRef.current = [];
      fullWaveformRef.current = [];
      phraseMarkIndicesRef.current = [];
      previousAmplitudeRef.current = 0;

      // Track if component is still mounted/focused
      let isMounted = true;
      let cleanupCalled = false;
      
      // Initialize recording when screen gains focus
      const initializeRecording = async () => {
        // Small delay to ensure any previous cleanup has completed
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Check if still mounted before starting
        if (!isMounted || cleanupCalled) return;
        
        // Start fresh recording
        await startRecording();
      };

      // Start initialization
      initializeRecording();

      // Cleanup function: runs when screen loses focus or component unmounts
      return () => {
        cleanupCalled = true;
        isMounted = false;
        cleanupRecording();
      };
    }, [cleanupRecording, startRecording])
  );

  // Generate SVG path - continuous smooth path with auto-scrolling
  const getPath = useCallback((): string => {
    if (waveform.length === 0) return "";
    
    const width = WAVEFORM_WIDTH;
    const height = WAVEFORM_HEIGHT;
    
    // Baseline at 72% down from top (70-75% range)
    const baselineY = height * BASELINE_POSITION;
    
    // Effective drawing width with right padding to prevent cutoff
    // This ensures the active point is always visible, not clipped at the edge
    const effectiveWidth = width - RIGHT_PADDING;
    
    // Use uniform spacing based on MAX_POINTS for smooth scrolling
    const pointSpacing = effectiveWidth / MAX_POINTS;
    
    // Start at the left edge at baseline
    let d = `M 0 ${baselineY.toFixed(2)}`;
    
    // Draw continuous path through all points
    // As new points are added and we reach MAX_POINTS, old points drop off the left
    // creating the oscilloscope scrolling effect
    waveform.forEach((amplitude, index) => {
      // X position: scale to effective width to prevent right edge cutoff
      // The last point will be at effectiveWidth (not width), keeping it visible
      const x = index * pointSpacing;
      
      // Amplitude ranges from 0-1
      // Louder sounds make the line go up, quieter sounds stay at baseline
      // When amplitude is 0, y stays at baseline (flat line for silence)
      // When amplitude is 1, y goes toward the top
      const yOffset = amplitude * (baselineY * 0.9); // Use 90% of baseline height for upward movement
      const y = baselineY - yOffset; // Subtract to go up from baseline
      
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    });
    
    return d;
  }, [waveform]);

  // Segment waveform into phrases based on mark indices
  const getPhraseSegments = useCallback((): number[][] => {
    const fullWaveform = fullWaveformRef.current;
    const markIndices = phraseMarkIndicesRef.current;
    
    if (fullWaveform.length === 0) return [];
    
    // Create segments based on mark indices
    const segments: number[][] = [];
    
    if (markIndices.length === 0) {
      // No marks pressed, entire waveform is Phrase 1
      segments.push([...fullWaveform]);
    } else {
      // Phrase 1: from start to first mark
      segments.push(fullWaveform.slice(0, markIndices[0]));
      
      // Intermediate phrases: between marks
      for (let i = 0; i < markIndices.length - 1; i++) {
        segments.push(fullWaveform.slice(markIndices[i], markIndices[i + 1]));
      }
      
      // Last phrase: from last mark to end
      segments.push(fullWaveform.slice(markIndices[markIndices.length - 1]));
    }
    
    return segments;
  }, []);

  //mark phrase button
  const handleMarkPhrase = () => {
    // Record the current position in the full waveform when marking
    const currentIndex = fullWaveformRef.current.length;
    phraseMarkIndicesRef.current.push(currentIndex);
    
    setMarks((m) => m + 1);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  //go to Review
  const handleNavigateReview = async () => {
    // Get the audio file URI before cleanup
    let audioUri: string | null = null;
    if (recordingRef.current) {
      try {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording) {
          // Stop and unload - the recording object has getURI() method
          const recording = recordingRef.current;
          await recording.stopAndUnloadAsync();
          
          // Try to get URI using getURI method (if available)
          if (recording.getURI && typeof recording.getURI === 'function') {
            audioUri = recording.getURI();
          } else {
            // Fallback: Check if URI is in the status
            const finalStatus = await recording.getStatusAsync();
            if (finalStatus && 'uri' in finalStatus && finalStatus.uri) {
              audioUri = finalStatus.uri;
            }
          }
        }
      } catch (err) {
        console.log("Error getting audio URI:", err);
      }
    }
    
    // Clean up the rest
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    recordingRef.current = null;
    setIsListening(false);
    
    // Reset audio mode (but allow playback)
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true, // Allow playback
        shouldDuckAndroid: false,
      });
    } catch (err) {
      console.log("Error resetting audio mode:", err);
    }
    
    // Get phrase segments from full waveform
    const phraseSegments = getPhraseSegments();
    
    router.push({
        pathname: "/(tabs)/session-review",
        params: {
          numMarkedPhrases: marks.toString(),
        waveformData: JSON.stringify(phraseSegments),
          ...(audioUri ? { audioUri } : {}),
        },
      });
  };

  return (
    <LinearGradient colors={["#3C3B6E", "#4A69BB", "#A8C0FF"]} style={styles.gradient}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.iconLeft}>🎛️</Text>
          <Text style={styles.title}>Mark Phrases</Text>
          <TouchableOpacity onPress={handleNavigateReview}>
            <Text style={styles.iconRight}>➡️</Text>
          </TouchableOpacity>
        </View>

        {/* Waveform */}
        <View style={styles.waveContainer}>
          <Text style={styles.labelTop}>Too Sharp</Text>
          <View style={styles.waveBox}>
            {isListening ? (
              <Svg height={WAVEFORM_HEIGHT} width={WAVEFORM_WIDTH} viewBox={`0 0 ${WAVEFORM_WIDTH} ${WAVEFORM_HEIGHT}`} style={styles.svg}>
                <Path
                  d={getPath()}
                  stroke="#3b5bdb"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            ) : (
              <Text style={styles.waitingText}>Listening for external audio...</Text>
            )}
          </View>
          <Text style={styles.labelBottom}>Too Flat</Text>
        </View>

        {/* Mark Phrase Button */}
        <TouchableOpacity style={styles.markBtn} onPress={handleMarkPhrase}>
          <Text style={styles.markBtnText}>Mark Phrase</Text>
        </TouchableOpacity>

        {/* Counter */}
        {marks > 0 && (
          <Animated.Text style={[styles.counterText, { opacity: fadeAnim }]}>
            Phrases marked: {marks}
          </Animated.Text>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  header: {
    position: "absolute",
    top: 50,
    width: "90%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconLeft: { fontSize: 28 },
  iconRight: { fontSize: 28 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff" },
  waveContainer: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    paddingVertical: 20,
    width: "90%",
    alignItems: "center",
    marginVertical: 40,
  },
  labelTop: { color: "#333", fontSize: 16, marginBottom: 10 },
  labelBottom: { color: "#333", fontSize: 16, marginTop: 10 },
  waveBox: {
    backgroundColor: "#f7f7ff",
    borderRadius: 12,
    width: "95%",
    height: WAVEFORM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  svg: {
    flex: 1,
    width: "100%",
  },
  waitingText: { textAlign: "center", color: "#666", fontStyle: "italic" },
  markBtn: {
    backgroundColor: "#4CAF50",
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  markBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  counterText: { marginTop: 10, color: "#fff", fontSize: 16, opacity: 0.9 },
});
