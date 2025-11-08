# Pages Folder Structure

This folder contains all page components organized by feature/domain.

## Folder Structure

```
pages/
├── public/           # Public-facing pages (no auth required)
│   ├── landing.tsx
│   ├── about.tsx
│   ├── contact.tsx
│   └── not-found.tsx
│
├── auth/             # Authentication pages
│   ├── signin.tsx
│   ├── signup.tsx
│   └── forgot-password.tsx
│
├── shop/             # Shopping & product browsing
│   ├── shop.tsx
│   ├── gifts.tsx
│   ├── product-detail.tsx
│   ├── collections.tsx
│   └── Search.tsx
│
├── events/           # Events & gift experiences
│   ├── events.tsx
│   ├── event-detail.tsx
│   ├── EnhancedEvents.tsx
│   ├── GiftExperiences.tsx
│   └── service-detail.tsx
│
├── occasions/        # Occasion-based browsing
│   ├── occasions.tsx
│   └── occasion-category.tsx
│
├── orders/           # Order management & checkout
│   ├── cart.tsx
│   ├── Wishlist.tsx
│   ├── custom-orders.tsx
│   ├── Checkout.tsx
│   ├── enhanced-checkout.tsx
│   ├── order-success.tsx
│   ├── OrderSuccess.tsx
│   ├── payment-success.tsx
│   ├── MyOrders.tsx
│   ├── TrackOrder.tsx
│   ├── track-order.tsx
│   └── track.tsx
│
├── dashboard/        # User dashboards
│   ├── vendor-dashboard.tsx
│   ├── admin-dashboard.tsx
│   └── AdminDashboard.tsx
│
├── registration/     # Registration pages
│   ├── VendorRegistration.tsx
│   └── CelebrityRegistration.tsx
│
└── legal/            # Legal pages
    ├── privacy.tsx
    └── terms.tsx
```

## Import Examples

```typescript
// Public pages
import Landing from "@/pages/public/landing";
import About from "@/pages/public/about";

// Auth pages
import SignIn from "@/pages/auth/signin";
import SignUp from "@/pages/auth/signup";

// Shop pages
import Shop from "@/pages/shop/shop";
import ProductDetail from "@/pages/shop/product-detail";

// Orders pages
import Cart from "@/pages/orders/cart";
import CustomOrders from "@/pages/orders/custom-orders";
```

## Notes

- All routes are defined in `src/components/Router.tsx`
- Protected routes use the `ProtectedRoute` wrapper component
- File naming: Use kebab-case for consistency (e.g., `product-detail.tsx`)
- Some files may have duplicate names (e.g., `AdminDashboard.tsx` and `admin-dashboard.tsx`) - verify which one is actively used

