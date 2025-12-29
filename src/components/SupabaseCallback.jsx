import { useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabase';

const SupabaseCallback = () => {
  const ranRef = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const run = async () => {
      try {
        // For OAuth code flow with PKCE.
        // If the URL doesn't contain a code, this will no-op / error, so we fall back.
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (exchangeError) {
          // If already signed in or no code present, we can still proceed.
          // Keep the message only if it looks like a real failure.
          const message = exchangeError?.message || String(exchangeError);
          const looksBenign = /no code|code verifier|code challenge/i.test(message);
          if (!looksBenign) {
            setError(message);
          }
        }
      } catch (err) {
        setError(err?.message || String(err));
      } finally {
        // Clean URL and go back to app root.
        window.history.replaceState({}, document.title, '/');
        window.location.replace('/');
      }
    };

    run();
  }, []);

  return (
    <div style={{ padding: '2rem', color: '#fff' }}>
      <h2>Signing you in…</h2>
      {error ? <p style={{ opacity: 0.8 }}>Error: {error}</p> : null}
    </div>
  );
};

export default SupabaseCallback;
