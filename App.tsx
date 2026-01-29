import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { ClimbProvider } from './src/context/ClimbContext';
import { colors } from './src/theme/colors';
import LogScreen from './src/screens/LogScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ReportScreen from './src/screens/ReportScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <ClimbProvider>
        <NavigationContainer>
          <Tab.Navigator
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
              name="Log"
              component={LogScreen}
              options={{
                tabBarIcon: ({ color }) => (
                  <Ionicons name="add-circle-outline" size={28} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="History"
              component={HistoryScreen}
              options={{
                tabBarIcon: ({ color }) => <Ionicons name="time-outline" size={28} color={color} />,
              }}
            />
            <Tab.Screen
              name="Insights"
              component={ReportScreen}
              options={{
                tabBarIcon: ({ color }) => <Ionicons name="trending-up" size={28} color={color} />,
              }}
            />
          </Tab.Navigator>
          <StatusBar style="light" />
        </NavigationContainer>
        <Toast />
      </ClimbProvider>
    </SafeAreaProvider>
  );
}
