import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme, Platform, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

import { AppProvider } from './src/utils/AppContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import HabitsScreen from './src/screens/HabitsScreen';
import StatsScreen from './src/screens/StatsScreen';
import LogScreen from './src/screens/LogScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { isOnboardingDone, setOnboardingDone } from './src/utils/storage';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          borderTopColor: isDark ? '#3A3A3C' : '#E9ECEF',
          borderTopWidth: 0.5,
          height: (Platform.OS === 'ios' ? 88 : 60) + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 8 },
            android: { elevation: 8 },
          }),
        },
        tabBarActiveTintColor: '#4F8EF7',
        tabBarInactiveTintColor: isDark ? '#636366' : '#9CA3AF',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
          else if (route.name === 'Stats') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          else if (route.name === 'Calendar') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Habits') iconName = focused ? 'list' : 'list-outline';
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Hoy' }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ tabBarLabel: 'Stats' }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ tabBarLabel: 'Historial' }} />
      <Tab.Screen name="Habits" component={HabitsScreen} options={{ tabBarLabel: 'Hábitos' }} />
    </Tab.Navigator>
  );
}

function MainWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <HomeTabs />
    </ErrorBoundary>
  );
}

function LogWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <LogScreen />
    </ErrorBoundary>
  );
}

export default function App() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const [showOnboarding, setShowOnboarding] = useState(null);

  useEffect(() => {
    (async () => {
      const done = await isOnboardingDone();
      setShowOnboarding(!done);
    })();
  }, []);

  const handleOnboardingDone = async () => {
    await setOnboardingDone();
    setShowOnboarding(false);
  };

  if (showOnboarding === null) return null;

  if (showOnboarding) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar
            barStyle={isDark ? 'light-content' : 'dark-content'}
            backgroundColor={isDark ? '#000000' : '#F8F9FA'}
            translucent={false}
          />
          <OnboardingScreen onDone={handleOnboardingDone} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? '#000000' : '#F8F9FA'}
          translucent={false}
        />
        <AppProvider>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Main" component={MainWithErrorBoundary} />
              <Stack.Screen
                name="Log"
                component={LogWithErrorBoundary}
                options={{ presentation: 'modal' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
