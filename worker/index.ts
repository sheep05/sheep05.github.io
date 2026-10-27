import handler from "vinext/server/fetch-handler";

export default {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    // Owner sessions are established through GitHub OAuth and checked against D1.
    // Identity headers supplied by callers are never trusted.
    return handler.fetch(request, env, ctx);
  },
};
