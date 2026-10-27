import { env } from "cloudflare:workers";
import { signOut } from "@/lib/github-auth";
export const dynamic = "force-dynamic";
export async function POST(request: Request) { return signOut(request, env); }
