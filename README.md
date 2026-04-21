# Student Result Distribution System

Next.js App Router + Supabase application for registering students, matching uploaded result PDFs by matric number, and distributing results through email, SMS, and WhatsApp.

## What it does

- Student registration with validated personal and parent contact details.
- Admin authentication and protected dashboard.
- Bulk PDF upload to Supabase Storage.
- Matric-number matching for result distribution.
- Delivery logging with retry support.

## Project structure

- `src/app` contains the public pages, admin dashboard, and route handlers.
- `src/components` contains the registration, login, and dashboard UI.
- `src/lib` contains Supabase clients, workflow logic, validation, auth, and delivery adapters.
- `supabase/schema.sql` contains the database schema and RLS setup.

## Required environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase and messaging credentials.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `ADMIN_SESSION_SECRET`
- `EMAIL_FROM`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`
- `MESSAGING_PROVIDER`, `TERMII_API_KEY`, `TERMII_SENDER_ID`, `TERMII_BASE_URL`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`, `TWILIO_WHATSAPP_FROM`

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Create a private storage bucket named `student-results`.
4. Insert at least one admin row into `public.admins` with a bcrypt password hash.
5. Set the environment variables in `.env.local`.

See `supabase/README.md` for the storage and database notes.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` for the public landing page, `http://localhost:3000/register` for student registration, and `http://localhost:3000/admin/login` for the dashboard.

## Key API routes

- `POST /api/register-student`
- `PATCH /api/register-student` (update student email/phone by matric number)
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `POST /api/results/upload`
- `POST /api/results/remove` (remove an uploaded result by matric number)
- `POST /api/results/publish`
- `GET /api/students`
- `GET /api/logs`

## Deployment

1. Push the repository to GitHub.
2. Create a Vercel project from the repo.
3. Add the Supabase and messaging environment variables in Vercel.
4. Confirm the Supabase bucket and schema exist before the first deploy.
5. Deploy.

## Notes

- **PDF matric number extraction**: The system extracts the matric number from the PDF content itself (looks for patterns like `2021/1182` or `Matric Number: 2021/1182`). This means PDFs can have any filename. If extraction fails, it falls back to extracting from the filename.
- The publish flow creates signed PDF URLs and logs delivery outcomes.
- Duplicate registrations are rejected when matric number or any submitted contact details already exist.
- Admin actions (login, logout, upload, publish) are stored in `admin_logs` and shown in the dashboard.
- The app supports provider-based email and messaging adapters; if SMTP or messaging credentials are missing, the adapters fall back to console logging for development.
