# SynchBoard — Real-Time Collaborative Task Board

SynchBoard is a full-stack Kanban-style task board. Users can manage personal tasks, or create shared "Rooms" with teammates — organizing work into drag-and-drop columns, chatting in-room, and managing a friends list. Authentication supports both email/password and Google Sign-In.

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express (MVC structure)
- **Database:** MongoDB Atlas (cloud-hosted)
- **Auth:** JWT (email/password) + Google Sign-In (`google-auth-library`)
- **File uploads:** Cloudinary
- **Testing:** Node's built-in test runner (`node --test`)
- **CI/CD:** GitHub Actions
- **Containerization:** Docker + Docker Compose

## Project Structure

```
├── backend/          Express REST API (MVC layout)
│   └── src/
│       ├── config/        DB connection
│       ├── controllers/    Route logic
│       ├── middleware/    Auth guard, error handler
│       ├── models/        Mongoose schemas
│       ├── routes/        Route definitions
│       ├── app.js         Express app setup
│       └── server.js      Entry point
├── frontend/         React + Vite + TypeScript client
└── docker-compose.yml
```

---

## How to Run This Project

You need two things before starting:
1. **Node.js 18 or newer** — [nodejs.org](https://nodejs.org)
2. **A `.env` file for both `backend/` and `frontend/`** with real values (see below)

### Step 1 — Clone the repository

```bash
git clone https://github.com/Henu67/Full-Stack-Development.git
cd Full-Stack-Development
```

### Step 2 — Set up environment variables

Each folder needs its own `.env` file. Copy the example files and fill in real values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**`backend/.env` needs:**
```
PORT=5000
MONGODB_URI=            # MongoDB Atlas connection string
JWT_SECRET=              # any long random string
CLIENT_ORIGIN=http://localhost:5173
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GOOGLE_CLIENT_ID=
```

**`frontend/.env` needs:**
```
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=
```

> These `.env` files contain real secrets and are intentionally excluded from this repository.

---

### Option A — Run directly with Node.js (recommended)

**Backend** (in one terminal):
```bash
cd backend
npm install
npm run dev
```
Runs on **http://localhost:5000**. You should see `MongoDB connected` in the terminal once it starts successfully.

**Frontend** (in a separate terminal):
```bash
cd frontend
npm install
npm run dev
```
Runs on **http://localhost:5173** — open this in your browser.

---

### Option B — Run with Docker Compose

Requires Docker Desktop installed and running.

```bash
docker compose up --build
```

This builds and starts both the backend and frontend containers together. The database is **not** containerized — the app connects to MongoDB Atlas (cloud), so no local database container is needed. Once running, open **http://localhost:5173**.

To stop:
```bash
docker compose down
```

---

## Running Backend Tests

```bash
cd backend
npm test
```

This runs the backend's unit test suite (Node's built-in test runner), covering the `escapeRegex` security fix that protects the friend-search endpoint against ReDoS attacks. Expected output ends with `pass 3`, `fail 0`.

## Building for Production

```bash
cd frontend
npm run build
```

Produces an optimized static build in `frontend/dist/`.

---

## API Testing

A Postman collection is included at the repository root: `SynchBoard_Postman_Collection.json`. Import it into Postman, set the `baseUrl` collection variable to `http://localhost:5000`, and use the **Login** request first — it automatically saves the returned token for use in every other request.

---

## Continuous Integration

Every push and pull request automatically runs backend tests and a full frontend production build via GitHub Actions (`.github/workflows/ci.yml`) — check the **Actions** tab on GitHub to see pipeline status.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Cannot find module` errors | Run `npm install` again in that folder |
| Backend can't connect to MongoDB | Check `MONGODB_URI` in `backend/.env` is correct and you're online (Atlas is cloud-hosted) |
| Frontend loads but API calls fail | Check `VITE_API_URL=http://localhost:5000` in `frontend/.env`, and confirm the backend terminal is still running |
| Port 5000 or 5173 already in use | Close whatever else is using that port, or change the port in `.env` |

---

## Known Limitations

- Chat and task-board updates currently work over REST (post → refetch), not live WebSocket push. This was a deliberate scoping decision. The full project report includes all the reasoning and planned next steps.
- No public deployment is live yet; the app is designed to run locally or via Docker for this submission.
- Deployment plan: 
    - Frontend: vercel
    - Backend: Render