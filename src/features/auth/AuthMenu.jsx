import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../providers/AuthProvider.jsx';
import { useDialogFocus } from '../../hooks/useDialogFocus';

const AuthMenu = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const authBtnRef = useRef(null);
  const authPopoverRef = useRef(null);
  const closeAuth = useCallback(() => setShowAuth(false), []);

  useDialogFocus({ open: showAuth, onClose: closeAuth, dialogRef: authPopoverRef });

  const { loading: authLoading, user, signInWithPassword, signUp, signInWithOAuth, signOut } = useAuth();

  useEffect(() => {
    if (!showAuth) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') setShowAuth(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showAuth]);

  useEffect(() => {
    if (!showAuth) return;

    const onPointerDown = (e) => {
      const popoverEl = authPopoverRef.current;
      const buttonEl = authBtnRef.current;
      if (popoverEl && popoverEl.contains(e.target)) return;
      if (buttonEl && buttonEl.contains(e.target)) return;
      setShowAuth(false);
    };

    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [showAuth]);

  const redirectTo = `${window.location.origin}/auth-callback`;

  const handleOAuth = async (provider) => {
    setAuthError('');
    setAuthBusy(true);
    try {
      const { error } = await signInWithOAuth({ provider, redirectTo });
      if (error) setAuthError(error.message || String(error));
    } catch (err) {
      setAuthError(err?.message || String(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleEmailSignIn = async () => {
    const email = String(authEmail || '').trim();
    const password = String(authPassword || '');
    if (!email || !password) {
      setAuthError('Email and password are required.');
      return;
    }

    setAuthError('');
    setAuthBusy(true);
    try {
      const { error } = await signInWithPassword({ email, password });
      if (error) setAuthError(error.message || String(error));
      else setShowAuth(false);
    } catch (err) {
      setAuthError(err?.message || String(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleEmailSignUp = async () => {
    const email = String(authEmail || '').trim();
    const password = String(authPassword || '');
    if (!email || !password) {
      setAuthError('Email and password are required.');
      return;
    }

    setAuthError('');
    setAuthBusy(true);
    try {
      const { error } = await signUp({ email, password });
      if (error) {
        setAuthError(error.message || String(error));
      } else {
        setShowAuth(false);
      }
    } catch (err) {
      setAuthError(err?.message || String(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setAuthError('');
    setAuthBusy(true);
    try {
      const { error } = await signOut();
      if (error) setAuthError(error.message || String(error));
      else setShowAuth(false);
    } catch (err) {
      setAuthError(err?.message || String(err));
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <>
      <button
        ref={authBtnRef}
        className={`auth-btn ${user ? 'signed-in' : ''}`}
        onClick={() => {
          setAuthError('');
          setShowAuth(v => !v);
        }}
        title={user ? 'Account' : 'Sign in'}
        aria-label={user ? 'Account' : 'Sign in'}
        aria-expanded={showAuth}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span>{user ? 'Account' : 'Sign in'}</span>
      </button>

      {showAuth && (
        <div ref={authPopoverRef} className="auth-popover glass-panel" role="dialog" aria-modal="true" aria-label="Authentication">
          <div className="auth-popover-header">
            <div className="auth-title">{user ? 'Account' : 'Sign in'}</div>
            <button className="auth-close" onClick={() => setShowAuth(false)} aria-label="Close">×</button>
          </div>

          {authLoading ? (
            <div className="auth-muted">Loading…</div>
          ) : user ? (
            <>
              <div className="auth-muted">Signed in as</div>
              <div className="auth-strong">{user.email || user.id}</div>
              <button className="auth-primary" disabled={authBusy} onClick={handleLogout}>
                {authBusy ? 'Signing out…' : 'Sign out'}
              </button>
            </>
          ) : (
            <>
              <div className="auth-benefits">
                <div className="auth-benefits-title">✨ Why create an account?</div>
                <ul className="auth-benefits-list">
                  <li>🔄 Sync your data across all devices</li>
                  <li>💾 Never lose your progress or stats</li>
                  <li>📊 Access your reports anywhere</li>
                </ul>
              </div>

              <div className="auth-fields">
                <input
                  type="email"
                  placeholder="Email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  autoComplete="email"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <div className="auth-actions">
                <button className="auth-primary" disabled={authBusy} onClick={handleEmailSignIn}>
                  {authBusy ? 'Please wait…' : 'Sign in'}
                </button>
                <button className="auth-secondary" disabled={authBusy} onClick={handleEmailSignUp}>
                  Sign up
                </button>
              </div>

              <div className="auth-divider"><span>or</span></div>

              <div className="auth-oauth">
                <button
                  type="button"
                  className="auth-provider"
                  disabled={authBusy}
                  onClick={() => handleOAuth('github')}
                  aria-label="Continue with GitHub"
                  title="Continue with GitHub"
                >
                  <img className="auth-provider-logo auth-provider-logo--github" src="/logos/github.png" alt="" aria-hidden="true" />
                  <span className="sr-only">Continue with GitHub</span>
                </button>
                <button
                  type="button"
                  className="auth-provider"
                  disabled={authBusy}
                  onClick={() => handleOAuth('google')}
                  aria-label="Continue with Google"
                  title="Continue with Google"
                >
                  <img className="auth-provider-logo" src="/logos/google.png" alt="" aria-hidden="true" />
                  <span className="sr-only">Continue with Google</span>
                </button>
              </div>
            </>
          )}

          {authError ? <div className="auth-error">{authError}</div> : null}
        </div>
      )}
    </>
  );
};

export default AuthMenu;
