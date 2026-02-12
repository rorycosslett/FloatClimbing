import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../services/supabase';

// Required for OAuth to work properly on native
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Force the native scheme - Expo Go won't work, requires development build
  const redirectUrl = 'io.climbtracker.app://auth/callback';

  console.log('Expo Linking redirect URL:', redirectUrl);

  useEffect(() => {
    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error getting initial session:', error);
        setIsLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setIsGuest(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithOAuth = async (provider: 'google' | 'apple') => {
    try {
      console.log('=== OAuth Debug ===');
      console.log('Provider:', provider);
      console.log('App Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('Supabase OAuth error:', error);
        throw error;
      }
      if (!data.url) throw new Error('No OAuth URL returned');

      console.log('OAuth URL:', data.url);

      // Open the OAuth URL in a browser
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      console.log('WebBrowser result type:', result.type);

      if (result.type === 'success' && result.url) {
        console.log('Success URL:', result.url);

        // Check if there's an error in the URL
        const url = new URL(result.url);
        const errorParam = url.searchParams.get('error') || url.hash.includes('error');
        const errorDescription = url.searchParams.get('error_description');

        if (errorParam) {
          console.error('OAuth error in callback:', errorParam, errorDescription);
          throw new Error(errorDescription || 'OAuth authentication failed');
        }

        // Extract the tokens from the URL (could be in hash or query params)
        let accessToken: string | null = null;
        let refreshToken: string | null = null;

        // Try hash first (implicit flow)
        if (url.hash) {
          const hashParams = new URLSearchParams(url.hash.substring(1));
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
        }

        // Try query params (PKCE flow)
        if (!accessToken) {
          accessToken = url.searchParams.get('access_token');
          refreshToken = url.searchParams.get('refresh_token');
        }

        console.log('Access token found:', !!accessToken);
        console.log('Refresh token found:', !!refreshToken);

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) {
            console.error('Session error:', sessionError);
            throw sessionError;
          }
          console.log('Session set successfully!');
        } else {
          console.warn('No tokens found in callback URL');
        }
      } else if (result.type === 'cancel') {
        console.log('User cancelled OAuth');
      } else if (result.type === 'dismiss') {
        console.log('OAuth dismissed');
      }
    } catch (err) {
      console.error('signInWithOAuth error:', err);
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    await signInWithOAuth('google');
  };

  const signInWithApple = async () => {
    await signInWithOAuth('apple');
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setIsGuest(false);
  };

  const deleteAccount = async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    if (!currentSession) {
      throw new Error('No active session. Please sign in again.');
    }

    const { error } = await supabase.functions.invoke('delete-account', {
      body: {},
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
      },
    });
    if (error) {
      console.error('Delete account error:', error);
      throw new Error('Failed to delete account. Please try again.');
    }
    await supabase.auth.signOut();
    setIsGuest(false);
  };

  const continueAsGuest = () => {
    setIsGuest(true);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        isGuest,
        signInWithGoogle,
        signInWithApple,
        signOut,
        deleteAccount,
        continueAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
