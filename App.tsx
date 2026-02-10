import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast, { BaseToastProps } from 'react-native-toast-message';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ClimbProvider } from './src/context/ClimbContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { SocialProvider } from './src/context/SocialContext';
import { colors } from './src/theme/colors';
import LoginScreen from './src/screens/LoginScreen';
import LogScreen from './src/screens/LogScreen';
import FeedScreen from './src/screens/FeedScreen';
import YouScreen from './src/screens/YouScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import EditSessionScreen from './src/screens/EditSessionScreen';
import SearchUsersScreen from './src/screens/SearchUsersScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import FollowListScreen from './src/screens/FollowListScreen';
import ProfileSettingsScreen from './src/screens/ProfileSettingsScreen';
import GradeSystemsSettingsScreen from './src/screens/GradeSystemsSettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const toastConfig = {
  success: ({ text1 }: BaseToastProps) => (
    <View style={styles.toastContainer}>
      <Text style={styles.toastText}>{text1}</Text>
    </View>
  ),
};

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Log"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 10,
          paddingBottom: 20,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={FeedScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={28} color={color} />,
        }}
      />
      <Tab.Screen
        name="Log"
        component={LogScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="add-circle-outline" size={28} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="You"
        component={YouScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={28} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function AppNavigator() {
  const { session, isLoading, isGuest } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show login screen if not authenticated and not in guest mode
  if (!session && !isGuest) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  // Show main app for authenticated users or guests
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
      <Stack.Screen name="GradeSystemsSettings" component={GradeSystemsSettingsScreen} />
      <Stack.Screen name="EditSession" component={EditSessionScreen} />
      <Stack.Screen name="SearchUsers" component={SearchUsersScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="FollowList" component={FollowListScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <SettingsProvider>
            <ClimbProvider>
              <SocialProvider>
                <NavigationContainer>
                  <AppNavigator />
                  <StatusBar style="light" />
                </NavigationContainer>
                <Toast config={toastConfig} />
              </SocialProvider>
            </ClimbProvider>
          </SettingsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  toastContainer: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toastText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
});
