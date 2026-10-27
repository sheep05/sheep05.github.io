import { collection } from "@/lib/store";
import Studio from "./Studio";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Studio management",
  robots: { index: false, follow: false },
};
export default async function StudioPage() {
  const data = await collection(true);
  if (!data.isOwner)
    return (
      <main className="login-page">
        <a className="brand" href="/">
          ▣ {data.settings.name}
        </a>
        <div>
          <p className="eyebrow">YOUR PRIVATE WORKSPACE</p>
          <h1>
            A home for
            <br />
            <em>your photographs.</em>
          </h1>
          <p>
            {data.signedIn
              ? "This account does not have access to manage the studio. Sign in with the owner account."
              : "Sign in with GitHub to upload photographs, curate collections, and make this space your own."}
          </p>
          <a
            className="button primary"
            target="_top"
            href="/auth/login"
          >
            Sign in with GitHub ↗
          </a>
          <a className="text-link" href="/">
            ← Back to the photographs
          </a>
        </div>
        <small>Editing is available only to the studio owner.</small>
      </main>
    );
  return <Studio initial={data} />;
}
