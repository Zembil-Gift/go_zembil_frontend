# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: Ethiopian diaspora senders.** People living abroad — the US and elsewhere — buying gifts for family and friends in Ethiopia. They never see or touch the item they are sending, they are often several time zones from the recipient, and the delivery moment is the payoff they are actually paying for. Design defaults to this user.

**Also first-class: local Ethiopian shoppers.** Buyers inside Ethiopia ordering for delivery in Addis Ababa and beyond. Fully supported, not a secondary port of the diaspora experience.

**Supply and operations roles** (customer, vendor, delivery personnel, employee, admin) each have their own dashboard surfaces with role-scoped permissions.

## Product Purpose

goGerami is a marketplace for sending meaningful Ethiopian gifts, services, events, and commissioned custom work to recipients in Ethiopia. It exists because diaspora communities had no trustworthy way to send authentic, culturally-correct gifts home. Success is a gift that arrives on the right day, is genuinely what the sender pictured, and lands as a moment for the recipient.

The name comes from *gerami* / ዘንቢል — the traditional Ethiopian woven basket used to carry gifts to neighbors.

## Positioning

Four mechanisms, all confirmed, that together no neighboring gift site could truthfully copy:

1. **Cultural authenticity and artisan supply.** Curated Ethiopian craft from local makers, organized around Ethiopian occasions and observances (Meskel, Timket, Gena, Fasika, Enkutatash, Eid al-Fitr, Eid al-Adha, Irreechaa, Ashenda, Adwa Victory Day, Sigd, the coffee ceremony) — not generic Western holidays with Ethiopian products dropped in.
2. **Cross-border payment and delivery rails.** Pay from abroad, fulfill in Ethiopia, through an in-house delivery operation with assignment, confirmation, and tracking.
3. **Breadth of what can be sent.** Physical products, bookable services, event tickets, and commissioned custom/handmade orders — one platform, not a catalog.
4. **The delivery experience itself.** Personal video messages that play at delivery, influencer delivery for a shared unboxing, scheduled timing for a specific date. The moment of receiving is part of the product.

## Operating Context

- Sender and recipient are usually in different countries and time zones. The sender is buying sight-unseen and relies entirely on the surface to know what will arrive.
- Occasion timing is often fixed and culturally significant — a delivery date that slips past Meskel or a birthday has failed even if the item is perfect.
- Recipients and local buyers are on constrained Ethiopian mobile networks.
- Custom orders run as a multi-step commission workflow (templates, categories, shipping, vendor assignment, review) rather than a single add-to-cart.
- Vendors onboard through payment providers (Chapa, Stripe) and manage their own products, services, events, packages, discounts, campaigns, and payouts.
- Admin operates the marketplace: vendors, orders, refunds, commission, tax, delivery pricing and personnel, payouts, wallet, campaigns, roles and permissions.

## Capabilities and Constraints

**Confirmed, must not be designed away:**

- **Low-bandwidth Ethiopian mobile is a hard constraint.** Payload weight, image handling, and PWA/offline behavior are correctness requirements, not polish. The app ships a service worker with versioned caching and an update prompt.
- **Multi-role access control.** Customer, vendor, delivery, employee, and admin, with an admin-managed roles-and-permissions system. Every surface respects role boundaries.
- **Multiple payment rails stay first-class.** Chapa, Telebirr, and Stripe are all real checkout paths; none may be collapsed or hidden.

**Existing functionality:** product/service/event/package catalogs and detail pages, search (including voice search), wishlist, cart, several checkout flows, order and service-order tracking, delivery assignment and confirmation, reviews, order chat, campaigns and cashback, wallet, referral, subscription, gift cards, QR check-in for events, maps-based location, Google and Apple OAuth.

**Technical constraints:** Vite + React 18 + TypeScript + Tailwind, React Query + Zustand, Node 18+, `dist/` build, path aliases `@/*`, `@shared/*`, `@assets/*`. No test framework yet; validation is `npm run type-check`, `npm run lint`, `npm run build`.

**Undecided — do not invent an answer:**

- **Currency.** A currency toggle and `useActiveCurrency` exist and admin manages a rate; USD price bands appear in marketing copy. Whether dual USD/ETB display is a binding rule on every surface was not confirmed. Ask before treating either currency as the single default.
- **Legacy naming.** The repo directory is `go_zembil_frontend`, the PWA cache prefix is `gozembil`, and the footer contact email is `info@afrodebab.com`. These are legacy, not alternate brands. Whether they get unified is unresolved.

## Brand Commitments

Binding, confirmed by the user:

- **Name: goGerami.** Canonical everywhere user-facing.
- **Typography: Gotham**, with Inter as fallback (`FONT_GUIDE.md`).
- **Primary color: `#01415c`** (`BRAND_COLORS.md`).
- **Bilingual English / አማርኛ on every user-facing surface.** Amharic is a first-class language, not a translation layer bolted onto an English design. Locale files: `src/locales/english.json`, `src/locales/amharic.json`.

**Open conflict to resolve before visual work:** `index.html` declares `theme-color` as `#FDCB2D` (yellow) while `BRAND_COLORS.md` names `#01415c` (blue) as primary with `#ffff00` as a custom yellow. Three different values are in play. Do not silently pick one.

**Voice, from shipped copy:** warm, direct, emotionally plain. "Gifting with Heart." "Connecting hearts across distances." "Bridge the distance." Sentiment is stated openly rather than hedged — the product is about feeling, and the copy says so without irony.

## Evidence on Hand

- `BRAND_COLORS.md`, `FONT_GUIDE.md` — existing brand guides.
- `src/locales/english.json`, `src/locales/amharic.json` — full bilingual copy, including the Ethiopian occasion, cultural, emotion, and custom-craft taxonomies.
- `AGENTS.md` — build/lint/type-check conventions and repo rules.
- `public/attached_assets/` — image assets.
- Real contact facts in the footer: US `+1 945 399 3809`, Ethiopia `+251 91 791 4528`, `info@afrodebab.com`, Addis Ababa.

**Absent — must not be fabricated:** the "1000+ Happy Recipients" and "Free Delivery in Addis" claims in hero copy are unverified by anything in the repo. There are no real testimonials on file (the testimonials section has a heading and no sourced content; `about.tsx` has team/testimonial blocks commented out). Do not invent customers, quotes, metrics, press, or partner logos.

## Product Principles

1. **The sender is buying a moment they will not witness.** Every surface must make the unseen tangible — what arrives, when, and how it will feel to receive.
2. **Ethiopian culture is the organizing structure, not decoration.** Occasions, observances, and craft categories come from Ethiopian life. Never reframe them as variants of Western equivalents.
3. **Amharic and English are one design, not two.** If a layout only works in English, it is not finished.
4. **Weight is a feature.** A page that fails on a constrained Ethiopian mobile connection has failed the recipient side of the product entirely.
5. **Don't collapse the marketplace.** Four things are sold (products, services, events, custom commissions) to five roles. Simplification that erases a real path is a regression.

## Accessibility & Inclusion

No product-specific standard has been established. Known needs from context: bilingual EN/አማርኛ including Ethiopic script rendering at all weights, and usability on low-end mobile devices and slow networks.
