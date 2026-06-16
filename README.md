# HRMS — Human Resource Management System

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=FFA000" alt="Firebase">
</p>

<p align="center">
  <a href="https://eth-finnal-1.onrender.com">
    <img src="https://img.shields.io/badge/Live%20Demo-Click%20Here-4CAF50?style=for-the-badge" alt="Live Demo">
  </a>
  <a href="https://eth-finnal-1.onrender.com/docs">
    <img src="https://img.shields.io/badge/API%20Docs-Open%20Here-2196F3?style=for-the-badge" alt="API Docs">
  </a>
</p>

---

## Live Deployment

| Service | URL | Status |
|---------|-----|--------|
| **Frontend (Main)** | https://eth-finnal-1.onrender.com | Production |
| **Backend API** | https://eth-finnal-1.onrender.com | Production |
| **API Docs** | https://eth-finnal-1.onrender.com/docs | Interactive |

---

## Features

### Employee Management
- Full CRUD operations (Create, Read, Update, Delete)
- Department assignment with 9 departments
- Position and salary tracking
- Document upload system
- Employee search and filtering
- Status management (Active/Inactive/On Leave)

### Attendance Tracking
- **Daily logging** — Manual check-in/check-out entry
- **Bulk operations** — Mark all employees at once
- **CSV Export** — Download attendance data
- **Monthly summaries** — Statistics and reports
- **Real-time today view** — Live attendance dashboard
- Automatic late calculation

### Leave Management
- Leave request submission
- Approval/rejection workflow
- Leave type configuration
- Balance tracking per employee
- Overlap validation

### Payroll
- Monthly payroll generation
- Automatic working days calculation (22 days)
- Payslip viewing
- Salary structure management

### Security & Access Control
- **Firebase Google OAuth** — Secure admin authentication
- **JWT Portal Auth** — Employee self-service login
- **Role-Based Access** — 4 roles: Super Admin, Admin, HR Manager, Viewer
- **Admin approval workflow** — New admins require approval
- Rate limiting on login endpoints
- Audit logging for all actions

---

## Technology Stack

| Category | Technology |
|----------|------------|
| **Backend** | FastAPI 0.115, SQLAlchemy 2.0, Pydantic 2.9 |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3 |
| **Authentication** | Firebase Auth (Google OAuth) + JWT |
| **Database** | PostgreSQL 15 |
| **Deployment** | Render (Backend + DB), Vercel (Frontend) |

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + Vite)                  │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐  ┌─────────────┐  │
│  │ Firebase │  │   Axios   │  │  React     │  │  Tailwind  │  │
│  │   Auth   │  │Interceptor│  │   Router   │  │    CSS     │  │
│  └──────────┘  └───────────┘  └────────────┘  └─────────────┘  │
└────────────────────────────┬───────────────────────────────────┘
                             │ Bearer Token / JWT
                             ▼
┌────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Routers → Services → Models → SQLAlchemy         │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐   │
│  │ Firebase │  │   JWT    │  │  Rate     │  │    Audit     │   │
│  │   Auth   │  │  Portal  │  │  Limiter  │  │   Logging   │   │
│  └──────────┘  └──────────┘  └───────────┘  └──────────────┘   │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│                    POSTGRES DATABASE                            │
│  ┌──────────┐  ┌───────────┐  ┌────────┐  ┌────────┐  ┌───────┐ │
│  │Employees │  │Attendance │  │ Leave │  │Payroll│  │ Admin │ │
│  └──────────┘  └───────────┘  └────────┘  └────────┘  └───────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## Security Features

| Feature | Description |
|---------|-------------|
| **Firebase Authentication** | Google OAuth sign-in for admins |
| **JWT Tokens** | Secure token-based auth for employee portal |
| **Role-Based Access** | 4-tier role system with granular permissions |
| **Rate Limiting** | 5 requests/minute on portal login |
| **Input Validation** | Pydantic schemas with strong typing |
| **SQL Injection Protection** | SQLAlchemy ORM prevents SQL injection |
| **CORS Protection** | Explicit origin allowlist (not wildcard) |
| **Security Headers** | X-Frame-Options, HSTS, X-Content-Type-Options |
| **File Upload Validation** | Size limits (10MB), MIME type checking |
| **Audit Logging** | All admin actions tracked with timestamps |
| **Error Sanitization** | Internal errors never exposed to clients |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | Register admin via Firebase | Firebase Token |
| GET | `/api/v1/auth/me` | Get current admin | Firebase Token |
| POST | `/api/v1/auth/register/approve/{id}` | Approve pending admin | Super Admin |

### Employees
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/employees` | List employees (paginated) | Firebase Token |
| POST | `/api/v1/employees` | Create employee | Admin/HR |
| GET | `/api/v1/employees/{id}` | Get employee details | Firebase Token |
| PUT | `/api/v1/employees/{id}` | Update employee | Admin/HR |
| DELETE | `/api/v1/employees/{id}` | Delete employee | Admin Only |

### Attendance
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/attendance` | List attendance | Firebase Token |
| POST | `/api/v1/attendance` | Create record | Admin/HR |
| GET | `/api/v1/attendance/today` | Today's attendance | Firebase Token |
| POST | `/api/v1/attendance/bulk` | Bulk create | Admin/HR |
| GET | `/api/v1/attendance/export` | Export to CSV | Firebase Token |
| GET | `/api/v1/attendance/monthly-summary` | Monthly stats | Firebase Token |

### Leave
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/leave` | List requests | Firebase Token |
| POST | `/api/v1/leave` | Submit request | Employee |
| PUT | `/api/v1/leave/{id}` | Approve/reject | Admin/HR |

### Payroll
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/payroll` | List records | Admin |
| POST | `/api/v1/payroll/generate` | Generate monthly | Admin/HR |
| GET | `/api/v1/payroll/{id}/payslip` | View payslip | Admin |

### Employee Portal
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/portal/login` | Employee login | None |
| POST | `/api/v1/portal/refresh` | Refresh token | JWT |
| GET | `/api/v1/portal/me` | My profile | JWT |
| PUT | `/api/v1/portal/me` | Update profile | JWT |
| PUT | `/api/v1/portal/change-password` | Change password | JWT |
| GET | `/api/v1/portal/attendance` | My attendance | JWT |
| GET | `/api/v1/portal/leave` | My leave requests | JWT |
| POST | `/api/v1/portal/leave` | Submit leave | JWT |

---

## Role Permissions

| Feature | Super Admin | Admin | HR Manager | Viewer |
|---------|:----------:|:-----:|:----------:|:------:|
| Manage admins | ✅ | ❌ | ❌ | ❌ |
| Approve admins | ✅ | ❌ | ❌ | ❌ |
| Delete employees | ✅ | ✅ | ❌ | ❌ |
| Create employees | ✅ | ✅ | ✅ | ❌ |
| View all data | ✅ | ✅ | ✅ | ✅ |
| Manage attendance | ✅ | ✅ | ✅ | ❌ |
| Approve leave | ✅ | ✅ | ✅ | ❌ |
| Generate payroll | ✅ | ✅ | ✅ | ❌ |
| View audit logs | ✅ | ✅ | ❌ | ❌ |
| Delete attendance | ✅ | ❌ | ❌ | ❌ |

---

## Project Structure

```
HRMS/
├── backend/
│   ├── main.py                  # FastAPI application entry point
│   ├── core/
│   │   ├── config.py           # Configuration & environment validation
│   │   ├── security.py         # Firebase authentication & role checking
│   │   ├── employee_auth.py    # JWT token generation & validation
│   │   ├── database.py         # SQLAlchemy database setup
│   │   ├── email.py            # Email service (SMTP/SendGrid)
│   │   └── logger.py           # Structured logging
│   ├── routers/
│   │   ├── auth.py             # Admin authentication
│   │   ├── employees.py        # Employee CRUD operations
│   │   ├── attendance.py       # Attendance tracking
│   │   ├── leave.py            # Leave management
│   │   ├── leave_types.py     # Leave type configuration
│   │   ├── payroll.py          # Payroll generation
│   │   ├── portal.py          # Employee self-service portal
│   │   ├── admin.py           # Admin management
│   │   ├── departments.py     # Department CRUD
│   │   ├── documents.py       # Document upload
│   │   ├── analytics.py       # Analytics & trends
│   │   ├── notifications.py   # Notification system
│   │   ├── dashboard.py       # Dashboard statistics
│   │   └── settings.py        # System settings
│   ├── services/               # Business logic layer
│   ├── models/                 # SQLAlchemy ORM models
│   ├── schemas/                # Pydantic request/response schemas
│   └── requirements.txt        # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── pages/              # Page components
│   │   ├── components/         # Reusable UI components
│   │   ├── contexts/          # React contexts
│   │   ├── api.js             # Axios API client
│   │   └── firebase.js        # Firebase initialization
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Firebase project with Google Auth enabled

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-repo/hrms.git
cd hrms

# Backend setup
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8000

# Frontend setup (new terminal)
cd frontend
npm install
copy .env.example .env
npm run dev
```

---

## Environment Variables

### Backend (.env)
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Yes | Firebase service account JSON |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `EMPLOYEE_JWT_SECRET` | Yes | JWT secret for employee portal |
| `ADMIN_JWT_SECRET` | Yes | JWT secret for admin portal |
| `FRONTEND_URL` | Yes | Frontend URL for CORS |
| `ENVIRONMENT` | No | development/production |
| `DEV_MODE` | No | Enable dev mode (dev only!) |
| `ALLOW_ADMIN_SELF_REGISTRATION` | No | Allow self-reg (dev only!) |

### Frontend (.env)
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend API URL |
| `VITE_FIREBASE_API_KEY` | Yes | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID |

---

## Deployment

### Production Deployment

#### Backend (Render)
1. Create PostgreSQL database on Render
2. Create Web Service with:
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Set environment variables

#### Frontend (Vercel/Render)
1. Connect GitHub repository
2. Configure build:
   - Build: `npm run build`
   - Output: `dist`
3. Set environment variables
4. Add rewrite rule: `/*` → `/index.html`

---

## Database Schema

### admin_users
| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer | Primary key |
| `firebase_uid` | String | Firebase UID (unique) |
| `email` | String | Email (unique) |
| `name` | String | Display name |
| `role` | Enum | super_admin, admin, hr_manager, viewer |
| `is_active` | Boolean | Account active status |
| `last_login` | DateTime | Last login timestamp |
| `created_at` | DateTime | Creation timestamp |

### employees
| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer | Primary key |
| `employee_id` | String | Unique ID (EMP0001) |
| `first_name` | String | First name |
| `last_name` | String | Last name |
| `email` | String | Email (unique) |
| `phone` | String | Phone number |
| `department` | Enum | Department (Engineering, HR, etc.) |
| `position` | String | Job position |
| `salary` | Decimal | Salary amount |
| `hire_date` | Date | Hire date |
| `status` | Enum | Active, Inactive, On Leave |

### attendance
| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer | Primary key |
| `employee_id` | Integer | FK to employees |
| `date` | Date | Attendance date |
| `check_in` | DateTime | Check-in time |
| `check_out` | DateTime | Check-out time |
| `status` | Enum | Present, Absent, Late, Half Day |
| `hours_worked` | Decimal | Calculated hours |
| `is_late` | Boolean | Late flag |
| `late_minutes` | Integer | Minutes late |

---

## Screenshots

The application includes:
- **Login Page** — Google OAuth sign-in
- **Dashboard** — Stats cards, charts, recent activity
- **Employees** — Searchable table with CRUD modals
- **Attendance** — Date filters, bulk operations, export
- **Leave** — Request submission, approval workflow
- **Payroll** — Monthly generation, payslip view
- **Employee Portal** — Self-service profile & attendance

---

## License

MIT License — Feel free to use this for your own projects!

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

## Support

For issues and questions, please open a GitHub issue.