import { useEffect, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "@/hooks/use-toast";

const SW_RELOAD_INTERVAL_MS = 60 * 60 * 1000;

export default function PwaUpdatePrompt() {
  const autoUpdateTriggeredRef = useRef(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(
      swUrl: string | undefined,
      registration: ServiceWorkerRegistration | undefined
    ) {
      if (!swUrl || !registration) return;

      setInterval(() => {
        void registration.update();
      }, SW_RELOAD_INTERVAL_MS);
    },
    onRegisterError(error: unknown) {
      console.error("Service worker registration failed", error);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;

    

    return () => {
      setOfflineReady(false);
    };
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (!needRefresh || autoUpdateTriggeredRef.current) return;
  
    autoUpdateTriggeredRef.current = true;
  
    updateServiceWorker(true).catch(() => {
      // Allow retry on next needRefresh trigger
      autoUpdateTriggeredRef.current = false;
      setNeedRefresh(false);
    });
  
    setNeedRefresh(false);
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}
