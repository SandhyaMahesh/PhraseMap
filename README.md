# PhraseMap — Implementation Prototype (Assignment 5)

**Team:** Caroline Begg, Sandy Mahesh, Sarah Mosalem  
**Course:** HCI Studio — Fall 2025  
**Mentor Meeting Date:** Tuesday, November 4, 2025  
**YouTube Demo:** [https://youtu.be/dl8N_6LQeEs](https://youtu.be/dl8N_6LQeEs)  
**Repository:** [https://github.com/SandhyaMahesh/PhraseMap](https://github.com/SandhyaMahesh/PhraseMap)

## Overview

**PhraseMap** is an interactive mobile prototype that visualizes musical phrasing in real time.  
It captures live microphone input, converts it into a waveform visualization, and allows musicians to segment and review their performances.

Built using **React Native** and **Expo**, PhraseMap integrates **Expo AV** for audio capture, **React Native SVG** for waveform visualization, and **Expo Router** for seamless navigation across multiple interactive screens.

---

## Get Started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```
Run on device
Open Expo Go on your iPhone (download if not installed)
Tap “Scan QR Code” and scan the QR code shown in your terminal or browser.
The app will load the PhraseMap home screen automatically.

## Navigation

Screen, 	Path,	Description
Home,	/home,	Displays the project title and session setup.
Mark Phase,	/mark-phase,	Captures live microphone input and draws waveform visualization.
Session Review,	/session-review,	Displays color-coded phrase sections and performance summaries.
Saved Sessions,	/saved-sessions,	Shows a scrollable list of past practice sessions.

## File Structure

PhraseMap/
│
├── app/
│   ├── (tabs)/
│   │   ├── home.tsx                # Hello World / Hello Styles
│   │   ├── mark-phase.tsx          # Audio input + waveform visualization
│   │   ├── session-review.tsx      # Data visualization + analytics
│   │   ├── saved-sessions.tsx      # Saved sessions summary
│   │   └── layout.tsx              # Navigation layout (Expo Router)
│   │
│   ├── index.tsx                   # Redirects root to home tab
│
├── package.json
├── app.json
├── README.md
└── assets/

## Implementation summary
1. “Hello World” Application
- Framework: React Native + Expo
- Verifies successful environment setup and correct navigation routing.
- Files: index.tsx, home.tsx

2. “Hello Styles”
- Implements consistent gradient theme and typography.
- Files: layout.tsx, shared styling in home.tsx, session-review.tsx

3. Custom Input Capture
- Captures real-time audio input using the device microphone.
- APIs: Expo AV (expo-av)
- Files: mark-phase.tsx

4. Custom Data Visualization
- Renders a continuous waveform using React Native SVG (react-native-svg).
- Driven by live amplitude data from the microphone.
- Files: mark-phase.tsx

5. Custom Interaction
- “Mark Phrase” button logs phrase boundaries and animates feedback.
- Files: mark-phase.tsx

6. Multi-Screen Navigation + Data Transfer
- Uses Expo Router to pass waveform and phrase data between screens.
- Files: mark-phase.tsx, session-review.tsx

7. Post-Session Visualization
- Displays color-coded waveform segments for each marked phrase.
- Provides summary cards (Stability, Expression, Focus).
- Files: session-review.tsx

8. Data Presentation
- Displays mock session summaries with progress bars.
- Files: saved-sessions.tsx

## Libraries and APIs Used
Library,	Purpose
Expo AV (expo-av),	Microphone recording and audio input.
React Native SVG (react-native-svg),	Dynamic waveform drawing.
Expo Linear Gradient (expo-linear-gradient),	App-wide gradient theme.
Expo Router,	Navigation and parameter passing between screens.

