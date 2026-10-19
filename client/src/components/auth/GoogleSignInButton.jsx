import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { googleLoginUser, getErrorMessage } from '../../services/api';

const GoogleIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export default function GoogleSignInButton({
  onSuccess,
  onError,
  loading = false,
  setLoading = () => {},
  isSignUp = false,
}) {
  const buttonRef = useRef(null);
  const [configMissing, setConfigMissing] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleCredentialResponse = async (response) => {
    if (loading) return;

    if (!response?.credential) {
      if (onError) onError('Google authentication returned an empty credential.');
      return;
    }

    setLoading(true);
    try {
      const result = await googleLoginUser({
        idToken: response.credential,
      });

      if (result?.success && result?.token) {
        if (onSuccess) onSuccess(result);
      } else {
        if (onError) onError(result?.message || 'Google authentication failed.');
      }
    } catch (err) {
      if (onError) onError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!clientId || !clientId.trim()) {
      setConfigMissing(true);
      return;
    }

    let isMounted = true;

    const renderGsiButton = () => {
      if (!window.google?.accounts?.id || !isMounted || !buttonRef.current) {
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: clientId.trim(),
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Calculate safe responsive width within Google GSI allowed range [200, 400]
        const containerWidth = buttonRef.current?.parentElement?.offsetWidth || buttonRef.current?.offsetWidth || 0;
        const safeWidth = containerWidth > 0
          ? Math.max(200, Math.min(Math.floor(containerWidth), 400))
          : 250;

        buttonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: isSignUp ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: safeWidth,
        });

        setScriptLoaded(true);
      } catch (err) {
        console.warn('[FlowForge AI] Google Identity Services initialization error:', err);
      }
    };

    if (window.google?.accounts?.id) {
      renderGsiButton();
    } else {
      let script = document.getElementById('google-gsi-client');
      if (!script) {
        script = document.createElement('script');
        script.id = 'google-gsi-client';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = renderGsiButton;
        script.onerror = () => {
          if (isMounted) setScriptError(true);
        };
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', renderGsiButton);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [clientId, isSignUp]);

  if (configMissing) {
    return (
      <div className="space-y-1.5">
        <button
          type="button"
          disabled
          className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 rounded-xl bg-[#0B0D0C]/60 border border-[rgba(185,176,160,0.12)] text-[#B9B0A0]/60 text-sm font-medium cursor-not-allowed transition-all"
        >
          <GoogleIcon className="w-4 h-4 opacity-50" />
          <span>Continue with Google</span>
        </button>
        <p className="text-[11px] text-[#B9B0A0]/60 text-center flex items-center justify-center space-x-1">
          <AlertCircle className="w-3 h-3 text-[#E5B45B]/60 inline flex-shrink-0" />
          <span>Requires <code className="text-[#E5B45B]/80 font-mono">VITE_GOOGLE_CLIENT_ID</code> in environment.</span>
        </p>
      </div>
    );
  }

  if (scriptError) {
    return (
      <div className="p-3 rounded-xl bg-[#C83C3C]/10 border border-[#C83C3C]/20 text-xs text-[#C83C3C] text-center">
        Unable to load Google Identity Services. Please check your network connection.
      </div>
    );
  }

  return (
    <div className="w-full relative flex flex-col items-center">
      {/* Fallback / Loading skeleton while Google iframe initializes */}
      {!scriptLoaded && (
        <div className="w-full h-[40px] rounded-xl bg-[#0B0D0C] border border-[rgba(185,176,160,0.14)] flex items-center justify-center space-x-2 text-xs text-[#B9B0A0]">
          <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin text-[#E5B45B]" />
          <span>Connecting to Google...</span>
        </div>
      )}

      {/* Target container for Google's official GIS button */}
      <div
        ref={buttonRef}
        className={`w-full flex justify-center ${!scriptLoaded ? 'invisible h-0 overflow-hidden' : ''}`}
        style={{ minHeight: scriptLoaded ? '40px' : '0px' }}
      />

      {loading && (
        <div className="absolute inset-0 bg-[#151715]/80 backdrop-blur-sm rounded-xl flex items-center justify-center space-x-2 text-xs text-[#E5B45B] font-medium z-10">
          <Loader2 className="w-4 h-4 motion-safe:animate-spin text-[#E5B45B]" />
          <span>Verifying with FlowForge...</span>
        </div>
      )}
    </div>
  );
}
