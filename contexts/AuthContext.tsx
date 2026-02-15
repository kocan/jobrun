import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** True when user tapped "Skip" on the login screen */
  skippedAuth: boolean;
  /** Whether Supabase is configured at all */
  isConfigured: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  skipAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [skippedAuth, setSkippedAuth] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      // Not configured — go straight to local-only mode
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle deep links for magic link callback
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const handleUrl = async (url: string) => {
      if (url.includes('access_token') || url.includes('refresh_token')) {
        // Extract tokens from the URL fragment
        const params = new URLSearchParams(url.split('#')[1] ?? url.split('?')[1] ?? '');
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      }
    };

    // Handle URL the app was opened with
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // Listen for new URLs while app is open
    const sub = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => sub.remove();
  }, []);

  const signInWithMagicLink = useCallback(async (email: string): Promise<{ error: string | null }> => {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: 'Supabase is not configured. Please set up environment variables.' };
    }

    const redirectUrl = Linking.createURL('auth/callback');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl },
    });

    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setSkippedAuth(false);
  }, []);

  const skipAuth = useCallback(() => {
    setSkippedAuth(true);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      skippedAuth,
      isConfigured: isSupabaseConfigured,
      signInWithMagicLink,
      signOut,
      skipAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
