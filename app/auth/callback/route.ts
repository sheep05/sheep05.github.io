import { env } from "cloudflare:workers";
import { finishSignIn } from "@/lib/github-auth";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return finishSignIn(request, env); }
