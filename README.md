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
- `MESSAGING_PROVIDER`, `TERMII_API_KEY`, `TERMII_SENDER_ID`, `TERMII_WHATSAPP_FROM`, `TERMII_BASE_URL`, `TERMII_SMS_ENDPOINT`, `TERMII_WHATSAPP_ENDPOINT`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`, `TWILIO_WHATSAPP_FROM`
- `ENABLE_SMS_DELIVERY`, `ENABLE_WHATSAPP_DELIVERY` (optional, default `true`; set to `false` to disable a channel while provider setup is pending)

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

## Simple system documentation

This project is a school result delivery system.

Students register their details once, using their matric number.
Admins upload result PDFs and publish them.
The system matches each PDF to the correct student record and sends notifications.

### Main tools used and what they do

1. Next.js (App Router)
	- Builds the website pages, admin dashboard, and API endpoints.
	- Handles frontend and backend code in one project.

2. Supabase
	- Stores student data, admin data, results, notifications, and admin logs.
	- Stores uploaded result PDF files in a private storage bucket.
	- Enforces data safety with policies (RLS).

3. TypeScript
	- Adds strong typing to reduce coding mistakes.
	- Makes backend workflow logic safer to maintain.

4. Zod
	- Validates incoming form and API data.
	- Prevents bad or incomplete input from entering the system.

5. Nodemailer (SMTP)
	- Sends result emails through configured SMTP credentials.
	- Returns delivery success or failure for logging.

6. PDF parser (`pdf-parse`)
	- Reads text from uploaded PDFs.
	- Extracts matric numbers from real PDF content, not only filenames.

7. Tailwind CSS
	- Styles pages and dashboard UI quickly.
	- Used for the MTU-branded theme and header layout.

### Programming languages and technologies

1. TypeScript (main app logic, API routes, components)
2. JavaScript (tooling/runtime dependencies)
3. SQL (Supabase schema and database setup)
4. CSS (global styling with Tailwind utilities)
5. HTML (rendered through React/Next.js components)

### Progress made so far

1. Built student registration flow with duplicate protection.
2. Built admin authentication and separate admin access route.
3. Added bulk PDF upload and result matching workflow.
4. Added publish flow for email, SMS, and WhatsApp notifications.
5. Added notification logs and admin activity logs in dashboard.
6. Added ability to remove wrong uploads and retry publishing.
7. Added accurate delivery statistics (success, failed, partial).
8. Added MTU logo/header and theme colors to the UI.
9. Improved PDF extraction so matric is read from PDF content.

### Problems encountered and how they were solved

1. Problem: Wrong matric was taken from filename instead of PDF content.
	- Fix: Implemented text extraction from PDF and matric pattern matching.

2. Problem: PDF parser errors in runtime (`DOMMatrix`/worker issues).
	- Fix: Switched parser strategy and import path to a Node-safe flow.

3. Problem: Parser picked wrong numeric values (for example totals/units).
	- Fix: Added smarter extraction logic that prioritizes the matric area and compact row patterns.

4. Problem: Publish could show success when there were no uploaded results.
	- Fix: Added server-side validation to fail with a clear message when target count is zero.

5. Problem: Emails were not visibly arriving.
	- Fix: Confirmed SMTP configuration/verification, improved tracing through delivery logs, and validated publish statuses in notifications table.

### Current workflow (easy summary)

1. Student registers with matric number and contact details.
2. Admin logs in from admin route.
3. Admin uploads result PDFs.
4. System extracts matric from PDF and matches student record.
5. Admin clicks publish.
6. System sends email/SMS/WhatsApp and stores delivery logs.
7. Admin monitors logs and retries failed deliveries if needed.
