# Rayyan AI

Rayyan AI is a personal intelligence OS built as a React + Express monorepo.

## Stack

- Frontend: React 18 + Vite + TailwindCSS
- Backend: Node.js + Express
- Database: PostgreSQL + Prisma
- Cache: Redis
- Auth: Single-user owner mode
- Vector DB: Pinecone
- AI: OpenAI, Anthropic, Google Gemini

## Repo Layout

```text
frontend/  # Vite app
backend/   # Express API + Prisma
api/       # Vercel serverless entrypoint
```

## Environment Variables

Backend:

- `DATABASE_URL`
- `DIRECT_URL`
- `REDIS_URL` (optional)
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_GEMINI_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_INDEX`
- `PINECONE_REGION`
- `FRONTEND_URL`
- `SINGLE_USER_EMAIL` (optional)
- `SINGLE_USER_NAME` (optional)
- `SINGLE_USER_ASSISTANT_NAME` (optional)

Frontend:

- `VITE_API_URL` (optional)
  Leave empty for same-origin deployments on Render or Vercel.

## Supabase Database Setup

If you use Supabase Postgres:

- `DATABASE_URL` should be your pooled or runtime-safe Postgres URL
- `DIRECT_URL` should be your direct Postgres URL for Prisma migrations
- both URLs should include `?sslmode=require`

Example:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require
DIRECT_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require
```

Supabase project URL and publishable key are not required for this app's current server-side database setup.

## Render Deployment

This repo includes [render.yaml](./render.yaml) for a single Render web service.

Recommended Render settings:

- Service type: `Web Service`
- Root Directory: blank
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/api/health`

Required Render env vars:

- `DATABASE_URL`
- `DIRECT_URL`
- `FRONTEND_URL`

Optional Render env vars:

- `REDIS_URL`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_GEMINI_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_INDEX`
- `PINECONE_REGION`
- `SINGLE_USER_EMAIL`
- `SINGLE_USER_NAME`
- `SINGLE_USER_ASSISTANT_NAME`

## Vercel Deployment

This repo includes [vercel.json](./vercel.json) for:

- static frontend output from `frontend/dist`
- serverless API routes via [api/[...route].js](./api/[...route].js)

Required Vercel env vars:

- `DATABASE_URL`
- `DIRECT_URL`
- `FRONTEND_URL`

Optional Vercel env vars:

- `REDIS_URL`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_GEMINI_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_INDEX`
- `PINECONE_REGION`
- `SINGLE_USER_EMAIL`
- `SINGLE_USER_NAME`
- `SINGLE_USER_ASSISTANT_NAME`

## Local Secret Safety

- Real `.env` files are ignored by git.
- Example values live in:
  - [backend/.env.example](./backend/.env.example)
  - [frontend/.env.example](./frontend/.env.example)
