import { writeFile, mkdir } from "node:fs/promises";
import { randomToken, digest } from "../lib/github-auth.ts";
const token = randomToken();
await mkdir("work", { recursive: true });
await writeFile("work/local-access-token", token, { mode: 0o600 });
await writeFile("work/local-auth.sql", `INSERT OR REPLACE INTO auth_sessions(token_hash,github_id,login,expires_at) VALUES('${await digest(token)}','152187410','sheep05',${Date.now()+7200000});\nUPDATE studio SET owner_id='152187410' WHERE id='main';\n`, {mode:0o600});
await writeFile(".dev.vars", 'OWNER_GITHUB_ID="152187410"\nGITHUB_CLIENT_ID="local-test"\nGITHUB_CLIENT_SECRET="local-test"\nSTUDIO_ORIGIN="https://studio.example.test"\n', { mode: 0o600 });
console.log("Prepared local-only session fixture. Apply work/local-auth.sql only to the local database.");
