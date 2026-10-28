// Type definitions for Cloudflare storage and sign-in.
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    PHOTOS: KVNamespace;
    OWNER_GITHUB_ID?: string;
    GITHUB_CLIENT_ID?: string;
    GITHUB_CLIENT_SECRET?: string;
    STUDIO_ORIGIN?: string;
  }
}
