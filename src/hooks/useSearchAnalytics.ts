import { useEffect, useMemo, useRef } from "react";
import {
  SearchAnalyticsEventPayload,
  searchAnalyticsService,
} from "@/services/searchAnalyticsService";

export const useSearchAnalytics = (
  payload: SearchAnalyticsEventPayload,
  options?: { enabled?: boolean }
) => {
  const enabled = options?.enabled ?? true;
  const lastSentSignatureRef = useRef<string>("");

  const signature = useMemo(
    () =>
      JSON.stringify({
        searchTerm: payload.searchTerm?.trim(),
        pageName: payload.pageName,
        pageType: payload.pageType,
        searchSource: payload.searchSource,
        resultCount: payload.resultCount,
        context: payload.context,
      }),
    [
      payload.context,
      payload.pageName,
      payload.pageType,
      payload.resultCount,
      payload.searchSource,
      payload.searchTerm,
    ]
  );

  useEffect(() => {
    const normalized = payload.searchTerm?.trim();
    if (!enabled || !normalized) return;

    if (lastSentSignatureRef.current === signature) {
      return;
    }

    lastSentSignatureRef.current = signature;
    void searchAnalyticsService.trackSearchEvent(payload);
  }, [enabled, payload, signature]);
};

export default useSearchAnalytics;
