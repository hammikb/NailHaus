# NailHaus — Next.js + React + TypeScript conversion

This version keeps your existing Express API, but moves the frontend into a proper Next.js + React + TypeScript app.

## Structure

- `frontend/` — Next.js app router frontend
- `backend/` — your existing API routes and logic
- `data/` — lowdb JSON data
- `server.js` — backend entry point on port 3001 by default

## Run it

### 1) Backend

```bash
npm install dotenv cors cookie-parser helmet express-rate-limit express bcryptjs jsonwebtoken lowdb uuid
node server.js
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

## Ports

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

## Env

Copy `.env.example` and use:

```bash
PORT=3001
APP_ORIGIN=http://localhost:3000
JWT_SECRET=change-me
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## What was converted

- Home page
- Shop page with filters
- Vendors listing
- Vendor detail page
- Product detail page
- Login / signup
- Vendor dashboard page
- Shared typed API layer
- Auth context for React

## Next step

Best follow-up after this conversion:
1. move checkout into React
2. move admin panel into React
3. move vendor product-create/edit forms into React
4. add Stripe and image uploads
