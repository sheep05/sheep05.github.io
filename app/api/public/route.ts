import { collection } from "@/lib/store";

export const dynamic = "force-dynamic";

// Read-only public feed for a separately hosted gallery. Never uses the
// caller's session, even when an owner requests it or adds ?drafts=1.
export async function GET() {
  return Response.json(await collection(false, true), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
