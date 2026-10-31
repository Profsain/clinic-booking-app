# CarePoint Clinic Booking API

A full-stack clinic appointment booking system built with **React + Vite**, **Node.js + Express**, and **MongoDB + Mongoose**. It implements the Koya Academy assessment contract across Levels 1–5.

## Repository layout

```text
clinic-booking-api/
├── backend/
│   ├── src/
│   │   ├── middleware/apiKey.js
│   │   ├── models/              # Slot, Booking, Idempotency, RateLimit
│   │   ├── services/bookingService.js
│   │   ├── app.js
│   │   ├── routes.js
│   │   └── server.js
│   ├── test/booking.test.js
│   └── .env
├── frontend/
│   ├── src/App.jsx
│   ├── src/styles.css
│   └── .env
├── render.yaml
└── README.md
```

## Assessment coverage

| Level | Implemented behavior |
|---|---|
| 1 | `POST /reset`, `GET /slots`, `POST /bookings`, `GET /bookings/:id` |
| 2 | `X-API-Key` on every API endpoint; booking input validation; normalized name/email |
| 3 | Unique partial MongoDB index for confirmed bookings; atomic conflict handling; `DELETE /bookings/:id` cancellation |
| 4 | `Idempotency-Key` replay, 422 on changed body, `GET /bookings` cursor pagination |
| 5 | MongoDB-backed per-email minute bucket; first five attempts allowed, sixth returns 429 and `Retry-After` |

All API responses are JSON. API errors use `{ "error": "..." }`.

## 1. Requirements

- Node.js 20+
- npm 10+
- MongoDB local instance or MongoDB Atlas cluster

## 2. Configure MongoDB Atlas

1. Create a MongoDB Atlas cluster.
2. Create a database user and password.
3. In Network Access, allow the deployment host's outbound IPs. For initial testing, `0.0.0.0/0` works but is broader than ideal; restrict it for production when possible.
4. Copy the Node.js connection string and replace the username, password and database name.

## 3. Run locally

From the repository root:

```bash
npm install
```

Set `MONGODB_URI` and `API_KEY` in `backend/.env`.

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:4000
- Health check: http://localhost:4000/health

Enter the same `API_KEY` in the frontend's Connect panel. The browser does not receive the key until a user enters it.

For production, set the backend's `CORS_ORIGIN` to the deployed frontend origin. Multiple origins can be comma-separated; trailing slashes are ignored.

## 4. Deploy the backend to Vercel

The backend includes a Vercel function entrypoint and rewrites API paths such as `/slots` to it. Set the Vercel project root directory to `backend`, then configure these project environment variables:

- `MONGODB_URI`: your MongoDB connection string
- `API_KEY`: the API key entered in the frontend
- `CORS_ORIGIN`: `https://clinic-booking-app-b23l.vercel.app` (replace this with your deployed frontend origin)

Set `VITE_API_BASE_URL` in the frontend's Vercel project to the backend deployment URL, then redeploy both projects after changing environment variables.
