import { useEffect, useState } from 'react';

interface OAuth2Config {
  googleClientId?: string;
}

let googleScriptLoaded = false;

export function useOAuth2SDK() {
  const [isGoogleReady, setIsGoogleReady] = useState(false);

  const config: OAuth2Config = {
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  };

  useEffect(() => {
    // Load Google SDK
    if (config.googleClientId && !googleScriptLoaded) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        googleScriptLoaded = true;
        setIsGoogleReady(true);
      };
      document.head.appendChild(script);
    } else if (googleScriptLoaded) {
      setIsGoogleReady(true);
    }


  }, [config.googleClientId]);

  return {
    isGoogleReady,
    hasGoogleConfig: !!config.googleClientId,
  };
}
