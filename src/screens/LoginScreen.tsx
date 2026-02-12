import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function LoginScreen() {
  const { signInWithGoogle, signInWithApple, continueAsGuest } = useAuth();
  const [isLoading, setIsLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading('google');
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      console.error('Google sign-in error:', e);
      setError(e instanceof Error ? e.message : 'Failed to sign in with Google');
    } finally {
      setIsLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading('apple');
    setError(null);
    try {
      await signInWithApple();
    } catch (e: unknown) {
      console.error('Apple sign-in error:', e);
      setError(e instanceof Error ? e.message : 'Failed to sign in with Apple');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../../assets/largelogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>
            Log your climbing sessions. Improve with data insights. Get inspired by other climbers.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={[styles.button, styles.googleButton]}
            onPress={handleGoogleSignIn}
            disabled={isLoading !== null}
          >
            {isLoading === 'google' ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color={colors.text} />
                <Text style={styles.buttonText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.button, styles.appleButton]}
            onPress={handleAppleSignIn}
            disabled={isLoading !== null}
          >
            {isLoading === 'apple' ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Ionicons name="logo-apple" size={20} color={colors.background} />
                <Text style={[styles.buttonText, styles.appleButtonText]}>Continue with Apple</Text>
              </>
            )}
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={[styles.button, styles.guestButton]}
            onPress={continueAsGuest}
            disabled={isLoading !== null}
          >
            <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
          </Pressable>

          <Text style={styles.guestNote}>
            Guest data stays on this device only. Sign in to sync across devices and access social
            features.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  logo: {
    width: 280,
    height: 140,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    marginBottom: 40,
  },
  errorContainer: {
    backgroundColor: colors.danger + '20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  googleButton: {
    backgroundColor: colors.surfaceSecondary,
  },
  appleButton: {
    backgroundColor: colors.text,
  },
  guestButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  appleButtonText: {
    color: colors.background,
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textSecondary,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  guestNote: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
});
