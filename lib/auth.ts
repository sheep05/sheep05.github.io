import { headers } from "next/headers";
import { env } from "cloudflare:workers";
import { readSession } from "./github-auth";
export async function getStudioUser() {
  const h = await headers();
  const local = import.meta.env.DEV && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(h.get("host") ?? "");
  return readSession(h, env, local);
}
