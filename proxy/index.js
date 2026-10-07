// PolicyMaker Formal AI proxy (Cloudflare Worker).
//
// Browser -> this Worker -> Harvard HUIT Level 3 OpenAI gateway ("comdev").
//
// The upstream is PINNED in code and is deliberately NOT configurable by an
// environment variable. Which gateway this app bills and sends text to is a
// decision, not a setting: an env-configurable base URL is how proxies get
// silently redirected to a different provider. To change the upstream, change
// this line in a reviewed commit and redeploy.
const UPSTREAM_URL =
  "https://go.apis.huit.harvard.edu/ais-openai-direct-comdev/v2/chat/completions";

// The Worker URL is public, so the model is pinned server-side. Whatever
// model name the caller sends is ignored.
const MODEL = "gpt-4o-mini";

// The gateway key has a hard ceiling of 10 USD per month that is SHARED with
// every other app using the same key, production services among them. These
// two caps keep one caller from draining it.
const MAX_OUTPUT_TOKENS = 1024;   // the app itself asks for 1024
const MAX_BODY_BYTES = 64 * 1024; // system prompt, tools and history fit well inside

// Only these request fields are forwarded. Everything else is dropped, so a
// caller cannot ask for several completions, streaming, or other costly
// options.
const FORWARDED_FIELDS = ["messages", "tools", "tool_choice", "temperature"];

const DEFAULT_ORIGINS = "https://www.benjaminbdaniels.com,http://localhost,null";

function originAllowed(origin, list) {
  return list.some(function (o) {
    // Exact match, or the same host with an explicit port (http://localhost:8000).
    return origin === o || (o !== "null" && origin.startsWith(o + ":"));
  });
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: { ...cors, "Content-Type": "application/json" }
  });
}

export default {
  async fetch(request, env) {
    const allowedList = (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(",");
    // Pages opened from file:// send "Origin: null"; a missing header is
    // treated the same way.
    const origin = request.headers.get("Origin") || "null";
    const allowed = originAllowed(origin, allowedList);
    const cors = {
      "Access-Control-Allow-Origin": allowed ? origin : "https://www.benjaminbdaniels.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method === "GET") {
      return json({ status: "ok", service: "policymaker-formal-proxy" }, 200, cors);
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, cors);
    }

    if (!allowed) {
      return json({ error: "Origin not allowed" }, 403, cors);
    }

    if (!env.HARVARD_L3_API_KEY) {
      return json({ error: "HARVARD_L3_API_KEY not configured" }, 500, cors);
    }

    // Size check twice: the declared length first (cheap), then the bytes
    // actually received, since Content-Length can be absent or wrong.
    const tooLarge = { error: "Request body too large", limit_bytes: MAX_BODY_BYTES };
    const declared = Number(request.headers.get("Content-Length") || 0);
    if (declared > MAX_BODY_BYTES) {
      return json(tooLarge, 413, cors);
    }
    const raw = await request.arrayBuffer();
    if (raw.byteLength > MAX_BODY_BYTES) {
      return json(tooLarge, 413, cors);
    }

    let incoming;
    try {
      incoming = JSON.parse(new TextDecoder().decode(raw));
    } catch {
      return json({ error: "Body must be JSON" }, 400, cors);
    }
    if (!incoming || !Array.isArray(incoming.messages)) {
      return json({ error: "Body must include a messages array" }, 400, cors);
    }

    const body = { model: MODEL };
    for (const field of FORWARDED_FIELDS) {
      if (incoming[field] !== undefined) body[field] = incoming[field];
    }
    const asked = Number(incoming.max_tokens);
    body.max_tokens = asked > 0 ? Math.min(Math.floor(asked), MAX_OUTPUT_TOKENS) : MAX_OUTPUT_TOKENS;

    let upstream;
    try {
      upstream = await fetch(UPSTREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // The gateway authenticates on the api-key header.
          "api-key": env.HARVARD_L3_API_KEY,
          // The gateway answers 403 to some default client user agents, so
          // always send an explicit one.
          "User-Agent": "policymaker-formal-proxy/1.0"
        },
        body: JSON.stringify(body)
      });
    } catch {
      return json({ error: "Could not reach the AI gateway" }, 502, cors);
    }

    if (upstream.status === 429) {
      return json({
        error: "The AI assistant has used up its monthly quota or is being rate limited. " +
               "The quota resets on the first of the month.",
        code: "quota_exhausted"
      }, 429, cors);
    }

    const data = await upstream.text();
    return new Response(data, {
      status: upstream.status,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
};
