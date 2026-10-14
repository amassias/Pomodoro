import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

const SupabaseCallback = () => {
  const ranRef = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const run = async () => {
      try {
        if (!supabase) throw new Error('Account services are not configured.');
        const params = new URLSearchParams(window.location.search);
        if (params.get('error')) throw new Error(params.get('error_description') || params.get('error'));
        const code = params.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else {
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          if (!data.session) throw new Error('No sign-in session was returned. Please try again.');
        }
        window.location.replace('/');
      } catch (err) {
        setError(err?.message || String(err));
        window.history.replaceState({}, document.title, '/auth-callback');
      }
    };

    run();
  }, []);

  return (
    <div style={{ padding: '2rem', color: '#fff' }}>
      <h2>{error ? 'Sign-in could not finish' : 'Signing you in…'}</h2>
      {error ? <><p role="alert">{error}</p><a href="/">Back to your workspace</a></> : null}
    </div>
  );
};

export default SupabaseCallback;
