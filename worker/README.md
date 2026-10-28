# Cloudflare backend entry point

`index.ts` hands incoming Cloudflare requests to the application's route handler. Configure the Worker, its database, and photo storage in `../wrangler.jsonc`; implement individual features in `app/` and `lib/`.
