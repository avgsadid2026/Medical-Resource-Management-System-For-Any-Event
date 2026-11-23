# EMRMS — Event Medical & Resource Management System

> **Academic & Demo Notice:** EMRMS is a student DBMS and full-stack software engineering prototype using **synthetic demo data only**. It is **not** a certified clinical EHR, HIPAA/BMDC-certified platform, or life-critical dispatch system.

## Project Structure

```text
D:\DBMS LAB\
├── Design-reference/                  # READ-ONLY: Original Google Stitch export (do not modify)
├── frontend/                          # React + Vite + TypeScript + Tailwind CSS + shadcn/ui
├── backend/                           # Node.js + Express + TypeScript + PostgreSQL + Prisma
├── docker-compose.yml                 # Optional local PostgreSQL 16 container
├── emrms_architecture_proposal.md     # Approved Revision 2 Technical Architecture Proposal
└── README.md
```

## Prerequisites

- **Node.js** v20+ (v24 verified) and **npm**
- **PostgreSQL 15+** (either installed locally on Windows, or started with Docker via `docker compose up -d`)

---

## Step-by-Step Setup & Local Run Instructions

### 1. Start PostgreSQL

**Option A — Using Docker Desktop (easiest):**
```powershell
docker compose up -d
```

**Option B — Local PostgreSQL Installation:**
Create an empty database named `emrms_db` (e.g., via pgAdmin or `createdb emrms_db`).

---

### 2. Configure Backend Environment Variables

Copy `backend/.env.example` to `backend/.env` and update `DATABASE_URL` if your PostgreSQL username/password differs from `postgres:postgres`:

```powershell
Copy-Item backend\.env.example backend\.env
```

---

### 3. Install Dependencies

```powershell
cd backend
npm install

cd ..\frontend
npm install
```

---

### 4. Apply Initial Database Migration & Seed Synthetic Data

From `backend/`:

```powershell
# Generate Prisma TypeScript client
npm run db:generate

# Apply the initial 19-table migration (includes custom partial indexes, CHECK constraints & audit trigger)
npm run db:migrate:deploy

# Seed realistic synthetic demo data (all 6 roles + reconciled BAUST CSE Fest demo dataset)
npm run db:seed
```

> **Note:** To browse your PostgreSQL tables visually, run `npm run db:studio` inside `backend/`.

### Seeded Synthetic Demo Accounts (Password for all: `DemoPass123!`)

| Role | Email | Staff Code |
|---|---|---|
| Super Admin (`SUPER_ADMIN`) | `admin@baust-demo.edu.bd` | `ADM-001` |
| Medical Admin / CMO (`MEDICAL_ADMIN`) | `e.vance@baust-demo.edu.bd` | `BMDC-A-48921` |
| Doctor (`DOCTOR`) | `t.hasan@baust-demo.edu.bd` | `BMDC-A-63319` |
| Nurse (`NURSE`) | `f.yasmin@baust-demo.edu.bd` | `BNMC-8841-A` |
| Nurse 2 (`NURSE` — dual-verification demo) | `s.yesmin@baust-demo.edu.bd` | `BNMC-4190-K` |
| Dispatcher (`DISPATCHER`) | `dispatch@baust-demo.edu.bd` | `DSP-014` |
| Volunteer (`VOLUNTEER`) | `volunteer@baust-demo.edu.bd` | `VOL-204` |

---

### 5. Run Development Servers

**Terminal 1 — Backend API (`http://localhost:4000`):**
```powershell
cd backend
npm run dev
```
Verify health check: open `http://localhost:4000/api/v1/health`.

**Terminal 2 — Frontend App (`http://localhost:5173`):**
```powershell
cd frontend
npm run dev
```
