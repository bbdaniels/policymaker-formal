# PolicyMaker Formal AI proxy

A small Cloudflare Worker that sits between the PolicyMaker Formal web app and
the Harvard HUIT Level 3 OpenAI gateway. The app is a static site and cannot
hold a key, so the Worker holds it.

## Architecture

```
Browser (static site)        Cloudflare Worker              Harvard HUIT L3 gateway
js/pf.agent.js          ->   policymaker-formal-proxy  ->   go.apis.huit.harvard.edu
POST / (chat body)           adds the api-key header        /ais-openai-direct-comdev/v2/chat/completions
                             pins the model, applies caps
```

Deployed URL: `https://policymaker-formal-proxy.bbdaniels.workers.dev/`

What the Worker does on each POST:

1. Refuses any origin not on the allowlist (403). The allowlist is
   `https://www.benjaminbdaniels.com`, `http://localhost` (any port), and
   `null` (pages opened from `file://`). A request with no `Origin` header is
   treated as `null`, so the allowlist is a browser guard and not
   authentication.
2. Refuses bodies over 64 KB (413).
3. Forwards only `messages`, `tools`, `tool_choice` and `temperature`, sets
   the model to `gpt-4o-mini` regardless of what was asked for, and caps
   `max_tokens` at 1024.
4. Sends the request to the gateway with the key in the `api-key` header and
   returns the gateway's answer unchanged, except for a 429 (see below).

## The upstream is pinned in code

The gateway URL is a constant in `index.js` and no environment variable can
change it. This is deliberate. Which provider receives the app's text and
which account is billed is a decision, and an environment-configurable base
URL is how proxies get silently redirected. To change the upstream, edit the
constant in a reviewed commit and redeploy.

The gateway is the HUIT Community Developer ("comdev") endpoint, approved for
Harvard Level 3 data and below. Level 4 data and PHI must not be sent to it.

## Shared quota and what a 429 means

The gateway key has a hard ceiling of 10 USD per month, and the same key
serves other applications, production services among them. Every call made
through this proxy spends from that shared ceiling. When the month's credit
is gone the gateway answers 429 until the first of the next month, for every
application on the key.

The Worker passes a 429 through to the browser as:

```json
{ "error": "The AI assistant has used up its monthly quota or is being rate limited. The quota resets on the first of the month.", "code": "quota_exhausted" }
```

A 429 is therefore not a bug in the app. Check the remaining credit with the
gateway's quota route (`/ais-openai-direct-comdev/v2/apigee/quota`, same
`api-key` header) before looking anywhere else.

## Deploy

```bash
cd proxy
wrangler deploy
```

Keep `name` in `wrangler.jsonc` unchanged: it fixes the URL the app calls.
Before the first deploy from a new checkout, run `wrangler secret list` here
and confirm it answers for `policymaker-formal-proxy`.

## Set the secret

The Worker reads the gateway key from one secret, `HARVARD_L3_API_KEY`:

```bash
cd proxy
wrangler secret put HARVARD_L3_API_KEY
```

Wrangler prompts for the value with hidden input, or reads it from standard
input when piped. Never pass the key as a command-line argument, where it
would land in shell history and the process list.

`wrangler secret list` shows the secret names on the Worker. The key itself is
never stored in this repository: `.wrangler/`, `.dev.vars*` and `.env*` are
ignored by the root `.gitignore`.

## Why this config is `wrangler.jsonc`

Wrangler looks for a `.jsonc` config in every parent directory before it
considers a `.toml` one. This repository once had a `wrangler.jsonc` at its
root for a separate Worker that served the static files, and a
`proxy/wrangler.toml` was passed over in favor of it: `wrangler deploy` run
from `proxy/` published the whole repository to that other Worker. The root
config and its Worker were removed on 2026-10-06 (GitHub Pages serves the
site), and this directory's config is a `.jsonc` so that the nearest file of
the same kind always wins. Do not add a Wrangler config at the repository
root.

