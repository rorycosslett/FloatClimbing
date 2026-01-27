import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';

import { ClimbProvider } from './src/context/ClimbContext';
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
              tabBarActiveTintColor: '#007aff',
              tabBarInactiveTintColor: '#8e8e93',
              tabBarStyle: {
                backgroundColor: '#fff',
                borderTopColor: '#e5e5e5',
                paddingTop: 8,
                paddingBottom: 24,
                height: 80,
              },
              tabBarLabelStyle: {
                fontSize: 10,
              },
            }}
          >
            <Tab.Screen
              name="Log"
              component={LogScreen}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 24, color }}>+</Text>
                ),
              }}
            />
            <Tab.Screen
              name="History"
              component={HistoryScreen}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 24, color }}>☰</Text>
                ),
              }}
            />
            <Tab.Screen
              name="Report"
              component={ReportScreen}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 24, color }}>▤</Text>
                ),
              }}
            />
          </Tab.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </ClimbProvider>
    </SafeAreaProvider>
  );
}
