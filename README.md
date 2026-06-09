# Ametopia Independent Store

Ametopia is a zero-build independent storefront for DIY charms for bags, bracelets, shoes, and necklaces.

Open the storefront directly:

`index.html`

Open the private admin site:

`admin.html`

Demo admin password:

`ametopia-admin`

## Included

- Storefront with Ametopia branding and a softer magical aesthetic
- Product catalog copied from the provided reference source into local `products-data.js`
- Local product images under `assets/products/`
- Search, category filtering, price filtering, stock filtering, and sorting
- Cart drawer with quantity controls
- Promo code support: `AME10`
- AUD pricing, shipping, tax, and checkout order creation
- Wishlist save button
- Back-in-stock email subscription records for wishlist items when an account email exists
- Subscribe form with `WELCOME10` for 10% off first order over A$100
- Sliding top announcement banner and hero product slideshow
- Charm builder without initials
- Separate admin page for inventory, orders, wishlist alerts, promotions, and data export
- Local persistence through `localStorage`

## Current Front-End Rules

- No initials service is shown.
- Product image backgrounds are white.
- Product cards do not show exact stock counts.
- Products only show `Low in stock` when stock is 3 or less.
- Member perks are limited to wishlist and back-in-stock email alerts.
- Admin tools are on `admin.html`, not on the customer storefront.
- Shipping eligibility is calculated before promo discounts, so discount codes do not remove free shipping.

## Production Back End Needed

This version is still a static independent prototype. For real operation, replace browser storage with owned back-end services:

- Database for products, inventory, customers, carts, orders, wishlist, and subscriptions
- Secure admin authentication and staff permissions
- Payment processor such as Stripe, Adyen, Airwallex, or a bank gateway
- Email provider for order confirmations and back-in-stock notifications
- Fulfillment, shipping labels, tracking, and returns
- Tax rules, privacy policy, refund policy, and PCI-safe payment handling
