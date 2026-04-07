import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "@/hooks/use-toast";

const SW_RELOAD_INTERVAL_MS = 60 * 60 * 1000;

export default function PwaUpdatePrompt() {
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

    const { dismiss } = toast({
      title: "Offline ready",
      description: "goGerami is cached and can now open faster on repeat visits.",
      duration: 5000,
    });

    return () => {
      dismiss();
      setOfflineReady(false);
    };
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (!needRefresh) return;

    const { dismiss } = toast({
      title: "Update available",
      description: "A newer version is ready. Reload to get the latest fixes.",
      action: (
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-white px-3 text-sm font-medium hover:bg-secondary"
          onClick={() => {
            void updateServiceWorker(true);
          }}
        >
          Reload
        </button>
      ),
      duration: 15000,
    });

    return () => {
      dismiss();
      setNeedRefresh(false);
    };
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}
