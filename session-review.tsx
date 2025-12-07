import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  LongPressGestureHandler,
  PinchGestureHandler,
  PinchGestureHandlerGestureEvent,
  State,
  TapGestureHandler,
} from "react-native-gesture-handler";
import Svg, { Circle, Defs, Line, Path, Stop, LinearGradient as SvgLinearGradient } from "react-native-svg";

const RIGHT_PADDING = 5; // px offset from right edge to prevent cutoff
const BASELINE_POSITION = 0.72; // Baseline at 72% down from top (70-75% range)
const COLORS = ["#4CAF50", "#F9A826", "#E57373", "#29B6F6", "#AB47BC"];
const SAMPLING_INTERVAL = 16; // ms between samples (from mark-phase.tsx) - matches recording interval

// Feedback message pool with 30+ templates
const FEEDBACK_POOL = [
  { title: "Most Stable Phrase", template: "Phrase {letter} ({score}%)", category: "stability" },
  { title: "Most Expressive Phrase", template: "Phrase {letter} ({score}%)", category: "expression" },
  { title: "Next Focus", template: "Work on tone control in Phrase {letter}", category: "focus" },
  { title: "Smoothest Flow", template: "Phrase {letter} feels natural ({score}%)", category: "flow" },
  { title: "Best Pitch Control", template: "Phrase {letter} maintained consistent pitch", category: "pitch" },
  { title: "Strongest Energy", template: "Phrase {letter} had great energy ({score}%)", category: "energy" },
  { title: "Most Dynamic", template: "Phrase {letter} showed good variation ({score}%)", category: "dynamics" },
  { title: "Smooth Ending", template: "Phrase {letter} ended cleanly", category: "ending" },
  { title: "Even Tempo", template: "Phrase {letter} kept steady rhythm ({score}%)", category: "tempo" },
  { title: "Pitch Consistency", template: "Phrase {letter} stayed in tune", category: "pitch" },
  { title: "Energy Variation", template: "Phrase {letter} showed dynamic range", category: "dynamics" },
  { title: "Tone Quality", template: "Phrase {letter} had clear tone ({score}%)", category: "tone" },
  { title: "Phrasing Clarity", template: "Phrase {letter} was well-defined", category: "phrasing" },
  { title: "Breath Control", template: "Phrase {letter} had smooth breathing", category: "breath" },
  { title: "Volume Balance", template: "Phrase {letter} maintained good balance ({score}%)", category: "volume" },
  { title: "Articulation", template: "Phrase {letter} had clear articulation", category: "articulation" },
  { title: "Musical Shape", template: "Phrase {letter} had nice musical arc ({score}%)", category: "shape" },
  { title: "Rhythmic Precision", template: "Phrase {letter} kept accurate timing", category: "rhythm" },
  { title: "Emotional Expression", template: "Phrase {letter} conveyed emotion well", category: "expression" },
  { title: "Technical Accuracy", template: "Phrase {letter} was technically sound ({score}%)", category: "technique" },
  { title: "Smooth Transition", template: "Phrase {letter} flowed nicely", category: "transition" },
  { title: "Vibrato Control", template: "Phrase {letter} had controlled vibrato", category: "vibrato" },
  { title: "Dynamic Contrast", template: "Phrase {letter} showed good contrast ({score}%)", category: "dynamics" },
  { title: "Pitch Accuracy", template: "Phrase {letter} was mostly in tune", category: "pitch" },
  { title: "Phrasing Direction", template: "Phrase {letter} had clear direction", category: "phrasing" },
  { title: "Tone Consistency", template: "Phrase {letter} maintained tone ({score}%)", category: "tone" },
  { title: "Musical Intention", template: "Phrase {letter} felt intentional", category: "intention" },
  { title: "Technical Clarity", template: "Phrase {letter} was clean ({score}%)", category: "technique" },
  { title: "Expressive Range", template: "Phrase {letter} used full range", category: "expression" },
  { title: "Artistic Freedom", template: "Phrase {letter} had natural expression", category: "artistic" },
  { title: "Control & Precision", template: "Phrase {letter} showed control ({score}%)", category: "control" },
  { title: "Musical Line", template: "Phrase {letter} had smooth line", category: "line" },
];

// Shuffle array function
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Animated cursor line component
const CursorLine = ({ cursorX }: { cursorX: Animated.Value }) => {
  const [x, setX] = React.useState(0);

  React.useEffect(() => {
    const listener = cursorX.addListener(({ value }) => {
      setX(value);
    });
    return () => {
      cursorX.removeListener(listener);
    };
  }, [cursorX]);

  return (
    <Line
      x1={x}
      y1={0}
      x2={x}
      y2={100}
      stroke="#FF0000"
      strokeWidth={2}
      strokeOpacity={0.8}
      strokeDasharray="4,4"
    />
  );
};

// Heatmap layer component
const HeatmapLayer = ({
  phraseSegments,
  segmentPositions,
  pointSpacing,
  waveformWidth,
  amplitudeToColor,
  opacity,
}: {
  phraseSegments: number[][];
  segmentPositions: number[];
  pointSpacing: number;
  waveformWidth: number;
  amplitudeToColor: (amplitude: number) => string;
  opacity: Animated.Value;
}) => {
  const [opacityValue, setOpacityValue] = React.useState(0);
  const height = 100;
  const baselineY = height * BASELINE_POSITION;
  const effectiveWidth = waveformWidth - RIGHT_PADDING;

  // Animate opacity
  React.useEffect(() => {
    const listener = opacity.addListener(({ value }) => {
      setOpacityValue(value);
    });
    return () => {
      opacity.removeListener(listener);
    };
  }, [opacity]);

  // Generate heatmap path data
  const generateHeatmapData = () => {
    if (phraseSegments.length === 0) return { path: "", gradients: [] };

    // Sample amplitude values across the waveform
    const samplePoints = Math.min(
      phraseSegments.reduce((sum, seg) => sum + seg.length, 0),
      300
    );
    const totalLength = phraseSegments.reduce((sum, seg) => sum + seg.length, 0);
    const stepSize = totalLength / samplePoints;

    // Generate gradient stops for each segment
    const gradients: Array<{
      id: string;
      x1: number;
      x2: number;
      stops: Array<{ offset: string; color: string }>;
    }> = [];

    phraseSegments.forEach((segment, segIdx) => {
      if (segment.length === 0) return;

      const startX = segmentPositions[segIdx];
      const segmentWidth = segment.length * pointSpacing;
      const endX = startX + segmentWidth;

      // Sample points within this segment
      const segmentSamples = Math.max(3, Math.min(segment.length, 50));
      const segmentStep = segment.length / segmentSamples;

      const stops: Array<{ offset: string; color: string }> = [];
      for (let i = 0; i <= segmentSamples; i++) {
        const sampleIdx = Math.floor(i * segmentStep);
        const amp = segment[Math.min(sampleIdx, segment.length - 1)];
        const offset = (i / segmentSamples) * 100;
        stops.push({
          offset: `${offset}%`,
          color: amplitudeToColor(amp),
        });
      }

      gradients.push({
        id: `heatmapGradient-${segIdx}`,
        x1: startX,
        x2: endX,
        stops,
      });
    });

    // Create filled polygon path below baseline
    let path = `M 0 ${baselineY}`;
    let currentX = 0;

    phraseSegments.forEach((segment, segIdx) => {
      const startX = segmentPositions[segIdx];
      const segmentWidth = segment.length * pointSpacing;

      // Add points along this segment
      const samples = Math.min(segment.length, 30);
      for (let i = 0; i <= samples; i++) {
        const idx = Math.floor((i / samples) * (segment.length - 1));
        const x = startX + (i / samples) * segmentWidth;
        path += ` L ${x.toFixed(2)} ${baselineY}`;
      }
      currentX = startX + segmentWidth;
    });

    // Close the path at bottom
    path += ` L ${currentX} ${height} L 0 ${height} Z`;

    return { path, gradients };
  };

  const { path, gradients } = generateHeatmapData();

  if (path === "") return null;

  return (
    <>
      {/* Gradient definitions */}
      <Defs>
        {gradients.map((grad) => (
          <SvgLinearGradient
            key={grad.id}
            id={grad.id}
            x1={grad.x1}
            y1="0"
            x2={grad.x2}
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            {grad.stops.map((stop, idx) => (
              <Stop
                key={idx}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={0.4}
              />
            ))}
          </SvgLinearGradient>
        ))}
      </Defs>

      {/* Heatmap fill areas per segment */}
      {phraseSegments.map((segment, segIdx) => {
        if (segment.length === 0) return null;

        const startX = segmentPositions[segIdx];
        const segmentWidth = segment.length * pointSpacing;

        // Build path for this segment - rectangle below baseline
        const segmentPath = `M ${startX} ${baselineY} L ${startX + segmentWidth} ${baselineY} L ${startX + segmentWidth} ${height} L ${startX} ${height} Z`;

        return (
          <Path
            key={`heatmap-${segIdx}`}
            d={segmentPath}
            fill={`url(#heatmapGradient-${segIdx})`}
            opacity={opacityValue * 0.5}
          />
        );
      })}
    </>
  );
};

export default function SessionReviewScreen() {
  const router = useRouter();
  const { numMarkedPhrases, waveformData, audioUri } = useLocalSearchParams();

  // Parse parameters
  const numPhrases = Number(numMarkedPhrases) || 0;
  
  // Parse waveformData as array of arrays (phrase segments)
  let phraseSegments: number[][] = [];
  try {
    if (waveformData) {
      const parsed = JSON.parse(waveformData as string);
      // Ensure it's an array of arrays
      if (Array.isArray(parsed) && parsed.length > 0) {
        phraseSegments = parsed.map((segment: any) => 
          Array.isArray(segment) ? segment : []
        );
      }
    }
  } catch (err) {
    console.error("Error parsing waveform data:", err);
    phraseSegments = [];
  }

  const { width } = Dimensions.get("window");
  const totalSegments = phraseSegments.length;

  // Calculate total waveform length and consistent spacing
  const totalWaveformLength = phraseSegments.reduce((sum, segment) => sum + segment.length, 0);
  const effectiveWidth = (width * 0.9) - RIGHT_PADDING;
  const pointSpacing = totalWaveformLength > 0 ? effectiveWidth / totalWaveformLength : 2;
  const waveformWidth = Math.max(width * 1.8, totalWaveformLength * pointSpacing);

  //Interactivity States
  const [selectedPhrase, setSelectedPhrase] = useState<number | null>(null);
  const [feedbackCards, setFeedbackCards] = useState<Array<{
    title: string;
    value: string;
    phraseIndex: number;
    color: string;
  }>>([]);
  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const lastBaseScale = useRef(1);
  const scrollRef = useRef<ScrollView>(null);
  const feedbackCardsGeneratedRef = useRef(false);
  const doubleTapRef = useRef(null);

  // Audio playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState<number | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const playbackStatusRef = useRef<any>(null);
  const cursorPosition = useRef(new Animated.Value(0)).current;
  const cursorAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heatmapOpacity = useRef(new Animated.Value(0)).current;

  // Annotation states
  const [annotations, setAnnotations] = useState<Array<{
    id: string;
    xPosition: number;
    phraseIndex: number;
    text: string;
  }>>([]);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [annotationXPosition, setAnnotationXPosition] = useState<number | null>(null);
  const [annotationPhraseIndex, setAnnotationPhraseIndex] = useState<number | null>(null);
  const [annotationText, setAnnotationText] = useState("");
  const [selectedAnnotation, setSelectedAnnotation] = useState<{
    id: string;
    xPosition: number;
    phraseIndex: number;
    text: string;
  } | null>(null);
  const longPressRef = useRef(null);

  // Improved pinch zoom gesture with proper state handling
  // Use useNativeDriver: false to avoid nested touch handler conflicts
  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale: pinchScale } }],
    { useNativeDriver: false }
  );

  const onPinchStateChange = (event: PinchGestureHandlerGestureEvent) => {
    const { state, scale: gestureScale } = event.nativeEvent;
    
    if (state === State.END) {
      // Gesture ended - commit the scale
      const newScale = lastBaseScale.current * gestureScale;
      
      // Clamp scale between 0.8 and 3.0
      let finalScale = Math.max(0.8, Math.min(3.0, newScale));
      
      // Reset to 1 if pinched too far out (below threshold)
      if (finalScale < 0.85) {
        finalScale = 1;
      }
      
      lastBaseScale.current = finalScale;
      
      // Update base scale and reset pinch scale
      Animated.parallel([
        Animated.timing(baseScale, {
          toValue: finalScale,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(pinchScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    } else if (state === State.CANCELLED || state === State.FAILED) {
      // Gesture cancelled - reset pinch scale
      Animated.timing(pinchScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  // Double tap to reset zoom
  const onDoubleTap = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      lastBaseScale.current = 1;
      Animated.parallel([
        Animated.spring(baseScale, {
          toValue: 1,
          useNativeDriver: false,
          tension: 50,
          friction: 7,
        }),
        Animated.spring(pinchScale, {
          toValue: 1,
          useNativeDriver: false,
          tension: 50,
          friction: 7,
        }),
      ]).start();
    }
  };

  // Combined scale for transform
  const combinedScale = Animated.multiply(baseScale, pinchScale);

  // Track the last waveformData to detect new sessions
  // Normalize waveformData to string for comparison
  const waveformDataString = typeof waveformData === 'string' ? waveformData : Array.isArray(waveformData) ? waveformData[0] : undefined;
  const lastWaveformDataRef = useRef<string | undefined>(undefined);

  // Generate dynamic feedback cards only once per session
  useEffect(() => {
    // Check if this is a new session (waveformData changed)
    const isNewSession = waveformDataString !== lastWaveformDataRef.current;
    
    if (isNewSession) {
      // Update the ref to track the current session
      lastWaveformDataRef.current = waveformDataString;
      // Reset the generation flag for new session
      feedbackCardsGeneratedRef.current = false;
    }

    // Only generate if we have segments and haven't generated for this session yet
    if (totalSegments > 0 && !feedbackCardsGeneratedRef.current) {
      // Generate available phrase letters
      const availablePhrases = Array.from({ length: totalSegments }, (_, i) => ({
        letter: String.fromCharCode(65 + i),
        index: i,
        color: COLORS[i % COLORS.length],
      }));

      // Determine number of cards to show (3-4, but not more than available phrases)
      const numCards = Math.min(Math.max(3, totalSegments), 4);

      // Shuffle feedback pool and select unique templates
      const shuffledFeedback = shuffleArray(FEEDBACK_POOL);
      const selectedFeedback = shuffledFeedback.slice(0, numCards);

      // Assign feedback to phrases with randomization
      const shuffledPhrases = shuffleArray(availablePhrases);

      const generatedCards = selectedFeedback.map((feedback, i) => {
        const phrase = shuffledPhrases[i % shuffledPhrases.length];
        const score = Math.floor(70 + Math.random() * 25); // Random score between 70-95
        
        return {
          title: feedback.title,
          value: feedback.template
            .replace("{letter}", phrase.letter)
            .replace("{score}", score.toString()),
          phraseIndex: phrase.index,
          color: phrase.color,
        };
      });

      setFeedbackCards(generatedCards);
      feedbackCardsGeneratedRef.current = true;
    } else if (isNewSession && totalSegments === 0) {
      // Clear cards if new session has no segments
      setFeedbackCards([]);
    }
  }, [totalSegments, waveformDataString]);

  // Calculate the end point of a segment
  const getSegmentEndPoint = (data: number[], startX: number) => {
    if (data.length === 0) return { x: startX, y: 100 * BASELINE_POSITION };
    const height = 100;
    const baselineY = height * BASELINE_POSITION;
    const lastIndex = data.length - 1;
    const x = startX + (lastIndex * pointSpacing);
    const amp = data[lastIndex];
    const yOffset = amp * (baselineY * 0.9);
    const y = baselineY - yOffset;
    return { x, y };
  };

  // Path generator with proper baseline positioning and consistent spacing
  const createPath = (data: number[], startX: number = 0, isFirstSegment: boolean = true, previousEndPoint?: { x: number; y: number }) => {
    if (data.length === 0) return "";
    const height = 100;
    const baselineY = height * BASELINE_POSITION;
    
    let d = "";
    
    if (isFirstSegment) {
      // First segment: start at baseline, then draw all points
      d = `M ${startX} ${baselineY.toFixed(2)}`;
      data.forEach((amp, i) => {
        const x = startX + (i * pointSpacing);
        const yOffset = amp * (baselineY * 0.9);
        const y = baselineY - yOffset;
        d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
      });
    } else if (previousEndPoint && data.length > 0) {
      // Subsequent segments: start directly at first point (no move to baseline, no connection line)
      // This eliminates the vertical line artifact
      const firstX = startX;
      const firstAmp = data[0];
      const firstYOffset = firstAmp * (baselineY * 0.9);
      const firstY = baselineY - firstYOffset;
      
      // Start directly at the first point's coordinates - no baseline, no vertical movement
      d = `M ${firstX.toFixed(2)} ${firstY.toFixed(2)}`;
      
      // Draw the rest of the segment starting from the second point
      for (let i = 1; i < data.length; i++) {
        const x = startX + (i * pointSpacing);
        const amp = data[i];
        const yOffset = amp * (baselineY * 0.9);
        const y = baselineY - yOffset;
        d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
      }
    } else {
      // Fallback: start at baseline
      d = `M ${startX} ${baselineY.toFixed(2)}`;
    data.forEach((amp, i) => {
        const x = startX + (i * pointSpacing);
        const yOffset = amp * (baselineY * 0.9);
        const y = baselineY - yOffset;
        d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
      });
    }
    
    return d;
  };

  // Calculate cumulative X positions for each segment using consistent spacing
  const getSegmentPositions = () => {
    const positions: number[] = [];
    let currentX = 0;
    
    phraseSegments.forEach((segment) => {
      positions.push(currentX);
      currentX += segment.length * pointSpacing;
    });
    
    return positions;
  };

  const segmentPositions = getSegmentPositions();

  // Map amplitude (0-1) to color (cool to warm)
  // Cool colors (low amplitude): blue/purple theme colors
  // Warm colors (high amplitude): orange/red/yellow
  const amplitudeToColor = useCallback((amplitude: number): string => {
    const clamped = Math.max(0, Math.min(1, amplitude));
    
    // Color gradient: Blue (#4A69BB) → Purple (#A8C0FF) → Orange (#FF8C42) → Red (#FF4444)
    // Map amplitude through this spectrum
    if (clamped < 0.33) {
      // Low: Blue to Purple
      const t = clamped / 0.33;
      const r = Math.round(74 + (168 - 74) * t);
      const g = Math.round(105 + (192 - 105) * t);
      const b = Math.round(187 + (255 - 187) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (clamped < 0.66) {
      // Medium: Purple to Orange
      const t = (clamped - 0.33) / 0.33;
      const r = Math.round(168 + (255 - 168) * t);
      const g = Math.round(192 + (140 - 192) * t);
      const b = Math.round(255 + (66 - 255) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // High: Orange to Red
      const t = (clamped - 0.66) / 0.34;
      const r = Math.round(255 + (255 - 255) * t);
      const g = Math.round(140 + (68 - 140) * t);
      const b = Math.round(66 + (68 - 66) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }, []);

  // Generate heatmap gradient path that fills below the baseline
  const createHeatmapPath = useCallback((): string => {
    if (phraseSegments.length === 0 || totalWaveformLength === 0) return "";
    
    const height = 100;
    const baselineY = height * BASELINE_POSITION;
    const effectiveWidth = waveformWidth - RIGHT_PADDING;
    
    // Build path from left to right, sampling amplitude at regular intervals
    // Use the baseline as the top edge of the heatmap area
    let path = `M 0 ${baselineY}`;
    
    // Sample points across the entire waveform
    const samplePoints = Math.min(totalWaveformLength, 400); // Limit samples for performance
    const stepSize = totalWaveformLength / samplePoints;
    
    // Track current position in waveform
    let currentSample = 0;
    let segmentIndex = 0;
    let segmentOffset = 0;
    
    for (let i = 0; i <= samplePoints; i++) {
      const x = (i / samplePoints) * effectiveWidth;
      
      // Find which segment this point belongs to and get its amplitude
      while (segmentIndex < phraseSegments.length && 
             currentSample >= segmentOffset + phraseSegments[segmentIndex].length) {
        segmentOffset += phraseSegments[segmentIndex].length;
        segmentIndex++;
      }
      
      let amplitude = 0;
      if (segmentIndex < phraseSegments.length) {
        const localIndex = Math.floor(currentSample - segmentOffset);
        const segment = phraseSegments[segmentIndex];
        if (localIndex >= 0 && localIndex < segment.length) {
          amplitude = segment[localIndex];
        }
      }
      
      // Map amplitude to opacity/intensity for heatmap
      // Use amplitude directly to determine vertical position (lower = more intense color)
      path += ` L ${x.toFixed(2)} ${baselineY}`;
      
      currentSample += stepSize;
    }
    
    // Close the path at the bottom right and bottom left
    path += ` L ${effectiveWidth} ${height} L 0 ${height} Z`;
    
    return path;
  }, [phraseSegments, totalWaveformLength, waveformWidth, amplitudeToColor]);

  // Generate heatmap gradient stops for SVG LinearGradient
  const generateHeatmapGradient = useCallback(() => {
    if (phraseSegments.length === 0 || totalWaveformLength === 0) return null;
    
    const effectiveWidth = waveformWidth - RIGHT_PADDING;
    const samplePoints = Math.min(totalWaveformLength, 200); // Fewer stops for performance
    const stepSize = totalWaveformLength / samplePoints;
    
    const stops: Array<{ offset: number; color: string }> = [];
    let currentSample = 0;
    let segmentIndex = 0;
    let segmentOffset = 0;
    
    for (let i = 0; i <= samplePoints; i++) {
      const offset = (i / samplePoints) * 100;
      
      // Find amplitude at this point
      while (segmentIndex < phraseSegments.length && 
             currentSample >= segmentOffset + phraseSegments[segmentIndex].length) {
        segmentOffset += phraseSegments[segmentIndex].length;
        segmentIndex++;
      }
      
      let amplitude = 0;
      if (segmentIndex < phraseSegments.length) {
        const localIndex = Math.floor(currentSample - segmentOffset);
        const segment = phraseSegments[segmentIndex];
        if (localIndex >= 0 && localIndex < segment.length) {
          amplitude = segment[localIndex];
        }
      }
      
      const color = amplitudeToColor(amplitude);
      stops.push({ offset, color });
      
      currentSample += stepSize;
    }
    
    return stops;
  }, [phraseSegments, totalWaveformLength, waveformWidth, amplitudeToColor]);

  // Fade in heatmap on mount
  useEffect(() => {
    if (phraseSegments.length > 0) {
      Animated.timing(heatmapOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false, // SVG opacity needs false
      }).start();
    }
  }, [phraseSegments.length]);

  // Scroll to a particular segment when a card is pressed
  const scrollToPhrase = (index: number) => {
    if (index < segmentPositions.length) {
      const scrollX = segmentPositions[index];
    scrollRef.current?.scrollTo({ x: scrollX, animated: true });
    setSelectedPhrase(index);
    }
  };

  // Find which phrase index an x position belongs to
  const getPhraseIndexFromX = (x: number): number => {
    // Clamp x to valid range
    const clampedX = Math.max(0, Math.min(x, waveformWidth));
    for (let i = segmentPositions.length - 1; i >= 0; i--) {
      if (clampedX >= segmentPositions[i]) {
        return i;
      }
    }
    return 0;
  };

  // Handle long press on waveform to add annotation
  const handleLongPress = (event: any) => {
    // Get the touch location relative to the ScrollView content
    const { locationX } = event.nativeEvent;
    // locationX is relative to the View inside ScrollView, which matches waveform coordinates
    const clampedX = Math.max(0, Math.min(locationX, waveformWidth));
    const phraseIdx = getPhraseIndexFromX(clampedX);
    
    setAnnotationXPosition(clampedX);
    setAnnotationPhraseIndex(phraseIdx);
    setAnnotationText("");
    setShowAnnotationModal(true);
  };

  // Save new annotation
  const saveAnnotation = () => {
    if (annotationXPosition !== null && annotationPhraseIndex !== null && annotationText.trim()) {
      const newAnnotation = {
        id: Date.now().toString(),
        xPosition: annotationXPosition,
        phraseIndex: annotationPhraseIndex,
        text: annotationText.trim(),
      };
      setAnnotations([...annotations, newAnnotation]);
      setShowAnnotationModal(false);
      setAnnotationText("");
      setAnnotationXPosition(null);
      setAnnotationPhraseIndex(null);
    }
  };

  // Handle tap on annotation icon
  const handleAnnotationTap = (annotation: { id: string; xPosition: number; phraseIndex: number; text: string }) => {
    if (selectedAnnotation?.id === annotation.id) {
      // If already selected, close tooltip
      setSelectedAnnotation(null);
    } else {
      setSelectedAnnotation(annotation);
      // Optional: scroll to annotation position
      const scrollX = annotation.xPosition - (width * 0.45);
      scrollRef.current?.scrollTo({ x: Math.max(0, scrollX), animated: true });
    }
  };

  // Close annotation tooltip
  const closeAnnotationTooltip = () => {
    setSelectedAnnotation(null);
  };

  // Calculate start and end times for each phrase segment (in milliseconds)
  const getPhraseTimes = (phraseIndex: number) => {
    let startSamples = 0;
    for (let i = 0; i < phraseIndex; i++) {
      startSamples += phraseSegments[i].length;
    }
    const endSamples = startSamples + phraseSegments[phraseIndex].length;
    
    const startTime = startSamples * SAMPLING_INTERVAL; // ms
    const endTime = endSamples * SAMPLING_INTERVAL; // ms
    const duration = endTime - startTime; // ms
    
    return { startTime, endTime, duration };
  };

  // Calculate cursor X position based on playback time
  const getCursorXPosition = (playbackTimeMs: number, phraseIndex: number) => {
    const { startTime, endTime } = getPhraseTimes(phraseIndex);
    const segmentStartX = segmentPositions[phraseIndex];
    const segmentWidth = phraseSegments[phraseIndex].length * pointSpacing;
    
    // Normalize playback time to 0-1 range within the phrase
    const normalizedTime = Math.max(0, Math.min(1, (playbackTimeMs - startTime) / (endTime - startTime)));
    
    return segmentStartX + (normalizedTime * segmentWidth);
  };

  // Stop current playback and cleanup
  const stopPlayback = async () => {
    try {
      // Stop animation
      if (cursorAnimationRef.current) {
        cursorAnimationRef.current.stop();
        cursorAnimationRef.current = null;
      }
      
      // Clear interval
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      
      // Stop and unload sound
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (err) {
          console.log("Error stopping sound:", err);
        }
        soundRef.current = null;
      }
      
      setIsPlaying(false);
      setCurrentPhraseIndex(null);
      cursorPosition.setValue(0);
    } catch (err) {
      console.error("Error in stopPlayback:", err);
    }
  };

  // Play a specific phrase segment
  const playPhrase = async (phraseIndex: number) => {
    if (!audioUri || typeof audioUri !== 'string') {
      console.log("No audio URI available for playback");
      return;
    }

    // Stop any existing playback
    await stopPlayback();

    try {
      // Get phrase timing
      const { startTime, endTime, duration } = getPhraseTimes(phraseIndex);
      
      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
      });

      // Load and create sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false },
        (status) => {
          if (status.isLoaded && 'didJustFinish' in status) {
            playbackStatusRef.current = status;
            if (status.didJustFinish) {
              stopPlayback();
            }
          }
        }
      );

      soundRef.current = sound;

      // Set position to phrase start
      await sound.setPositionAsync(startTime);

      // Calculate cursor positions
      const segmentStartX = segmentPositions[phraseIndex];
      const segmentWidth = phraseSegments[phraseIndex].length * pointSpacing;
      const segmentEndX = segmentStartX + segmentWidth;

      // Set initial cursor position
      cursorPosition.setValue(segmentStartX);

      // Animate cursor from start to end over duration
      cursorAnimationRef.current = Animated.timing(cursorPosition, {
        toValue: segmentEndX,
        duration: duration,
        useNativeDriver: false, // Must be false for SVG transforms
      });

      // Start cursor animation
      cursorAnimationRef.current.start();

      // Update playback state
      setIsPlaying(true);
      setCurrentPhraseIndex(phraseIndex);
      setSelectedPhrase(phraseIndex);
      setSelectedAnnotation(null); // Close annotation tooltip when playback starts

      // Scroll to phrase
      scrollToPhrase(phraseIndex);

      // Play audio
      await sound.playAsync();

      // Poll for playback progress to keep cursor in sync
      playbackIntervalRef.current = setInterval(async () => {
        if (soundRef.current && playbackStatusRef.current?.isLoaded) {
          try {
            const status = await soundRef.current.getStatusAsync();
            if (status.isLoaded && status.isPlaying) {
              const currentPosition = status.positionMillis || 0;
              
              // Check if we've passed the end of the phrase
              if (currentPosition >= endTime) {
                await stopPlayback();
              } else {
                // Update cursor position based on actual playback time
                const cursorX = getCursorXPosition(currentPosition, phraseIndex);
                cursorPosition.setValue(cursorX);
              }
            }
          } catch (err) {
            console.log("Error getting playback status:", err);
          }
        }
      }, 50); // Update every 50ms for smooth cursor movement

    } catch (err) {
      console.error("Error playing phrase:", err);
      await stopPlayback();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  return (
    <LinearGradient colors={["#3C3B6E", "#4A69BB", "#A8C0FF"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Session Review</Text>

        {/* Instruction Banner */}
        <View style={styles.instructionBanner} pointerEvents="none">
          <Text style={styles.instructionText}>
            Visually explore your music — tap any phrase below to highlight and play it. Pinch to zoom, scroll to move, and watch the colors show your sound's energy.
          </Text>
        </View>

        {/* Waveform visualization with zoom and scroll */}
        <View style={styles.waveformContainer}>
          <TapGestureHandler
            ref={doubleTapRef}
            numberOfTaps={2}
            onHandlerStateChange={onDoubleTap}
        >
          <PinchGestureHandler
            onGestureEvent={onPinchEvent}
            onHandlerStateChange={onPinchStateChange}
              simultaneousHandlers={doubleTapRef}
          >
            <Animated.View
                style={[
                  styles.waveformGestureArea,
                  {
                    transform: [{ scale: combinedScale }],
                  },
                ]}
              >
                <LongPressGestureHandler
                  ref={longPressRef}
                  onHandlerStateChange={(event) => {
                    if (event.nativeEvent.state === State.ACTIVE) {
                      handleLongPress(event);
                    }
                  }}
                  minDurationMs={500}
                  simultaneousHandlers={[doubleTapRef]}
                >
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    ref={scrollRef}
                    contentContainerStyle={styles.scrollContent}
                    scrollEnabled={true}
                    bounces={false}
                    scrollEventThrottle={16}
                  >
                    <Pressable
                      style={[
                        styles.waveformWrapper,
                        {
                          width: waveformWidth,
                        },
                      ]}
                      onLongPress={handleLongPress}
                    >
                      <Svg height="100" width={waveformWidth} style={styles.svgContainer}>
                        {/* Heatmap overlay - rendered behind waveform */}
                        <HeatmapLayer
                          phraseSegments={phraseSegments}
                          segmentPositions={segmentPositions}
                          pointSpacing={pointSpacing}
                          waveformWidth={waveformWidth}
                          amplitudeToColor={amplitudeToColor}
                          opacity={heatmapOpacity}
                        />
                        {phraseSegments.map((segment, i) => {
                          const isFirstSegment = i === 0;
                          let previousEndPoint: { x: number; y: number } | undefined;
                          
                          if (!isFirstSegment && i > 0) {
                            // Get the end point of the previous segment
                            const previousSegment = phraseSegments[i - 1];
                            previousEndPoint = getSegmentEndPoint(previousSegment, segmentPositions[i - 1]);
                          }
                          
                          // Enhanced highlighting during playback
                          const isCurrentlyPlaying = isPlaying && currentPhraseIndex === i;
                          const isHighlighted = selectedPhrase === null || selectedPhrase === i || isCurrentlyPlaying;
                          
                          return (
                  <Path
                    key={i}
                              d={createPath(segment, segmentPositions[i], isFirstSegment, previousEndPoint)}
                              stroke={COLORS[i % COLORS.length]}
                              strokeWidth={isCurrentlyPlaying ? 4.5 : (isHighlighted ? 3.5 : 1.5)}
                              strokeOpacity={isHighlighted ? 1 : 0.2}
                    fill="none"
                    strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          );
                        })}
                        {/* Playback cursor line */}
                        {isPlaying && currentPhraseIndex !== null && (
                          <CursorLine cursorX={cursorPosition} />
                        )}
                        {/* Annotation icons */}
                        {annotations.map((annotation) => {
                          const isSelected = selectedAnnotation?.id === annotation.id;
                          const annotationY = BASELINE_POSITION * 100;
                          return (
                            <React.Fragment key={annotation.id}>
                              <Circle
                                cx={annotation.xPosition}
                                cy={annotationY}
                                r={isSelected ? 8 : 6}
                                fill={isSelected ? "#FF6B6B" : "#4A90E2"}
                                stroke="#fff"
                                strokeWidth={1.5}
                              />
                              {/* Annotation indicator line */}
                              {isSelected && (
                                <Line
                                  x1={annotation.xPosition}
                                  y1={annotationY - 15}
                                  x2={annotation.xPosition}
                                  y2={annotationY - 25}
                                  stroke="#4A90E2"
                                  strokeWidth={2}
                                />
                              )}
                            </React.Fragment>
                          );
                        })}
              </Svg>
                      {/* Overlay for annotation taps */}
                      {annotations.map((annotation) => {
                        const annotationY = BASELINE_POSITION * 100;
                        return (
                          <Pressable
                            key={`tap-${annotation.id}`}
                            style={[
                              styles.annotationTapArea,
                              {
                                left: annotation.xPosition - 15,
                                top: annotationY - 15,
                              },
                            ]}
                            onPress={() => handleAnnotationTap(annotation)}
                          />
                        );
                      })}
                    </Pressable>
                  </ScrollView>
                </LongPressGestureHandler>
            </Animated.View>
          </PinchGestureHandler>
          </TapGestureHandler>
        </View>

        {/* Interactive Legend */}
        <View style={styles.legend}>
          {Array.from({ length: totalSegments }, (_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                if (isPlaying && currentPhraseIndex === i) {
                  // If already playing this phrase, stop
                  stopPlayback();
                  setSelectedPhrase(null);
                } else {
                  // Play the phrase
                  playPhrase(i);
                }
              }}
              style={[
                styles.legendItem,
                (selectedPhrase === i || (isPlaying && currentPhraseIndex === i)) && { opacity: 1.0 },
              ]}
            >
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: COLORS[i % COLORS.length] },
                ]}
              />
              <Text
                style={[
                  styles.legendText,
                  (selectedPhrase === i || (isPlaying && currentPhraseIndex === i)) && { fontWeight: "700" },
                ]}
              >
                {`Phrase ${String.fromCharCode(65 + i)}${isPlaying && currentPhraseIndex === i ? ' ▶' : ''}`}
              </Text>
            </TouchableOpacity>
          ))}
          {/* Show All option */}
          <TouchableOpacity
            onPress={() => {
              stopPlayback();
              setSelectedPhrase(null);
              setSelectedAnnotation(null); // Close annotation tooltip
            }}
            style={[
              styles.legendItem,
              selectedPhrase === null && !isPlaying && { opacity: 1.0 },
            ]}
          >
            <View
              style={[
                styles.legendColor,
                styles.legendColorShowAll,
              ]}
            />
            <Text
              style={[
                styles.legendText,
                selectedPhrase === null && !isPlaying && { fontWeight: "700" },
              ]}
            >
              Show All
            </Text>
          </TouchableOpacity>
        </View>

        {/* Interactive Summary Cards - Dynamic */}
        <View style={styles.cards}>
          {feedbackCards.map((card, index) => (
          <TouchableOpacity
              key={index}
              style={[styles.card, { borderLeftColor: card.color }]}
              onPress={() => {
                if (isPlaying && currentPhraseIndex === card.phraseIndex) {
                  // If already playing this phrase, stop
                  stopPlayback();
                  setSelectedPhrase(null);
                } else {
                  // Play the phrase
                  playPhrase(card.phraseIndex);
                }
              }}
            >
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardValue}>{card.value}</Text>
          </TouchableOpacity>
          ))}
        </View>

        {/* Save Session Button */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => router.push("/(tabs)/home")}
        >
          <Text style={styles.saveBtnText}>Save Session ✓</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Annotation Modal */}
      <Modal
        visible={showAnnotationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAnnotationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Note</Text>
            <Text style={styles.modalSubtitle}>
              Phrase {annotationPhraseIndex !== null ? String.fromCharCode(65 + annotationPhraseIndex) : ''}
            </Text>
            <TextInput
              style={styles.annotationInput}
              placeholder="Enter your note..."
              placeholderTextColor="#999"
              value={annotationText}
              onChangeText={setAnnotationText}
              multiline
              autoFocus
              maxLength={200}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowAnnotationModal(false);
                  setAnnotationText("");
                  setAnnotationXPosition(null);
                  setAnnotationPhraseIndex(null);
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={saveAnnotation}
                disabled={!annotationText.trim()}
              >
                <Text style={[styles.modalButtonTextSave, !annotationText.trim() && styles.modalButtonTextDisabled]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Annotation Tooltip */}
      {selectedAnnotation && (
        <Pressable
          style={styles.tooltipOverlay}
          onPress={closeAnnotationTooltip}
        >
          <View style={styles.tooltipContent}>
            <View style={styles.tooltipHeader}>
              <Text style={styles.tooltipEmoji}>📝</Text>
              <Text style={styles.tooltipTitle}>
                Phrase {String.fromCharCode(65 + selectedAnnotation.phraseIndex)}
              </Text>
              <TouchableOpacity onPress={closeAnnotationTooltip} style={styles.tooltipClose}>
                <Text style={styles.tooltipCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.tooltipText}>{selectedAnnotation.text}</Text>
          </View>
        </Pressable>
      )}
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
  instructionBanner: {
    width: "90%",
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  instructionText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 20,
  },
  waveformContainer: {
    width: "100%",
    marginBottom: 15,
    overflow: "hidden",
  },
  waveformGestureArea: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 16,
    padding: 20,
    minHeight: 100,
    overflow: "hidden",
  },
  scrollContent: {
    alignItems: "center",
    minWidth: "100%",
  },
  waveformWrapper: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
    position: "relative",
  },
  svgContainer: {
    width: "100%",
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
  legendColorShowAll: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.6)",
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
  annotationTapArea: {
    position: "absolute",
    width: 30,
    height: 30,
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  annotationInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#f0f0f0",
  },
  modalButtonSave: {
    backgroundColor: "#4A90E2",
  },
  modalButtonTextCancel: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonTextSave: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonTextDisabled: {
    opacity: 0.5,
  },
  tooltipOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  tooltipContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    margin: 20,
    maxWidth: "80%",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  tooltipHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  tooltipEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    flex: 1,
  },
  tooltipClose: {
    padding: 4,
  },
  tooltipCloseText: {
    fontSize: 18,
    color: "#999",
    fontWeight: "bold",
  },
  tooltipText: {
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
  },
});
