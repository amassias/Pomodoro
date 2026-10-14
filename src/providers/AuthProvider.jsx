import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (!supabase) return;
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;
        setSession(data.session ?? null);
      } catch (err) {
        console.warn('Supabase getSession failed', err);
        if (mounted) setSession(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase?.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession ?? null);
      setLoading(false);
    }) ?? { data: { subscription: null } };

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo(() => {
    const unavailable = () => ({ data: null, error: new Error('Account services are not configured. Your local workspace is still available.') });
    const user = session?.user ?? null;

    return {
      loading,
      session,
      user,
      signInWithPassword: async ({ email, password }) => {
        if (!supabase) return unavailable();
        return supabase.auth.signInWithPassword({ email, password });
      },
      signUp: async ({ email, password }) => {
        if (!supabase) return unavailable();
        return supabase.auth.signUp({ email, password });
      },
      signInWithOAuth: async ({ provider, redirectTo }) => {
        if (!supabase) return unavailable();
        return supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
          },
        });
      },
      signOut: async () => {
        if (!supabase) return unavailable();
        return supabase.auth.signOut();
      },
    };
  }, [loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
