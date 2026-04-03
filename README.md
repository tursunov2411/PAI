# Rayyan AI

Rayyan AI is a personal intelligence OS built as a Node/React monorepo.

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
```

## Render Deployment

This repo includes [render.yaml](./render.yaml) for:

- `rayyanai-api` web service
- `rayyanai-frontend` static site
- `rayyanai-db` PostgreSQL database
- `rayyanai-redis` Key Value instance

### Required Render Environment Variables

Backend:

- `DATABASE_URL`
- `DIRECT_URL`
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

- `VITE_API_URL`

### First Deploy Notes

1. Create the Render blueprint from this repo.
2. Fill the `sync: false` variables in Render.
3. Set `FRONTEND_URL` to your frontend Render URL.
4. Set `VITE_API_URL` to your backend Render URL.
5. If you use Supabase:

- set `DATABASE_URL` to the pooled connection string
- set `DIRECT_URL` to the direct Postgres connection string

6. Run the backend after the database is created so Prisma migrations can apply with:

```bash
npm run prisma:deploy --workspace backend
```

## Local Secret Safety

- Real `.env` files are ignored by git.
- Example values live in:
  - [backend/.env.example](./backend/.env.example)
  - [frontend/.env.example](./frontend/.env.example)
