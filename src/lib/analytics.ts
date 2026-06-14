import ReactGA from "react-ga4";

// Falls back to the previously hardcoded ID so existing tracking keeps working
// even if VITE_GA_MEASUREMENT_ID isn't set.
const GA_MEASUREMENT_ID =
  import.meta.env.VITE_GA_MEASUREMENT_ID || "G-L77TMLJ6NH";

const PENDING_PURCHASE_PREFIX = "ga4_pending_purchase_";

/**
 * GA4 "item" object shared by all ecommerce events.
 * https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
 */
export interface AnalyticsItem {
  item_id: string | number;
  item_name: string;
  item_category?: string;
  item_brand?: string;
  item_variant?: string;
  item_list_name?: string;
  item_list_id?: string;
  price?: number;
  quantity?: number;
  index?: number;
  discount?: number;
  affiliation?: string;
  coupon?: string;
}

export interface PendingPurchase {
  value: number;
  currency: string;
  items: AnalyticsItem[];
  coupon?: string;
  shipping?: number;
  tax?: number;
  affiliation?: string;
}

/** Initialize GA4 once. Pageviews are sent manually so SPA route changes are tracked. */
export function initAnalytics(): void {
  if (!GA_MEASUREMENT_ID) return;
  ReactGA.initialize(GA_MEASUREMENT_ID, {
    gtagOptions: {
      send_page_view: false,
      debug_mode: import.meta.env.DEV,
    },
  });
}

export function trackPageview(path: string, title?: string): void {
  ReactGA.send({
    hitType: "pageview",
    page: path,
    title: title ?? document.title,
  });
}

interface AnalyticsUser {
  id: string;
  role?: string;
  preferredCurrencyCode?: string;
  country?: string;
}

/** Associate subsequent events with the signed-in user. */
export function identifyUser(user: AnalyticsUser): void {
  ReactGA.set({ userId: user.id });
  ReactGA.gtag("set", "user_properties", {
    user_role: user.role,
    preferred_currency: user.preferredCurrencyCode,
    user_country: user.country,
  });
}

/** Clear user identification on logout. */
export function clearUserIdentity(): void {
  ReactGA.set({ userId: undefined });
  ReactGA.gtag("set", "user_properties", {
    user_role: undefined,
    preferred_currency: undefined,
    user_country: undefined,
  });
}

function event(name: string, params?: Record<string, unknown>): void {
  ReactGA.event(name, params);
}

export function trackViewItem(item: AnalyticsItem, currency: string): void {
  event("view_item", { currency, value: item.price ?? 0, items: [item] });
}

export function trackViewItemList(
  items: AnalyticsItem[],
  listName: string,
  listId?: string
): void {
  if (items.length === 0) return;
  event("view_item_list", {
    item_list_name: listName,
    item_list_id: listId,
    items,
  });
}

export function trackSelectItem(item: AnalyticsItem, listName: string): void {
  event("select_item", { item_list_name: listName, items: [item] });
}

export function trackAddToCart(item: AnalyticsItem, currency: string): void {
  const value = (item.price ?? 0) * (item.quantity ?? 1);
  event("add_to_cart", { currency, value, items: [item] });
}

export function trackRemoveFromCart(
  item: AnalyticsItem,
  currency: string
): void {
  const value = (item.price ?? 0) * (item.quantity ?? 1);
  event("remove_from_cart", { currency, value, items: [item] });
}

export function trackViewCart(
  items: AnalyticsItem[],
  currency: string,
  value: number
): void {
  if (items.length === 0) return;
  event("view_cart", { currency, value, items });
}

export function trackBeginCheckout(
  items: AnalyticsItem[],
  currency: string,
  value: number,
  coupon?: string
): void {
  event("begin_checkout", { currency, value, items, coupon });
}

export function trackAddShippingInfo(
  items: AnalyticsItem[],
  currency: string,
  value: number,
  shippingTier?: string,
  coupon?: string
): void {
  event("add_shipping_info", {
    currency,
    value,
    items,
    shipping_tier: shippingTier,
    coupon,
  });
}

export function trackAddPaymentInfo(
  items: AnalyticsItem[],
  currency: string,
  value: number,
  paymentType: string,
  coupon?: string
): void {
  event("add_payment_info", {
    currency,
    value,
    items,
    payment_type: paymentType,
    coupon,
  });
}

export function trackPurchase(params: {
  transactionId: string | number;
  value: number;
  currency: string;
  items: AnalyticsItem[];
  coupon?: string;
  shipping?: number;
  tax?: number;
  affiliation?: string;
}): void {
  event("purchase", {
    transaction_id: String(params.transactionId),
    value: params.value,
    currency: params.currency,
    items: params.items,
    coupon: params.coupon,
    shipping: params.shipping,
    tax: params.tax,
    affiliation: params.affiliation,
  });
}

export function trackAddToWishlist(
  item: AnalyticsItem,
  currency: string
): void {
  event("add_to_wishlist", { currency, value: item.price ?? 0, items: [item] });
}

export function trackSearch(searchTerm: string): void {
  const term = searchTerm.trim();
  if (!term) return;
  event("search", { search_term: term });
}

export function trackSignUp(method: string): void {
  event("sign_up", { method });
}

export function trackLogin(method: string): void {
  event("login", { method });
}

export function trackShare(
  method: string,
  contentType: string,
  itemId: string | number
): void {
  event("share", {
    method,
    content_type: contentType,
    item_id: String(itemId),
  });
}

/**
 * Bridges ecommerce events across multi-step / off-site payment redirects (Stripe,
 * Chapa, Telebirr) by stashing the data needed for the GA4 "purchase" event when an
 * order is created, then consuming it once on the order success page.
 */
export function storePendingPurchase(
  orderId: string | number,
  data: PendingPurchase
): void {
  try {
    sessionStorage.setItem(
      `${PENDING_PURCHASE_PREFIX}${orderId}`,
      JSON.stringify(data)
    );
  } catch {
    // sessionStorage unavailable (e.g. private browsing) — analytics is best-effort.
  }
}

export function consumePendingPurchase(
  orderId: string | number
): PendingPurchase | null {
  const key = `${PENDING_PURCHASE_PREFIX}${orderId}`;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    sessionStorage.removeItem(key);
    return JSON.parse(raw) as PendingPurchase;
  } catch {
    return null;
  }
}
