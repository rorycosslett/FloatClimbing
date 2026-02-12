import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../context/AuthContext';
import { stravaService } from '../services/stravaService';
import { colors } from '../theme/colors';

type RootStackParamList = {
  Settings: undefined;
  ProfileSettings: undefined;
  GradeSystemsSettings: undefined;
};

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signOut, deleteAccount, isGuest, session } = useAuth();
  const [stravaConnected, setStravaConnected] = useState(false);
  const [stravaLoading, setStravaLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (session) {
      stravaService.isConnected().then(setStravaConnected).catch(console.error);
    }
  }, [session]);

  const handleStravaConnect = async () => {
    setStravaLoading(true);
    try {
      const redirectUri = 'io.climbtracker.app://io.climbtracker.app';
      const url = stravaService.getAuthorizeUrl(redirectUri);
      const result = await WebBrowser.openAuthSessionAsync(url, 'io.climbtracker.app://');

      console.log('Strava OAuth result:', JSON.stringify(result));
      if (result.type === 'success' && result.url) {
        // Strava may return code as a query param on the redirect URI
        const resultUrl = new URL(result.url);
        const code = resultUrl.searchParams.get('code');
        console.log('Strava auth code:', code);
        if (code) {
          const success = await stravaService.exchangeCodeForTokens(code);
          console.log('Strava token exchange success:', success);
          setStravaConnected(success);
          if (!success) {
            Alert.alert('Error', 'Failed to exchange Strava token.');
          }
        } else {
          console.log('No code found in URL:', result.url);
          Alert.alert('Error', 'No authorization code received from Strava.');
        }
      }
    } catch (error) {
      console.error('Strava connect error:', error);
      Alert.alert('Error', 'Failed to connect Strava. Please try again.');
    } finally {
      setStravaLoading(false);
    }
  };

  const handleStravaDisconnect = () => {
    Alert.alert('Disconnect Strava', 'Sessions will no longer be posted to Strava.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          const success = await stravaService.disconnect();
          if (success) setStravaConnected(false);
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your climbing data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'All your sessions, climbs, and profile data will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await deleteAccount();
                    } catch (error) {
                      console.error('Delete account error:', error);
                      Alert.alert('Error', 'Failed to delete account. Please try again.');
                      setDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            console.error('Sign out error:', error);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.menuCard}>
          {!isGuest && (
            <>
              <Pressable
                style={styles.menuRow}
                onPress={() => navigation.navigate('ProfileSettings')}
              >
                <View style={styles.menuRowLeft}>
                  <Ionicons name="person-outline" size={22} color={colors.text} />
                  <Text style={styles.menuRowLabel}>Profile</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>
              <View style={styles.separator} />
            </>
          )}

          <Pressable
            style={styles.menuRow}
            onPress={() => navigation.navigate('GradeSystemsSettings')}
          >
            <View style={styles.menuRowLeft}>
              <Ionicons name="speedometer-outline" size={22} color={colors.text} />
              <Text style={styles.menuRowLabel}>Grade Systems</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>

          {session && (
            <>
              <View style={styles.separator} />
              <Pressable
                style={styles.menuRow}
                onPress={stravaConnected ? handleStravaDisconnect : handleStravaConnect}
                disabled={stravaLoading}
              >
                <View style={styles.menuRowLeft}>
                  <Ionicons name="fitness-outline" size={22} color={colors.text} />
                  <Text style={styles.menuRowLabel}>Strava</Text>
                </View>
                {stravaLoading ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : stravaConnected ? (
                  <View style={styles.stravaStatus}>
                    <Text style={styles.stravaConnectedText}>Connected</Text>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  </View>
                ) : (
                  <View style={styles.stravaStatus}>
                    <Text style={styles.stravaConnectText}>Connect</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </View>
                )}
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.logOutCard}>
          <Pressable style={styles.menuRow} onPress={handleSignOut}>
            <View style={styles.menuRowLeft}>
              <Ionicons name="log-out-outline" size={22} color={colors.danger} />
              <Text style={[styles.menuRowLabel, { color: colors.danger }]}>Log Out</Text>
            </View>
          </Pressable>
        </View>

        {!isGuest && (
          <Pressable
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
            disabled={deleting}
          >
            <Text style={styles.deleteAccountText}>
              {deleting ? 'Deleting Account...' : 'Delete Account'}
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  stravaStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stravaConnectedText: {
    color: colors.success,
    fontSize: 14,
  },
  stravaConnectText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  logOutCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 24,
  },
  deleteAccountButton: {
    alignItems: 'center',
    marginTop: 'auto' as const,
    paddingVertical: 16,
  },
  deleteAccountText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuRowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 50,
  },
});
