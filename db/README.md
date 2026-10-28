# Database definitions

`schema.ts` defines the tables for photographs, albums, site settings, and owner sign-in; `migrations/` records the ordered SQL changes used to create or update those tables. Uploaded image files live in Cloudflare KV, while the running database lives in Cloudflare D1.
