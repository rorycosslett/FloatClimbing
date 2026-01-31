import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast, { BaseToast, BaseToastProps } from 'react-native-toast-message';

import { ClimbProvider } from './src/context/ClimbContext';
import { colors } from './src/theme/colors';
import LogScreen from './src/screens/LogScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ReportScreen from './src/screens/ReportScreen';

const Tab = createBottomTabNavigator();

const toastConfig = {
  success: ({ text1 }: BaseToastProps) => (
    <View style={styles.toastContainer}>
      <Text style={styles.toastText}>{text1}</Text>
    </View>
  ),
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ClimbProvider>
        <NavigationContainer>
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
              name="History"
              component={HistoryScreen}
              options={{
                tabBarIcon: ({ color }) => <Ionicons name="time-outline" size={28} color={color} />,
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
              name="Insights"
              component={ReportScreen}
              options={{
                tabBarIcon: ({ color }) => <Ionicons name="trending-up" size={28} color={color} />,
              }}
            />
          </Tab.Navigator>
          <StatusBar style="light" />
        </NavigationContainer>
        <Toast config={toastConfig} />
      </ClimbProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
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
