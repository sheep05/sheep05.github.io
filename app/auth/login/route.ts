import { env } from "cloudflare:workers";
import { beginSignIn } from "@/lib/github-auth";
export const dynamic = "force-dynamic";
export async function GET() { return beginSignIn(env); }
