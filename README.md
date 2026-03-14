# HRMS — Human Resource Management System

A lightweight, production-ready HRMS built with **FastAPI + React + PostgreSQL + Firebase Auth**, deployed on Render.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Employee Management** | Add, edit, delete employees — name, email, department, position, salary, hire date, status |
| **Attendance Tracking** | Individual log or bulk-mark all employees; check-in/out times, hours auto-calculated |
| **Dashboard Analytics** | Live headcount stats, department bar chart, today's attendance pie chart |
| **Firebase Auth** | Google OAuth sign-in; admin-only access enforced on every API route |
| **Pagination & Filters** | Search, filter by department/status/date range on all tables |

---

## 🖥 Screens & UI

| Screen | Features |
|--------|---------|
| **Login** | Google OAuth, split-panel layout |
| **Dashboard** | 8 stat cards, Recharts bar + pie charts, recent hires table |
| **Employees** | Searchable/filterable table, add/edit/delete modals, paginated |
| **Attendance** | Date-range filtered table, single log modal, bulk-mark all employees modal |

### UI State Coverage
Every screen handles all three states:
- **Loading** — spinner shown while API request is in flight
- **Empty** — icon + message when no data exists
- **Error** — toast notification on any API failure
- Form modals show inline field-level validation and a saving spinner on submit

---

## 🗂 Project Structure

```
hrms-project/
├── backend/
│   ├── main.py          # All FastAPI routes (15 endpoints)
│   ├── models.py        # SQLAlchemy ORM models
│   ├── schemas.py       # Pydantic request/response schemas
│   ├── database.py      # PostgreSQL connection (handles Render postgres:// prefix)
│   ├── auth.py          # Firebase token verification middleware
│   ├── .env.example     # All required environment variables documented
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── EmployeesPage.jsx
│   │   │   └── AttendancePage.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx               # Sidebar + topbar shell
│   │   │   ├── EmployeeModal.jsx        # Add/edit employee form
│   │   │   ├── AttendanceModal.jsx      # Log/edit single attendance
│   │   │   └── BulkAttendanceModal.jsx  # Mark all employees at once
│   │   ├── contexts/AuthContext.jsx     # Firebase auth state + admin registration
│   │   ├── api.js        # Axios client — auto-injects Firebase ID token
│   │   ├── firebase.js   # Firebase app init
│   │   └── App.jsx       # Router + protected routes
│   ├── .env.example
│   ├── tailwind.config.js
│   └── vite.config.js
└── render.yaml
```

---

## 🔧 Assumptions

- **Single admin role** — any Google account that signs in is registered as admin. To restrict access, add an email allowlist check in `backend/auth.py` → `get_current_admin`.
- **PostgreSQL only** — no SQLite fallback. A running Postgres instance is required locally and on Render.
- **Firebase Google Auth only** — email/password login is not implemented. Can be added via Firebase console + a small frontend change.
- **No file uploads** — avatar URLs are stored as plain strings; image upload (e.g. Firebase Storage) is not included.
- **Salary stored as decimal** — displayed in INR (₹). Currency symbol can be changed in `EmployeesPage.jsx`.
- **Attendance uniqueness** — one record per employee per date enforced at DB + API level. Bulk mark upserts (updates if exists, creates if not).
- **Hours worked** — auto-calculated from check-in and check-out. If either is missing, hours_worked is null.
- **Tables auto-created** — SQLAlchemy runs `create_all` on startup. No manual migration needed for a fresh deploy.

---

## 🚀 Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL running locally
- Firebase project with Google Auth enabled

### Backend

```bash
cd backend

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# Edit .env — set DATABASE_URL and Firebase credentials

uvicorn main:app --reload --port 8000
```

Tables are auto-created on first run. API docs at `http://localhost:8000/docs`

**Dev mode (skip Firebase auth locally):**
Set `DEV_MODE=true` in your `.env`. The first admin in the DB is used automatically — no token needed.

### Frontend

```bash
cd frontend

npm install

cp .env.example .env
# Edit .env — set VITE_API_URL=http://localhost:8000 and Firebase web config

npm run dev
```

App at `http://localhost:5173`

---

## 🔥 Firebase Setup

### 1. Create project
[console.firebase.google.com](https://console.firebase.google.com) → Add project → disable Analytics → Create

### 2. Enable Google Auth
Authentication → Sign-in method → Google → Enable → Save

### 3. Frontend config
Project Settings → Your apps → Add web app → copy the config object values to `frontend/.env`

### 4. Backend service account
Project Settings → Service accounts → Generate new private key → a `.json` file downloads.
Copy the **entire file contents** as the value of `FIREBASE_SERVICE_ACCOUNT_JSON`.

### 5. Authorized domains (after deploy)
Authentication → Settings → Authorized domains → Add domain → paste your Render frontend domain:
`hrms-frontend-xxxx.onrender.com`

---

## ☁️ Deploy to Render (Manual)

Deploy in this exact order: **Database → Backend → Frontend**

### Step 1 — PostgreSQL
- New → **PostgreSQL**
- Name: `hrms-db`, Plan: Free
- After creation, copy the **Internal Database URL**

### Step 2 — Backend
- New → **Web Service** → connect GitHub repo
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Plan: Free

**Environment variables — add all before first deploy:**

| Key | Value |
|-----|-------|
| `PYTHON_VERSION` | `3.11.9` |
| `DATABASE_URL` | Internal Database URL from Step 1 |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Entire contents of service account `.json` file |
| `FRONTEND_URL` | Use `http://localhost:5173` for now — update after Step 3 |
| `DEV_MODE` | `false` |

> ⚠️ `PYTHON_VERSION=3.11.9` is mandatory. Render defaults to Python 3.14 which breaks pydantic-core compilation.

### Step 3 — Frontend
- New → **Static Site** → connect same repo
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Add rewrite rule: Source `/*` → Destination `/index.html`

> The rewrite rule is critical — without it, refreshing any page gives a 404.

**Environment variables:**

| Key | Value |
|-----|-------|
| `VITE_API_URL` | Backend URL from Step 2 e.g. `https://hrms-backend-xxxx.onrender.com` |
| `VITE_FIREBASE_API_KEY` | From Firebase console |
| `VITE_FIREBASE_AUTH_DOMAIN` | From Firebase console |
| `VITE_FIREBASE_PROJECT_ID` | From Firebase console |
| `VITE_FIREBASE_STORAGE_BUCKET` | From Firebase console |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From Firebase console |
| `VITE_FIREBASE_APP_ID` | From Firebase console |

### Step 4 — Cross-link services
- Copy frontend URL → go to **hrms-backend → Environment** → update `FRONTEND_URL` → Save
- Backend redeploys automatically

### Step 5 — Firebase authorized domain
Add your frontend `.onrender.com` domain to Firebase → Authentication → Authorized domains.

---

## 📡 API Reference

All endpoints except `/health` and `/api/auth/register` require:
```
Authorization: Bearer <firebase-id-token>
```

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/auth/register` | Register admin after Firebase sign-in |
| GET | `/api/auth/me` | Current admin info |
| GET | `/api/dashboard` | Aggregated stats for dashboard |
| GET | `/api/employees` | List — supports `search`, `department`, `status`, `skip`, `limit` |
| POST | `/api/employees` | Create employee |
| GET | `/api/employees/{id}` | Get single employee |
| PUT | `/api/employees/{id}` | Update employee |
| DELETE | `/api/employees/{id}` | Delete employee + cascade attendance |
| GET | `/api/attendance` | List — filter by `employee_id`, `date_from`, `date_to`, `status` |
| GET | `/api/attendance/today` | Today's full attendance snapshot |
| POST | `/api/attendance` | Log single attendance record |
| PUT | `/api/attendance/{id}` | Update attendance record |
| DELETE | `/api/attendance/{id}` | Delete attendance record |
| POST | `/api/attendance/bulk` | Bulk upsert attendance for multiple employees |

---

## 🗄 Database Schema

```
employees
  id (PK), employee_id (EMP0001, unique), first_name, last_name
  email (unique), phone, department (enum), position
  salary (decimal), hire_date, date_of_birth, address
  status (Active / Inactive / On Leave)
  manager_id (self-FK nullable), created_at, updated_at

attendance
  id (PK), employee_id (FK → employees, cascade delete)
  date, check_in (datetime), check_out (datetime)
  status (Present / Absent / Late / Half Day / On Leave)
  hours_worked (auto-calculated), notes, created_at, updated_at
  UNIQUE (employee_id, date)

admin_users
  id (PK), firebase_uid (unique), email (unique)
  name, role, is_active, created_at
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI 0.115, SQLAlchemy 2.0, Pydantic 2.9, psycopg2-binary |
| Frontend | React 18, Vite 5, Tailwind CSS 3, Recharts, React Router 6 |
| Auth | Firebase Authentication (Google OAuth) + firebase-admin SDK |
| Database | PostgreSQL (Render managed or Neon.tech for permanent free tier) |
| Deployment | Render — Web Service (backend) + Static Site (frontend) + PostgreSQL |

---

## 💡 Free Tier Notes

| Service | Limit | Note |
|---------|-------|------|
| Render Web Service | Free, spins down after 15min idle | ~30s cold start on first hit |
| Render Static Site | Free, always on | Frontend always instant |
| Render PostgreSQL | Free for 90 days | Switch to Neon.tech for permanent free |
| Firebase Auth | Free (Spark plan) | No practical limits for HRMS scale |

**Keep backend warm:** Use [UptimeRobot](https://uptimerobot.com) (free) to ping `/health` every 5 minutes.

---

## 📄 License

MIT
