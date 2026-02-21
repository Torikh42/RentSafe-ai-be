# RentSafe-ai Backend

Hono + Drizzle ORM + PostgreSQL backend for RentSafe-ai.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL 16 (Docker)

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) installed
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed

### 1. Setup Environment

```bash
cp .env.example .env
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Start PostgreSQL

```bash
docker compose up -d
```

### 4. Run Migrations

```bash
bun db:generate
bun db:migrate
```

### 5. Start Dev Server

```bash
bun dev
```

Server runs on `http://localhost:8000`.

## Database Commands

```bash
bun db:generate   # Generate migrations
bun db:migrate    # Apply migrations
bun db:studio     # Open Drizzle Studio
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `PORT` | Server port | `8000` |
