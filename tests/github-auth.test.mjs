import assert from "node:assert/strict";
import { test } from "node:test";
import { randomToken, digest, validFlowState, readSession, exchangeGitHubCode, beginSignIn, finishSignIn, signOut } from "../lib/github-auth.ts";
const config = { OWNER_GITHUB_ID: "152187410", GITHUB_CLIENT_ID: "test-client", GITHUB_CLIENT_SECRET: "test-secret", STUDIO_ORIGIN: "https://studio.example.test" };
test("PKCE uses SHA-256 and a random, cookie-bound state", async () => {
  assert.equal(await digest("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  const state = randomToken();
  assert.match(state, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(validFlowState(state, state), true);
  assert.equal(validFlowState(state, randomToken()), false);
  assert.equal(validFlowState(null, null), false);
});
test("owner login requests no repository scopes and uses a fixed callback with PKCE", async () => {
  const calls=[]; const DB={prepare(sql){return {bind(...args){calls.push({sql,args});return this;}}},async batch(){}};
  const response=await beginSignIn({...config,DB});
  const url=new URL(response.headers.get("location"));
  assert.equal(url.origin,"https://github.com");assert.equal(url.searchParams.has("scope"),false);
  assert.equal(url.searchParams.get("redirect_uri"),"https://studio.example.test/auth/callback");
  assert.equal(url.searchParams.get("code_challenge_method"),"S256");
  assert.equal(url.searchParams.get("code_challenge"),await digest(calls.find(x=>x.sql.startsWith("INSERT")).args[1]));
  assert.match(response.headers.get("set-cookie"), /__Host-quiet-oauth=.*HttpOnly; Secure; SameSite=Lax/);
});
test("OAuth exchanges the code with PKCE and permits only the immutable owner ID", async () => {
  for(const id of [152187410,987654321]) {
    const calls=[];
    const fetcher=async (url,options)=>{calls.push({url,options});return Response.json(calls.length===1?{access_token:"temporary-test-token",token_type:"bearer"}:{id,login:"sheep05"});};
    const user=await exchangeGitHubCode("auth-code","pkce-verifier",config,fetcher);
    assert.equal(calls[0].options.body.get("code_verifier"),"pkce-verifier");
    assert.equal(calls[0].options.body.get("redirect_uri"),"https://studio.example.test/auth/callback");
    assert.equal(calls[1].options.headers.Authorization,"Bearer temporary-test-token");
    assert.equal(user?.userId ?? null,id===152187410?"152187410":null);
  }
});
test("unsigned headers and malformed session cookies never authenticate", async()=>{
 const env={...config,DB:{prepare(){throw new Error("Must not query malformed tokens")}}};
 for(const h of [new Headers({"oai-authenticated-user-id":"152187410"}),new Headers({Cookie:"__Host-quiet-session=forged"}),new Headers({"cf-access-jwt-assertion":"forged"})]) assert.equal(await readSession(h,env),null);
});
test("expired/missing sessions and sessions belonging to other accounts are rejected",async()=>{
 const token=randomToken();let bound;
 for(const row of [null,{github_id:"other",login:"sheep05"},{github_id:"152187410",login:"sheep05"}]){
  const DB={prepare(sql){assert.match(sql,/expires_at>\?/);return{bind(...args){bound=args;return this},async first(){return row}}}};
  const user=await readSession(new Headers({Cookie:`__Host-quiet-session=${token}`}),{...config,DB});
  assert.equal(bound[0],await digest(token));assert.ok(bound[1]<=Date.now());
  assert.equal(user?.userId??null,row?.github_id==="152187410"?"152187410":null);
 }
});
test("callback rejects missing or mismatched state before accessing storage",async()=>{
 const env={...config,DB:{prepare(){throw new Error("Must not query mismatched state")}}};
 for(const query of ["","?code=test","?code=test&state=forged"]){
  const result=await finishSignIn(new Request(`https://studio.example.test/auth/callback${query}`),env);
  assert.equal(result.status,400);
 }
});
test("logout blocks cross-origin requests and revokes the server-side session",async()=>{
 const calls=[];const DB={prepare(sql){return{bind(value){calls.push({sql,value});return this},async run(){}}}};
 const token=randomToken();
 const bad=await signOut(new Request("https://studio.example.test/auth/logout",{method:"POST",headers:{Origin:"https://evil.example",Cookie:`__Host-quiet-session=${token}`}}),{...config,DB});
 assert.equal(bad.status,403);assert.equal(calls.length,0);
 const good=await signOut(new Request("https://studio.example.test/auth/logout",{method:"POST",headers:{Origin:"https://studio.example.test",Cookie:`__Host-quiet-session=${token}`}}),{...config,DB});
 assert.equal(good.status,303);assert.equal(calls[0].value,await digest(token));assert.match(good.headers.get("set-cookie"),/Max-Age=0/);
});
