# Skill Track (Skilling Outcomes Tracker)

Records what happened to skilling trainees after the course: placement, skill gaps against job postings, and placement compared with non-participants.

- `client/`: React, Vite, React Router, Tailwind CSS, Framer Motion, Recharts, Axios
- `server/`: Next.js App Router used as an API only, TypeScript, Prisma, PostgreSQL
- `samples/`: two CSV files and two PDF files for trying the Upload page

## Read this first

- **Not yet built or run with its real dependencies.** See "What has been tested" below. Do the first-run checklist before relying on it.
- **The comparison group is generated sample data.** Do not quote the impact figures as real results.
- **`npm run seed` deletes all records** in the database it points at, then loads sample data. Never run it against live data.
- **AI model:** Groq has retired its Llama chat models ([deprecations](https://console.groq.com/docs/deprecations)), so the default is `openai/gpt-oss-120b`. Set `GROQ_MODEL` to use another.
- No lock files are included. `npm install` creates them; commit them.

## Setup

You need Node 20.11 or newer and PostgreSQL 14 or newer (or a Neon database).

```bash
cd server
cp .env.example .env          # edit DATABASE_URL, JWT_SECRET, GROQ_API_KEY
npm install
npx prisma migrate dev
npm run seed
npm run dev                   # http://localhost:4000
```

In a second terminal:

```bash
cd client
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

## Default admin

| Email | Password |
| --- | --- |
| `admin@outcomedesk.in` | `ChangeMe@2026` |

These come from `ADMIN_EMAIL` and `ADMIN_PASSWORD` at the time you seed. Set your own before seeding anything public.

## Environment variables

| File | Name | Purpose |
| --- | --- | --- |
| server/.env | `DATABASE_URL` | PostgreSQL connection string |
| server/.env | `JWT_SECRET` | Long random string that signs logins (`openssl rand -hex 32`) |
| server/.env | `GROQ_API_KEY` | Needed for PDF skill extraction and recommendations only |
| server/.env | `GROQ_MODEL` | Optional model override |
| server/.env | `CLIENT_URL` | Client origin for CORS and check-in links. Comma separated if more than one; the first is used in links |
| server/.env | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin created by the seed |
| client/.env | `VITE_API_URL` | Server origin, without `/api` |

## First-run checklist

1. `cd server && npm run test && npm run typecheck && npm run build`
2. `cd client && npm run build`
3. Log in. The dashboard should show 570 trainees, inverter configuration as the top gap, and trainees well ahead of the comparison group (about 17 points; names are random, figures follow the seed date).
4. Upload `samples/learners.csv`: 5 ready, 1 skipped (bad phone). Then `samples/job-postings.csv`: 3 ready.
5. With a Groq key, upload `samples/curriculum-solar.pdf` and `samples/job-posting-solar.pdf`, check the skills, confirm.
6. Learners: filter "No answer yet", make a link, open it on a phone, submit, open it again (it should refuse).
7. Skill gaps: press "Write recommendations".
8. Dashboard: set a district filter, export the PDF.
9. Check the charts draw and the animations run; then turn on "reduce motion" in your system and check they stop.

## What has been tested

The build workspace could not install packages, so Next.js, Prisma, Vite, React Router, Framer Motion, Recharts, Axios, bcrypt, jsonwebtoken, papaparse, pdf-parse and faker were not available.

| Area | Status |
| --- | --- |
| Core logic (CSV validation, skill matching, gap and impact maths, check-in validation, CSV escaping) | 11 unit tests pass |
| Migration SQL and seed data | Loaded into PostgreSQL 16 with SQL generated from the seed builder (not through Prisma) |
| Gap and impact figures | Independent SQL matches the TypeScript results |
| PDF export | Generated, opened and checked: one page |
| Client screens and clicks | Run in Chromium with real React and Tailwind, **stand-ins** for router, motion, charts and HTTP, and a fake API |
| Charts and animation | Not tested |
| Login, CSV upload, PDF upload, check-in against the real server | Not tested |
| `next build`, `vite build`, Prisma client, seed script, Groq calls | Not run |

## CSV formats

Learners: `name, phone, program, district, skills, enrolledAt`. Optional: `batch`, `priorSalary`, `verifiedSkills`. Separate skills with `;`. `program` must match an existing program name. Dates are `YYYY-MM-DD` or `DD/MM/YYYY`.

Job postings: `title, district, description, postedAt`.

Limits: 4 MB and 5,000 rows per file.

## How the figures are worked out

- **Demand %**: job postings in the sector (and district) that mention the skill.
- **Supply %**: trainees in the sector who hold it. "Verified only" counts skills an officer has ticked.
- **Priority**: demand x (1 - supply).
- **Placement rate**: employed or self-employed, out of trainees who answered. Non-responders are excluded, which can flatter the figure.
- **Impact**: trainees against comparison records, with comparison figures re-weighted to the trainees' district mix. It is not a randomised study.
- The model only extracts terms and writes advice. Matching to the skill list is done in code; unknown terms go to the unmapped queue.

## Deployment (Neon and Vercel)

1. Create a Neon project. Copy both the direct and the pooled connection strings.
2. From your machine, with `DATABASE_URL` set to the **direct** string: `npx prisma migrate deploy`. For a demo only, also `npm run seed`.
3. Push the repository to GitHub.
4. Vercel project 1: root directory `server`. Add every server variable, with `DATABASE_URL` set to the **pooled** string. Deploy.
5. Vercel project 2: root directory `client`, framework Vite. Set `VITE_API_URL` to the server URL. Deploy.
6. Set the server's `CLIENT_URL` to the client URL and redeploy the server.

### Custom domain

In each Vercel project open Settings, then Domains, and add for example `desk.yourdomain.in` (client) and `api.yourdomain.in` (server). Create the DNS records Vercel shows. Then update `VITE_API_URL` and `CLIENT_URL` to the new addresses and redeploy both.

### Before going public

- Have your department check the Privacy and Terms pages (`client/src/pages/Legal.jsx`) and add a contact.
- Change the admin password and `JWT_SECRET`.
- Login has no rate limit. Add one (Vercel Firewall can do it).

## API routes

All under `/api`. "Admin" needs `Authorization: Bearer <token>`.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | public | Server up, AI key present |
| POST | `/auth/login` | public | Email and password to token |
| GET | `/auth/me` | admin | Current admin |
| GET | `/checkin/:token` | token | First name and program for an open link |
| POST | `/checkin/:token` | token | Submit job status, once |
| GET | `/dashboard` | admin | All dashboard figures |
| GET | `/filters` | admin | Programs, districts, batches, sectors |
| GET | `/skills` | admin | Skill list |
| GET | `/learners` | admin | Paged learners |
| POST | `/learners/links` | admin | Make check-in links |
| GET | `/learners/links/csv` | admin | Download links for the current filter |
| PATCH | `/learners/:id/skills` | admin | Mark a skill verified |
| PATCH | `/outcomes/:id/verify` | admin | Mark employer verified |
| POST | `/upload/csv` | admin | Preview or insert a CSV |
| POST | `/upload/pdf` | admin | Extract skills from a PDF |
| POST | `/upload/pdf/confirm` | admin | Save confirmed skills |
| GET | `/gaps` | admin | Gap report and saved recommendations |
| POST | `/gaps/recommendations` | admin | Ask the model, then save |
| GET | `/impact` | admin | Impact comparison |
| GET | `/unmapped` | admin | Open unmapped terms |
| PATCH | `/unmapped/:id` | admin | Resolve or ignore |

Filter query parameters: `district`, `program`, `batch`, `from`, `to`, `sector`, `verified=1`, and on learners `search`, `status`, `page`.
