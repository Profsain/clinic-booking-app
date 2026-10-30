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
│   └── .env.example
├── frontend/
│   ├── src/App.jsx
│   ├── src/styles.css
│   └── .env.example
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
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Set `MONGODB_URI` and a long random `API_KEY` in `backend/.env`.

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:4000
- Health check: http://localhost:4000/health

Enter the same `API_KEY` in the frontend's Connect panel. The browser does not receive the key until a user enters it; do not bake a privileged production key into a `VITE_*` variable because frontend environment values are public.

## 4. API contract

Every API request below requires:

```http
X-API-Key: your-api-key
Content-Type: application/json
```

### Reset slots — Level 1

```http
POST /reset
```

```json
{
  "slots": [
    {
      "id": "s1",
      "provider": "Dr Ada",
      "start": "2027-01-12T09:00:00.000Z",
      "end": "2027-01-12T09:30:00.000Z"
    }
  ]
}
```

Replaces all slots and clears bookings, idempotency records and rate-limit buckets. Returns HTTP 200.

### List slots — Level 1

```http
GET /slots
GET /slots?provider=Dr%20Ada
```

Response:

```json
{
  "slots": [
    {
      "id": "s1",
      "provider": "Dr Ada",
      "start": "2027-01-12T09:00:00.000Z",
      "end": "2027-01-12T09:30:00.000Z",
      "available": true
    }
  ]
}
```

Sorted by earliest `start` first. Provider filtering is an exact match.

### Book a slot — Levels 1–5

```http
POST /bookings
Idempotency-Key: optional-client-generated-key
```

```json
{
  "slot_id": "s1",
  "name": "Ada Obi",
  "email": "ada@example.com"
}
```

Success: HTTP 201:

```json
{
  "id": "MongoDB booking id",
  "slot_id": "s1",
  "name": "Ada Obi",
  "email": "ada@example.com",
  "status": "confirmed",
  "created_at": "2026-10-30T12:00:00.000Z"
}
```

The API trims names and emails and lowercases email addresses. A slot must exist and must not have started. A unique partial index on `slot_id` for `status: confirmed` ensures only one confirmed booking can occupy a slot, including concurrent requests. Cancelled bookings release the slot.

### Get booking — Level 1

```http
GET /bookings/:id
```

Returns the booking object with its scheduled slot (`provider`, `start` and `end`), or `slot: null` if the slot has been removed. Returns HTTP 404 if the booking does not exist.

### Cancel booking — Level 3

```http
DELETE /bookings/:id
```

Returns the updated booking with `status: "cancelled"`. The slot becomes available. A missing booking returns 404; an already-cancelled booking returns 409.

### Booking history — Level 4

```http
GET /bookings?email=ada@example.com&limit=10
GET /bookings?email=ada@example.com&limit=10&cursor=...
```

Returns oldest bookings first:

```json
{
  "bookings": [],
  "next_cursor": null
}
```

`limit` defaults to 10 and must be between 1 and 50. Pass the returned `next_cursor` as `cursor` to get the next page. The final page returns `next_cursor: null`.

## 5. Error and status behavior

| Status | Meaning |
|---|---|
| 200 | Reset, slot list, lookup or cancellation completed |
| 201 | Booking created |
| 400 | Missing/invalid details, started slot, invalid pagination |
| 401 | Missing or incorrect `X-API-Key` |
| 404 | Slot or booking does not exist |
| 409 | Slot already has a confirmed booking; or booking already cancelled |
| 422 | Idempotency key reused with a different normalized request body |
| 429 | More than five booking attempts for the same email in the current minute |

For 429, the API includes an integer `Retry-After` header with seconds until the next minute window.

## 6. Idempotency behavior

Send a unique `Idempotency-Key` for a logical booking attempt. A retry with the same key and same normalized body replays the original successful status and JSON body. Reusing that key with a different body returns 422. The idempotency record has a 24-hour TTL.

The React demo generates a UUID for each new booking submission. For a production client, persist the key for the duration of the logical request and reuse it on network retries.

## 7. Run tests

From the repository root:

```bash
npm test
```

The integration suite uses `mongodb-memory-server` and Supertest. It tests API-key enforcement, slot listing, booking and lookup, concurrent booking conflict, cancellation and rebooking, idempotency, validation, pagination and the sixth-attempt rate limit.

## 8. Deploy backend to Render

1. Push this repository to GitHub.
2. Create a Render Web Service from the repository.
3. Set **Root Directory** to `backend`.
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables:
   - `NODE_ENV=production`
   - `MONGODB_URI` = Atlas connection string
   - `API_KEY` = long random secret
   - `CORS_ORIGIN` = deployed frontend origin
7. Deploy and verify `https://YOUR-BACKEND.onrender.com/health`.

`render.yaml` is included as a starting blueprint. Configure secrets in the Render dashboard, not in Git.

## 9. Deploy frontend to Vercel or Netlify

1. Import the same GitHub repository.
2. Set the project root to `frontend`.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add `VITE_API_BASE_URL=https://YOUR-BACKEND.onrender.com`.
6. Deploy.
7. Open the frontend, enter the API key, and connect.

Set the backend `CORS_ORIGIN` to the exact deployed frontend origin (for example `https://your-app.vercel.app`).

## 10. Production notes and assessment considerations

- The unique partial MongoDB index is the source of truth for concurrent slot claims; do not replace it with a frontend-only availability check.
- MongoDB must support index creation. The unique booking index is created by Mongoose when the model initializes.
- The rate limiter uses MongoDB, so attempts are counted across multiple backend instances rather than separately in each process.
- Rate-limit buckets use a minute-aligned window. Failed booking attempts with an email count toward the five-attempt limit.
- The assessment spec's screenshots show the required endpoint names, fields, header names, pagination cursor behavior and status codes. If the academy provides a machine-readable OpenAPI JSON file, use it as the final authority for any response-message wording or schema details not legible in the screenshots.
- The booking history endpoint is an assessment lookup by email, not a complete patient authentication system. For a real clinic, add patient identity verification and authorization before exposing personal booking data.
- For real medical deployments, obtain appropriate privacy, security and regulatory review before using real patient data.
