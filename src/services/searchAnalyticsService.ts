import { apiService } from "./apiService";

export type SearchPageType =
  | "PRODUCT_LIST"
  | "SERVICE_LIST"
  | "EVENT_LIST"
  | "PACKAGE_LIST"
  | "CUSTOM_ORDER_LIST"
  | "LANDING_SEARCH";

export interface SearchAnalyticsEventContext {
  filters?: Record<string, string | number | boolean | null | undefined>;
  sort?: string;
  routeParams?: Record<string, string | number | boolean | null | undefined>;
}

export interface SearchAnalyticsEventPayload {
  searchTerm: string;
  pageName: string;
  pageType: SearchPageType;
  searchSource: string;
  resultCount?: number;
  context?: SearchAnalyticsEventContext;
}

export interface SearchAnalyticsEventRequest {
  searchTerm: string;
  pageUrl: string;
  pageName: string;
  pageType: SearchPageType;
  referrerUrl?: string;
  sessionId?: string;
  anonymousId?: string;
  searchSource: string;
  languageCode?: string;
  timezone?: string;
  platform: "web";
  appVersion?: string;
  frontendSentAt: string;
  resultCount?: number;
  context?: SearchAnalyticsEventContext;
}

export interface SearchAnalyticsOverview {
  totalSearches: number;
  distinctUserCount: number;
  distinctSessionCount: number;
  authenticatedSearches: number;
  anonymousSearches: number;
}

export interface SearchAnalyticsTopTerm {
  term: string;
  searchCount: number;
  distinctUserCount: number;
  distinctSessionCount: number;
  lastSearchedAt: string;
}

export interface SearchAnalyticsTimelineBucket {
  bucketStart: string;
  searchCount: number;
  distinctUserCount: number;
}

export interface SearchAnalyticsEventItem {
  id: number;
  searchTerm: string;
  normalizedSearchTerm?: string;
  pageType: string;
  pageName: string;
  pageUrl: string;
  searchSource: string;
  resultCount?: number;
  authenticated?: boolean;
  userId?: number;
  userRole?: string;
  sessionId?: string;
  anonymousId?: string;
  languageCode?: string;
  timezone?: string;
  platform?: string;
  appVersion?: string;
  requestId?: string;
  frontendSentAt?: string;
  backendReceivedAt?: string;
  createdAt?: string;
}

export interface SearchAnalyticsEventsPage {
  content: SearchAnalyticsEventItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface SearchAnalyticsRetrieveFilters {
  fromTime?: string;
  toTime?: string;
  pageType?: string;
  searchSource?: string;
  authenticated?: boolean | null;
  searchTerm?: string;
  bucket?: "HOUR" | "DAY" | "WEEK" | "MONTH";
  limit?: number;
  page?: number;
  size?: number;
}

const SESSION_KEY = "goGerami_search_session_id";
const ANON_KEY = "goGerami_search_anonymous_id";

const generateId = (prefix: string): string => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const getSessionId = (): string | undefined => {
  if (typeof window === "undefined") return undefined;

  try {
    let value = window.sessionStorage.getItem(SESSION_KEY);
    if (!value) {
      value = generateId("sess");
      window.sessionStorage.setItem(SESSION_KEY, value);
    }
    return value;
  } catch {
    return undefined;
  }
};

const getAnonymousId = (): string | undefined => {
  if (typeof window === "undefined") return undefined;

  try {
    let value = window.localStorage.getItem(ANON_KEY);
    if (!value) {
      value = generateId("anon");
      window.localStorage.setItem(ANON_KEY, value);
    }
    return value;
  } catch {
    return undefined;
  }
};

const cleanObject = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const entries = Object.entries(obj).filter(([, value]) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string" && !value.trim()) return false;
    if (typeof value === "number" && Number.isNaN(value)) return false;
    return true;
  });

  return Object.fromEntries(entries) as Partial<T>;
};

class SearchAnalyticsService {
  async trackSearchEvent(payload: SearchAnalyticsEventPayload): Promise<void> {
    const term = payload.searchTerm?.trim();
    if (!term) return;

    const pageUrl = typeof window !== "undefined" ? window.location.href : "";
    const referrerUrl =
      typeof document !== "undefined"
        ? document.referrer || undefined
        : undefined;
    const languageCode =
      typeof navigator !== "undefined" ? navigator.language : undefined;
    const timezone =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : undefined;
    const appVersion = (import.meta as any)?.env?.VITE_APP_VERSION || "1.0.0";

    const request: SearchAnalyticsEventRequest = {
      searchTerm: term,
      pageUrl,
      pageName: payload.pageName,
      pageType: payload.pageType,
      referrerUrl,
      sessionId: getSessionId(),
      anonymousId: getAnonymousId(),
      searchSource: payload.searchSource,
      languageCode,
      timezone,
      platform: "web",
      appVersion,
      frontendSentAt: new Date().toISOString(),
      resultCount: payload.resultCount,
      context: payload.context,
    };

    try {
      await apiService.postRequest(
        "/api/search-analytics/events",
        cleanObject(request)
      );
    } catch {
      // Search analytics failures must not affect primary UX.
    }
  }

  private toQueryString(filters: SearchAnalyticsRetrieveFilters): string {
    const params = new URLSearchParams();

    const cleaned = cleanObject(filters);
    Object.entries(cleaned).forEach(([key, value]) => {
      if (typeof value === "boolean") {
        params.append(key, String(value));
        return;
      }
      params.append(key, String(value));
    });

    return params.toString();
  }

  async getOverview(
    filters: SearchAnalyticsRetrieveFilters
  ): Promise<SearchAnalyticsOverview> {
    const qs = this.toQueryString(filters);
    const endpoint = qs
      ? `/api/search-analytics/overview?${qs}`
      : "/api/search-analytics/overview";
    return await apiService.getRequest<SearchAnalyticsOverview>(endpoint);
  }

  async getTopTerms(
    filters: SearchAnalyticsRetrieveFilters
  ): Promise<SearchAnalyticsTopTerm[]> {
    const qs = this.toQueryString(filters);
    const endpoint = qs
      ? `/api/search-analytics/terms/top?${qs}`
      : "/api/search-analytics/terms/top";
    return await apiService.getRequest<SearchAnalyticsTopTerm[]>(endpoint);
  }

  async getTimeline(
    filters: SearchAnalyticsRetrieveFilters
  ): Promise<SearchAnalyticsTimelineBucket[]> {
    const qs = this.toQueryString(filters);
    const endpoint = qs
      ? `/api/search-analytics/timeline?${qs}`
      : "/api/search-analytics/timeline";
    return await apiService.getRequest<SearchAnalyticsTimelineBucket[]>(
      endpoint
    );
  }

  async getEvents(
    filters: SearchAnalyticsRetrieveFilters
  ): Promise<SearchAnalyticsEventsPage> {
    const qs = this.toQueryString(filters);
    const endpoint = qs
      ? `/api/search-analytics/events?${qs}`
      : "/api/search-analytics/events";
    return await apiService.getRequest<SearchAnalyticsEventsPage>(endpoint);
  }
}

export const searchAnalyticsService = new SearchAnalyticsService();
export default searchAnalyticsService;
