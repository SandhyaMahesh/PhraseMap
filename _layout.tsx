import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      
      {/* HOME (Main screen) */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />

      {/* MARK PHASE */}
      <Tabs.Screen
        name="mark-phase"
        options={{
          title: 'Mark',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="waveform.path.ecg" color={color} />,
        }}
      />

      {/* SESSION REVIEW */}
      <Tabs.Screen
        name="session-review"
        options={{
          title: 'Review',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
      />

      {/* SAVED SESSIONS */}
      <Tabs.Screen
        name="saved-sessions"
        options={{
          title: 'Sessions',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="clock.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
