# Publishing scripts

`sync-published.mjs` downloads and validates only the anonymous public Studio library, copying previews and full-size fallback photos to `public/published/`. It also retains the validated public Cloudflare media URL for each photo. Browsing uses local thumbnails; only opening the full-screen viewer requests Cloudflare media, with a local full-size fallback on failure or timeout. The visitor never fetches the library API.

`verify-published-build.mjs` checks the complete local copies, the permitted full-screen media origin, and absence of visitor library API requests.
