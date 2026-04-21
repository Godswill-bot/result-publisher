# Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Create a private storage bucket named `student-results`.
4. Add one admin record to `public.admins` with a bcrypt password hash.
5. Set the environment variables from `.env.example`.

## Notes

- Student registration uses the anonymous Supabase key and the row-level policy on `public.students`.
- Admin dashboard, uploads, publishing, and logs use the service role key from the server.
- Uploaded PDFs are stored at `results/[matric_number].pdf` inside the storage bucket.
- `pdf_url` stores the storage path used for signed URL generation during publish.
