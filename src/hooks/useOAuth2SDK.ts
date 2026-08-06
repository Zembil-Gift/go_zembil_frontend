import { useEffect, useState } from 'react';

const GOOGLE_SDK_URL = 'https://accounts.google.com/gsi/client';
const APPLE_SDK_URL =
  'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

// Module-level so the scripts are only ever appended once, no matter how many
// components mount the hook.
const scriptStates: Record<string, 'loading' | 'ready' | 'failed'> = {};
const scriptListeners: Record<string, Array<(ok: boolean) => void>> = {};

function loadScript(url: string, onDone: (ok: boolean) => void) {
  if (scriptStates[url] === 'ready') return onDone(true);
  if (scriptStates[url] === 'failed') return onDone(false);

  (scriptListeners[url] ||= []).push(onDone);
  if (scriptStates[url] === 'loading') return;

  scriptStates[url] = 'loading';
  const script = document.createElement('script');
  script.src = url;
  script.async = true;
  script.defer = true;
  const finish = (ok: boolean) => {
    scriptStates[url] = ok ? 'ready' : 'failed';
    scriptListeners[url]?.forEach((cb) => cb(ok));
    scriptListeners[url] = [];
  };
  script.onload = () => finish(true);
  script.onerror = () => {
    console.error(`Failed to load OAuth2 SDK: ${url}`);
    finish(false);
  };
  document.head.appendChild(script);
}

export function useOAuth2SDK() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const appleClientId = import.meta.env.VITE_APPLE_CLIENT_ID;

  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [isAppleReady, setIsAppleReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (googleClientId) {
      loadScript(GOOGLE_SDK_URL, (ok) => !cancelled && setIsGoogleReady(ok));
    }
    return () => {
      cancelled = true;
    };
  }, [googleClientId]);

  useEffect(() => {
    let cancelled = false;
    if (appleClientId) {
      loadScript(APPLE_SDK_URL, (ok) => !cancelled && setIsAppleReady(ok));
    }
    return () => {
      cancelled = true;
    };
  }, [appleClientId]);

  return {
    isGoogleReady,
    isAppleReady,
    hasGoogleConfig: !!googleClientId,
    hasAppleConfig: !!appleClientId,
  };
}
