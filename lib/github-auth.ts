export type StudioUser = { userId: string; displayName: string };
export type AuthEnv = { DB: D1Database; OWNER_GITHUB_ID?: string; GITHUB_CLIENT_ID?: string; GITHUB_CLIENT_SECRET?: string; STUDIO_ORIGIN?: string };
const SESSION_SECONDS = 8 * 60 * 60;
const FLOW_SECONDS = 10 * 60;
export function randomToken() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export async function digest(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function cookieValue(h: Headers, name: string) {
  return (h.get("cookie") ?? "").split(";").map(s => s.trim()).find(s => s.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
}
export function sessionCookieName(local = false) { return local ? "quiet-dev-session" : "__Host-quiet-session"; }
export async function readSession(h: Headers, env: AuthEnv, local = false): Promise<StudioUser | null> {
  const token = cookieValue(h, sessionCookieName(local));
  if (!env.OWNER_GITHUB_ID || !token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const row = await env.DB.prepare("SELECT github_id,login FROM auth_sessions WHERE token_hash=? AND expires_at>?")
    .bind(await digest(token), Date.now()).first<{github_id: string; login: string}>();
  if (!row || row.github_id !== env.OWNER_GITHUB_ID) return null;
  return { userId: row.github_id, displayName: row.login };
}
function origin(env: AuthEnv) {
  if (!env.STUDIO_ORIGIN) throw new Error("Owner sign-in is not configured yet.");
  const url = new URL(env.STUDIO_ORIGIN);
  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash || url.username || url.password) throw new Error("Invalid studio origin.");
  return url.origin;
}
const cookie = (name: string, value: string, seconds: number) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;
export async function beginSignIn(env: AuthEnv): Promise<Response> {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.OWNER_GITHUB_ID) return new Response("Owner sign-in is not configured yet.", { status: 503 });
  const base = origin(env), state = randomToken(), verifier = randomToken();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM auth_flows WHERE expires_at<=?").bind(Date.now()),
    env.DB.prepare("DELETE FROM auth_sessions WHERE expires_at<=?").bind(Date.now()),
    env.DB.prepare("INSERT INTO auth_flows(state_hash,verifier,expires_at) VALUES(?,?,?)").bind(await digest(state), verifier, Date.now() + FLOW_SECONDS * 1000),
  ]);
  const url = new URL("https://github.com/login/oauth/authorize");
  url.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: `${base}/auth/callback`, state,
    code_challenge: await digest(verifier), code_challenge_method: "S256", allow_signup: "false" }).toString();
  // No repository or private-email scopes are requested. The public profile ID identifies the owner.
  return new Response(null, { status: 302, headers: { Location: url.href, "Set-Cookie": cookie("__Host-quiet-oauth", state, FLOW_SECONDS), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
export function validFlowState(state: string | null, saved: string | null) {
  return !!state && /^[A-Za-z0-9_-]{43}$/.test(state) && state === saved;
}
export async function exchangeGitHubCode(code: string, verifier: string, env: AuthEnv, fetcher: typeof fetch = fetch): Promise<StudioUser | null> {
  const tokenResponse = await fetcher("https://github.com/login/oauth/access_token", {
    method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID!, client_secret: env.GITHUB_CLIENT_SECRET!, code, code_verifier: verifier, redirect_uri: `${origin(env)}/auth/callback` }),
    signal: AbortSignal.timeout(10000),
  });
  if (!tokenResponse.ok) return null;
  const data = await tokenResponse.json() as {access_token?: string; token_type?: string};
  if (!data.access_token || data.token_type?.toLowerCase() !== "bearer") return null;
  const userResponse = await fetcher("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${data.access_token}`, Accept: "application/vnd.github+json", "User-Agent": "Quiet-Studio", "X-GitHub-Api-Version": "2022-11-28" },
    signal: AbortSignal.timeout(10000),
  });
  if (!userResponse.ok) return null;
  const profile = await userResponse.json() as {id?: number; login?: string};
  if (!profile.id || String(profile.id) !== env.OWNER_GITHUB_ID || typeof profile.login !== "string") return null;
  return { userId: String(profile.id), displayName: profile.login };
}
export async function finishSignIn(request: Request, env: AuthEnv): Promise<Response> {
  const headers = new Headers({ "Set-Cookie": cookie("__Host-quiet-oauth", "", 0), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
  const fail = (message: string, status = 400) => new Response(message, { status, headers });
  const url = new URL(request.url), state = url.searchParams.get("state"), code = url.searchParams.get("code");
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.OWNER_GITHUB_ID) return fail("Owner sign-in is not configured yet.", 503);
  if (!code || code.length > 2048 || !validFlowState(state, cookieValue(request.headers, "__Host-quiet-oauth"))) return fail("Sign-in expired or could not be verified. Please return to /studio and try again.");
  // Atomic consumption prevents replay, including concurrent callbacks.
  const flow = await env.DB.prepare("DELETE FROM auth_flows WHERE state_hash=? AND expires_at>? RETURNING verifier")
    .bind(await digest(state!), Date.now()).first<{verifier: string}>();
  if (!flow) return fail("Sign-in expired. Please return to /studio and try again.");
  try {
    const user = await exchangeGitHubCode(code, flow.verifier, env);
    if (!user) return fail("Only the studio owner's GitHub account can sign in.", 403);
    const token = randomToken();
    await env.DB.prepare("INSERT INTO auth_sessions(token_hash,github_id,login,expires_at) VALUES(?,?,?,?)")
      .bind(await digest(token), user.userId, user.displayName, Date.now() + SESSION_SECONDS * 1000).run();
    headers.append("Set-Cookie", cookie(sessionCookieName(), token, SESSION_SECONDS));
    headers.set("Location", `${origin(env)}/studio`);
    return new Response(null, {status: 302, headers});
  } catch {
    return fail("GitHub sign-in is temporarily unavailable. Please try again.", 502);
  }
}
export async function signOut(request: Request, env: AuthEnv): Promise<Response> {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response("Forbidden", {status: 403});
  const token = cookieValue(request.headers, sessionCookieName());
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) await env.DB.prepare("DELETE FROM auth_sessions WHERE token_hash=?").bind(await digest(token)).run();
  return new Response(null, {status: 303, headers: {Location: "/studio", "Set-Cookie": cookie(sessionCookieName(), "", 0), "Cache-Control": "no-store"}});
}
