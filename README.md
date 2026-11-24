# Fieldnote Farm Tracker

A local-first farm management application built with Spring Boot, React, and PostgreSQL. It tracks fields, crops, harvests, crop expenses, livestock, and farm-wide summary figures. The backend scopes every record to the authenticated account.

## Requirements

- Java 21 and Maven
- Node.js 20+ and npm
- PostgreSQL 15+ running locally

Docker is not used.

## PostgreSQL Setup

Connect to PostgreSQL using an administrator account, then create the application role and database:

```sql
CREATE ROLE farm_tracker LOGIN PASSWORD 'farm_tracker';
CREATE DATABASE farm_tracker OWNER farm_tracker;
```

For example, on a typical Linux installation, an administrator can open `psql` with `sudo -u postgres psql`. Choose a stronger local password and set `FARM_DB_PASSWORD` to the same value before starting the API. If the role or database already exists, update it instead of creating it again.

The API defaults to `jdbc:postgresql://localhost:5432/farm_tracker`, role `farm_tracker`, and password `farm_tracker`. Override these values with `FARM_DB_URL`, `FARM_DB_USER`, and `FARM_DB_PASSWORD`. Hibernate creates or updates the tables on startup.

## Run Locally

Start the API in one terminal from the project root:

```bash
export FARM_DB_USER=farm_tracker
export FARM_DB_PASSWORD=farm_tracker
mvn -f backend/pom.xml spring-boot:run
```

Start the React development server in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`), create an account, and sign in. The API listens on port `8080`. To change the frontend API URL, set `VITE_API_URL` before starting Vite; the default is `http://localhost:8080/api`.

## Configuration

- `FARM_JWT_SECRET` sets the signing secret. The built-in value is for local development only; set a unique secret of at least 32 characters outside development.
- `FARM_JWT_EXPIRATION_MS` sets token lifetime in milliseconds (default: 24 hours).
- `FARM_CORS_ORIGIN` sets the allowed browser origin (default: `http://localhost:5173`).
- `SERVER_PORT` changes the API port (default: `8080`).

Passwords are stored as BCrypt hashes. The browser stores a bearer token in local storage; use HTTPS and a hardened token-storage strategy before exposing the app publicly.

## Features

- Unique account registration and username/email login
- Per-user field creation, editing, listing, and deletion safeguards
- Crop tracking by field, with planting and expected harvest date validation
- Crop status updates and one harvest record per crop
- Categorized crop expenses and per-crop/farm totals
- Field-linked livestock records
- Summary dashboard for fields, active/harvested crops, costs, and crop yields

## Verify

```bash
mvn -f backend/pom.xml test
cd frontend && npm run build
```

The backend API is under `/api`; authentication endpoints are `/api/auth/register` and `/api/auth/login`.