# EduConnect AI

**One Platform. Every Student. Every Solution.**

AI-powered school & college management platform: three role-based portals (student, teacher, administrator), attendance, assignments, exams/results, study materials, teacher–student messaging, complaints, notifications, the **EduBot** AI chatbot and a fully working **Chat with Your PDF** (RAG) feature.

> **Status:** this source was generated in a sandbox with no access to the npm registry or a database, so it has **not been compiled or run yet**. Expect to fix a few type/lint errors on the first `npm run build`. Follow "First run" below and test each module.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · lucide-react · Recharts · Prisma + PostgreSQL · Zod · jose (signed session cookies) · bcryptjs · OpenAI API · unpdf (PDF.js based text extraction)

Note: the brief mentioned shadcn/ui; to keep the MVP dependency-light the UI uses small Tailwind component classes (`.btn`, `.card`, `.input` in `src/app/globals.css`) and shared components in `src/components/`. shadcn/ui can be added later without changing the architecture.

## Requirements

- Node.js 20+ (22 recommended)
- PostgreSQL 13+ (local, Docker, Neon, Supabase … – **pgvector is not required**)
- An OpenAI API key for the chatbot and PDF chat (everything else works without it)

## First run

```bash
cd educonnect-ai
npm install
cp .env.example .env          # then edit .env (see below)
npx prisma db push            # creates all tables
npm run db:seed               # loads demo data
npm run dev                   # http://localhost:3000
```

Quick local Postgres with Docker:

```bash
docker run --name educonnect-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=educonnect -p 5432:5432 -d postgres:16
```

### .env

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random 32+ char secret used to sign sessions (`openssl rand -base64 32`) |
| `OPENAI_API_KEY` | Enables EduBot + Chat with Your PDF. If empty, those pages show a clear "not configured" message – no fake answers |
| `OPENAI_CHAT_MODEL` / `OPENAI_EMBEDDING_MODEL` | Defaults: `gpt-4o-mini`, `text-embedding-3-small` |
| `STORAGE_DIR`, `MAX_PDF_MB`, `MAX_UPLOAD_MB` | Local upload folder and size limits |
| `SEED_PASSWORD` | Password for all demo accounts (default `Password@123`) |

## Demo accounts (after `npm run db:seed`)

Password for all: `Password@123`

| Portal | Login ID / email |
|---|---|
| Student `/login/student` | `STU2026001` or `aarav@sit.test` (also STU2026002…006) |
| Teacher `/login/teacher` | `EMP1001` / `rajesh@sit.test`, `EMP1002` / `priya@sit.test` |
| Admin `/login/admin` | `ADMIN001` / `admin@sit.test` (college), `ADMIN002` / `admin@gps.test` (school) |
| Super Admin `/login/admin` | `SUPER001` / `super@educonnect.test` |

Change these passwords before any real deployment.

## What's included

- **Public:** Home, About, Features, Contact, Forgot password, three login portals.
- **Student:** Dashboard, Profile, Attendance (daily/subject/monthly), Assignments (submit text/file), Results + exam timetable, Study Materials (search/filter/download/video links), EduBot, Chat with Your PDF, Messages, Complaints (ticket IDs, history), Notifications, Settings, floating assistant button.
- **Teacher:** Dashboard (+ announcements), Students (attendance/performance), Classes, Subjects, Attendance marking, Assignments + grading, Study Materials upload, Student Queries, Messages, Results (marks → auto grade → publish).
- **Admin:** Dashboard, Students & Teachers (add/edit/view/deactivate, password reset, fees), Institutions (Super Admin: create/switch/deactivate), Departments & programs, Classes, Subjects (offer to class + assign teacher), Attendance reports, Examinations, Complaints workflow, Announcements, Analytics (Recharts), Settings (institution, academic sessions).

## How Chat with Your PDF works

1. `POST /api/pdf` – validates size and the `%PDF-` header, extracts text **per page** (unpdf), rejects scanned/no-text PDFs with an OCR message.
2. Text is split into ≈650-token chunks with overlap, keeping page number, document id, institution id and owner id.
3. Chunks are embedded (OpenAI embeddings) and stored in Postgres as `Float[]`. If embeddings are unavailable the document falls back to keyword search.
4. `POST /api/pdf/chat` – checks the document belongs to the signed-in user, retrieves the best chunks by cosine similarity (or the requested page, or an even spread for "summarize/MCQ" questions), and asks the model to answer **only** from those excerpts. Excerpts are treated as untrusted data (prompt-injection guard).
5. The UI shows the answer (Markdown), page-number source chips, and follow-up suggestions.

Similarity is computed in the app, which is perfect for study-sized PDFs. For very large corpora, move to pgvector (replace `DocumentChunk.embedding` with a `vector` column and use an index).

## Security notes

- Passwords hashed with bcrypt (cost 12); sessions are signed JWTs in an HttpOnly cookie.
- Every portal layout, server action, API route and download re-verifies the user and role **against the database** (middleware is only a first filter). No frontend-only role checks.
- All institution data is queried with `institutionId` scoping; teachers can only touch courses they are assigned to; students only their own PDFs, submissions and complaints.
- Login responses are generic and rate-limited (in-memory; use Redis if you run multiple instances).
- OpenAI keys are only read on the server.
- File uploads: size limits, blocked executable/HTML extensions, files stored outside `public/`, served only through authorised `/api/download/...` routes.
- Forgot password: no email service is bundled – the request notifies the institution's admins, who set a temporary password from the user's profile. Plug an email provider into `requestPasswordReset` (`src/app/actions/public.ts`) to automate.

## Project structure

```
prisma/              schema.prisma (all 31 models + Announcement), seed.ts
src/app/             pages (public, /student, /teacher, /admin), api routes, server actions
src/app/actions/     server actions: admin, teacher, student, messages, account, public
src/app/api/         auth, ai/chat, pdf, pdf/chat, download
src/components/      Shell (sidebar), UI kit, chat panels, charts, messaging
src/lib/             auth, prisma, ai, pdf (extract/chunk/search), storage, helpers
```

## Deployment

1. Provision PostgreSQL; set `DATABASE_URL`, `AUTH_SECRET`, `OPENAI_API_KEY`.
2. `npx prisma migrate deploy` (after generating migrations with `npx prisma migrate dev`) or `npx prisma db push`.
3. `npm run build && npm start` – or deploy to Vercel/Render/Railway.
4. **File storage:** Vercel and similar hosts have ephemeral disks. Replace the functions in `src/lib/storage.ts` with an S3-compatible implementation (same signatures) before going live. Run the seed only on demo databases – it wipes existing data.
5. Long PDF uploads can take time (embeddings); raise the function timeout on your host if needed.

## Known limitations / next steps

- Not yet compiled in the generating environment – run `npm run build` and fix any small type issues.
- No automated tests yet; suggested first tests: login role isolation, teacher-course authorisation, PDF owner checks.
- Scanned PDFs need OCR (e.g. OCRmyPDF) before upload.
- Messaging uses 10-second auto-refresh, not WebSockets.
- Dark mode, email delivery and CSV export of reports are not included.
