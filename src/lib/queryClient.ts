import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { MockApiService } from "@/services/mockApiService";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

// Mock API handler for independent client
const handleMockApi = async (queryKey: readonly unknown[]) => {
  const url = queryKey.length === 1 ? queryKey[0] as string : queryKey.join("/");
  
  // Handle different API endpoints with mock data
  if (url === "/api/auth/user") {
    return MockApiService.getCurrentUser();
  }
  
  if (url.startsWith("/api/categories")) {
    return MockApiService.getCategories();
  }
  
  if (url.startsWith("/api/products")) {
    const params = new URLSearchParams(url.split("?")[1] || "");
    return MockApiService.getProducts({
      limit: params.get("limit") ? parseInt(params.get("limit")!) : undefined,
      isTrending: params.get("isTrending") === "true",
      isFeatured: params.get("isFeatured") === "true",
      search: params.get("search") || undefined,
    });
  }
  
  if (url.startsWith("/api/products/featured")) {
    const params = new URLSearchParams(url.split("?")[1] || "");
    const limit = params.get("limit") ? parseInt(params.get("limit")!) : 4;
    return MockApiService.getFeaturedProducts(limit);
  }
  
  if (url.startsWith("/api/orders")) {
    return MockApiService.getOrders();
  }
  
  if (url.startsWith("/api/cart")) {
    return MockApiService.getCart();
  }
  
  if (url.startsWith("/api/wishlist")) {
    return MockApiService.getWishlist();
  }
  
  // Default fallback
  throw new Error(`Mock API endpoint not found: ${url}`);
};

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      // Use mock API for independent client
      return await handleMockApi(queryKey);
    } catch (error) {
      // If it's a network error (no backend), fall back to mock
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return await handleMockApi(queryKey);
      }
      
      // Handle 401 errors
      if (error instanceof Error && error.message.includes('401')) {
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
        throw error;
      }
      
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
