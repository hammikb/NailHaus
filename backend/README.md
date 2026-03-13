# 🌸 NailHaus — Press-On Nail Marketplace

A full-stack multi-vendor marketplace for press-on nails.

## Quick Start

```bash
npm install
node server.js
```

Open http://localhost:3000

## Demo Accounts (password: `password123`)

| Role   | Email                           |
|--------|---------------------------------|
| Vendor | sofia@petalpressstudio.com      |
| Vendor | jasmine@luxeglamco.com          |
| Buyer  | mia@example.com                 |
| Buyer  | jordan@example.com              |

## Features

**Shoppers**
- Browse & filter products by shape (almond, coffin, stiletto, square, round) and style (floral, minimal, glam, cute)
- Search across products
- Product detail pages with reviews
- Add to cart / wishlist
- Checkout with order history

**Vendors**
- Create a storefront with bio, emoji, colors, tags
- Add/edit/delete products with pricing, badge, stock
- Vendor dashboard: sales stats, revenue, order history, recent reviews
- Verified vendor badges

**Reviews**
- Verified buyer reviews on every product
- Star ratings (1–5) with review title & body
- Mark reviews as helpful

## Tech Stack

| Layer    | Tech                              |
|----------|-----------------------------------|
| Backend  | Node.js + Express 5               |
| Database | lowdb (JSON file, zero-config)    |
| Auth     | JWT (bcryptjs + jsonwebtoken)     |
| Frontend | Vanilla JS SPA (no framework)     |
| Fonts    | Cormorant Garamond + DM Sans      |

## API Endpoints

```
POST /api/auth/register      Register user
POST /api/auth/login         Login
GET  /api/auth/me            Current user

GET  /api/products           List products (filter: shape, style, search, sort)
GET  /api/products/:id       Product detail + reviews
POST /api/products           Create product (vendor auth)
PUT  /api/products/:id       Update product (vendor auth)
DELETE /api/products/:id     Delete product (vendor auth)

GET  /api/vendors            All vendors
GET  /api/vendors/:id        Vendor detail + products + reviews
POST /api/vendors            Create vendor profile (auth)
GET  /api/vendors/me/dashboard  Vendor dashboard data (auth)

GET  /api/reviews/product/:id   Reviews for product
GET  /api/reviews/vendor/:id    Reviews for vendor
GET  /api/reviews/recent        Recent reviews
POST /api/reviews               Submit review (buyer auth)

GET  /api/orders/my         My orders (auth)
POST /api/orders            Place order (auth)
```
