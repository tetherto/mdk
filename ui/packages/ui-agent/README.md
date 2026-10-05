# @tetherto/mdk-ui-agent

The operator agent chat, as a drop-in for any MDK UI shell. Talks to the agent
gateway plugin ([`@tetherto/mdk-plugin-agent`](../../../backend/plugins/agent/README.md)) over SSE and renders its six-event
contract as a conversation.

## Install

```tsx
// App.tsx — mounted once, at the app root
import { CoPilot } from '@tetherto/mdk-ui-agent'

<CoPilot />
```

```tsx
// main.tsx — alongside the devkit stylesheets
import '@tetherto/mdk-ui-agent/styles.css'
```

That is the whole integration. The shell template ships with both lines already
in place; delete them to remove it.

The backend half is a stack concern: add [`@tetherto/mdk-plugin-agent`](../../../backend/plugins/agent/README.md) to your
`mdk.yaml`, and point it at an MCP server for the fleet tools. Without the plugin
the panel opens and reports that the agent is not configured. See
[Running it all locally](#running-it-all-locally) for the whole chain from an
empty machine.

### Dev server

The Gateway sends no CORS headers, and its stream route hijacks the reply so a
CORS hook could not decorate it even if one existed. Proxy `/agent` to the
Gateway, next to `/auth` and `/api`:

```ts
server: { proxy: { '/agent': gatewayUrl } }
```

In production, serve the built UI from the Gateway's `staticRootPath` so the
calls stay same-origin.

## Surface

| Export             | What it is                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| `<CoPilot />`      | The docked overlay: a launcher in the corner that opens a 420×640 panel. Mount once at the app root.     |
| `<ChatUIEntry />`  | The same conversation as a full-height page. Default export too, so it drops into a lazy route registry. |
| `useAgentChat()`   | The one stateful hook — session, live turn, persistence. Everything below it is presentational.          |
| `useConversations()` | Binds the conversation store to React. |
| [`@tetherto/mdk-ui-agent/core`](./src/core/index.ts) | The headless half: contract types, SSE reader, transport, turn reducer, conversation store. No React — also reachable from the root package, since `.` re-exports everything here; the subpath just lets a consumer skip the components. |
| [`@tetherto/mdk-ui-agent/panel`](./src/components/co-pilot-panel.tsx) | `CoPilotPanel`, for building your own launcher around the panel body. |

All props are optional. Inside an `MdkProvider` the base URL and bearer token
come from the provider's auth seam; outside one it falls back to relative URLs
and no token — which is what a Gateway running without an auth plugin serves
anyway.

Useful props: `title`, `status` (the line under the title), `toolLabels`,
`placeholder`, `defaultOpen`, `position`, `idleTimeoutMs` /
`approvalIdleTimeoutMs` / `firstEventIdleTimeoutMs`, which override the idle windows
*Sockets that go quiet* describes.

History is per browser, in `localStorage` — the Gateway keeps no transcripts. Two
tabs on the same app share that key, and each merges the other's writes rather
than overwriting them, since a lost transcript exists nowhere else.

### Tool labels

Tools come from whichever MCP server the agent is pointed at, so no tool name is
hardcoded. Pass labels for the ones you know; anything else is humanized from its
identifier (`summarize_site` → `Summarize site`).

```tsx
<CoPilot toolLabels={{ summarize_site: 'Site status', act_device: 'Send command' }} />
```

## What it handles for you

The agent contract has sharp edges that are easy to miss when writing a client
against it. These are handled here, and each is pinned by a test:

- **One turn at a time.** A second message while a turn streams is a
  `409 ERR_AGENT_TURN_ACTIVE`, and a turn *paused on an approval* still holds the
  session busy. The composer stays disabled through both.
- **Approvals expire.** An approval nobody answers is auto-rejected server-side
  after `agent.approvalTimeoutMs` and the stream resumes on its own. The card
  disappears when the turn moves on, not only when the operator clicks.
- **Truncated streams.** The stream route hijacks the reply, so a failure after
  the headers are sent just closes the socket — no `error` frame, no `done`. An
  EOF with no terminal event is rendered as a failure rather than a turn that
  never ends.
- **Sockets that go quiet.** The Gateway sends no heartbeats, so a wedged agent or
  a half-closed proxy looks exactly like a turn still thinking, and the panel
  would stay busy until a reload. Silence past `STREAM_IDLE_TIMEOUT_MS` (30s) ends
  the turn. How much silence is normal is not constant across a turn, so that
  deadline applies *between* events only, and two phases get their own:
  `APPROVAL_IDLE_TIMEOUT_MS` (5min) while an approval is outstanding, where
  waiting on a human is the expected state, and `FIRST_EVENT_IDLE_TIMEOUT_MS`
  (120s) before the first event, where the model is still routing and has emitted
  nothing yet — a local thinking model measured 61s to its first event, so the
  between-events limit would have abandoned a healthy turn. 120s is the
  producer's own per-model-call budget, so the server always gives up first and
  says why. Override all three per host with `idleTimeoutMs` /
  `approvalIdleTimeoutMs` / `firstEventIdleTimeoutMs`.
- **Stop.** A turn going visibly wrong is interrupted from the composer, and what
  streamed is kept — marked as stopped early, so half an answer never reads back
  as the whole one. A failed turn offers a retry rather than asking for the
  question again.
- **Unanswered tool calls.** A call the turn ended before hearing back from settles
  as `interrupted`: the outcome is unknown, which is neither the tick nor the
  error state, and a step left `running` would persist as a spinner that never
  resolves.
- **Two error body shapes.** The streaming route answers `{ statusCode, message }`
  with no `error` key, unlike every other route.
- **Stale sessions.** Sessions live in the Gateway's memory per process. A stored
  id 404s after a restart; the transcript still reads back and the next message
  mints a fresh session — and says so in the transcript, because the conversation
  that came before it is context the agent no longer has.
- **Leaked tool calls.** The agent's tool loop is prompt-based and classifies a
  reply as a tool call from its first character being `{`. A model that fences its
  JSON gets classified as prose, and the raw call reaches the operator as the
  answer. That is detected and labelled instead of dumped.

## Errors

Five codes come from the Gateway route; three are synthesized locally by [`@tetherto/mdk-ui-agent/core`](./src/core/index.ts) when the
transport itself misbehaves.

| Code                          | Fires when                           | Fix                               |
| ----------------------------- | ------------------------------------ | --------------------------------- |
| `ERR_AGENT_UNAVAILABLE`       | `config.agent` is missing entirely, or the agent failed to construct (`503`) | An operator-facing failure — the Gateway wasn't configured or the agent couldn't start; check the plugin's own config |
| `ERR_AGENT_SESSION_NOT_FOUND` | The session id doesn't exist — commonly because the Gateway restarted and its in-memory sessions were lost (`404`) | Start a new session; the transcript still reads back locally |
| `ERR_AGENT_TURN_ACTIVE`       | A message or delete is sent to a session while its previous turn is still streaming or paused on an approval (`409`) | Wait for the current turn to finish, or decide its pending approval |
| `ERR_AGENT_APPROVAL_NOT_FOUND` | An approval decision is sent for an id that doesn't exist for that session — already decided, or never existed (`404`) | Confirm the approval card is still the current one; a stale one is a decision arriving after the turn already moved on |
| `ERR_AGENT_MESSAGE_TEXT_REQUIRED` | The message `text` sent to the Gateway is missing, not a string, or empty after trimming (`400`) | Don't send an empty message |
| `ERR_AGENT_STREAM_IDLE`      | No event arrived within the idle window for the current phase (`STREAM_IDLE_TIMEOUT_MS` mid-turn, `FIRST_EVENT_IDLE_TIMEOUT_MS` before the first event, `APPROVAL_IDLE_TIMEOUT_MS` while an approval is outstanding) | Usually a wedged agent or a half-closed proxy; retry the turn |
| `ERR_AGENT_STREAM_TRUNCATED` | The stream ended with no terminal event and no idle timeout fired — the socket closed on its own (a failure after the SSE headers were already sent, which arrives with no `error` frame and no `done`) | Retry the turn; what already streamed is kept |
| `ERR_AGENT_STREAM_EMPTY`     | The Gateway answered the message request without a readable stream body at all | An environment gap (a `fetch` polyfill without streaming body support) rather than an agent failure; check the runtime |

## Rendering

Answers render as GitHub-flavoured Markdown once the turn finishes, and as plain
text while it streams — a half-written fence breaks the parser and re-parsing on
every token is wasted work. Raw HTML is deliberately not enabled, so untrusted
model output cannot inject markup. Do not add `rehype-raw`.

Everything `remark-gfm` can emit is styled — headings, quotes, rules, images,
task lists, footnotes — because nothing constrains what the model answers with. A
link out of the document opens in a new tab rather than navigating the host app
away mid-conversation; an in-document fragment link (a footnote) stays in the
panel. An answer wrapped entirely in a ```markdown fence, a common model quirk, is
unwrapped rather than rendered as one code block. An answer long enough to bury
the transcript collapses behind a toggle once the turn settles.

Fenced code is highlighted for `json`, `bash` and `yaml`, coloured from the same
`--mdk-agent-*` tokens as the rest of the panel rather than from a highlight.js
theme. The grammar set is deliberately small: `rehype-highlight` would pull in
lowlight's 37-grammar `common` set, which measured 179 kB raw / 55 kB gzip against
the generated shell. Blocks carry a copy button where the Clipboard API is
available — it needs a secure context, and a Gateway on a site LAN is served over
plain http.

The panel is code-split behind the launcher, so a collapsed co-pilot costs the
host about 13 kB raw / 4.5 kB gzip; the transcript and its renderer arrive on
open. Nothing may import [`components/co-pilot-panel`](./src/components/co-pilot-panel.tsx)
statically from the root barrel — one static edge collapses the split for every consumer.

## Naming

`Co-pilot` is a placeholder pending a naming decision. Every user-visible string
derives from `AGENT_NAME` in [`src/branding.ts`](./src/branding.ts), so the rename is a one-line
change there; [`src/branding.test.ts`](./src/branding.test.ts) fails if a component hardcodes it.
The CSS prefix (`mdk-agent-*`) and the storage key deliberately do not carry the name, so
renaming breaks neither consumers' style overrides nor their stored history.

Per deployment, pass `title` instead of editing the constant.

## Styling

SCSS compiled into `@layer mdk`, BEM `mdk-agent-*` classes over `--mdk-color-*`
tokens. Every value indirects through a `--mdk-agent-*` variable, so the panel can
be rethemed without forking the stylesheet:

```css
:root { --mdk-agent-accent: #22afff; --mdk-agent-panel-width: 480px; }
```

Components do not import their own `.scss` — every partial is reached from
[`src/styles.scss`](./src/styles.scss), and `npm run check:styles` fails the build if one is not.

## Demo

[`ui/apps/catalog`](../../apps/catalog/README.md) → **Guides → Agent Co-pilot** drives all five states against a
stand-in gateway, so it runs with no backend.

## Running it all locally

Four processes, in order. See the [operator agent guides](../../../docs/guides/agent/index.md) for the topology diagram and
why order matters here: the agent connects to MCP once, when a session is created, so a panel opened before the tool
server is up gets a session with no tools and answers from the model alone, with no error to tell you.

### 1. A model

Anything that speaks the OpenAI `/v1/chat/completions` API. QVAC is the
supported path — see
[serving the model](../../../docs/guides/agent/run-standalone.md#serve-the-model-with-qvac).
Any other local server works too: the provider is pointed at a URL, not at a
vendor.

A 4B is the floor. The tool loop asks the model for JSON on demand, and below
that size it does not reliably produce it.

### 2. The fleet and its tools

```bash
cd examples/full-site
npm run setup  # first time — NOT npm install
npm start      # kernel + workers + its own gateway :3007 + MCP tools on :3008
```

`npm install` alone leaves it unbootable. The repo is a root npm workspace, but
`setup` also builds the UI toolkit ([`ui/`](../../README.md)) and installs [`examples/full-site/ui`](../../../examples/full-site/ui)
— a plain root `npm install` does not do either of those; `setup` does all of
that and takes a while. Its own preflight check refuses to start otherwise,
naming what is missing.

This is the same MCP server the agent CLI uses, exposing `summarize_site`,
`count_devices`, `list_devices`, `get_device`, `rank_devices` and `act_device`.

**Its gateway is not the agent gateway.** `full-site` serves a UI of its own on
`:3007` and carries no agent plugin; step 3 is a separate stack that reaches
across to the tool server on `:3008`. Nothing in the repo boots both halves
together yet.

### 3. A gateway carrying the agent plugin

Mount [`@tetherto/mdk-plugin-agent`](../../../backend/plugins/agent/README.md) behind its own Gateway, against the local model
and MCP server this walkthrough already served. [Mounting the plugin](../../../docs/guides/agent/gateway-deployment.md#mount-the-plugin)
shows the complete `mdk.yaml` and `mdk run all`.

### 4. The UI

```bash
cd <your-app>            # or examples/mdk-ui-shell-template
npm install               # first time only; this project isn't a root workspace member
VITE_GATEWAY_URL=http://127.0.0.1:3847 VITE_AUTH_BYPASS=true npm run dev
```

The `npm install` above only needs to cover this project's own dependencies. The `ui/` toolkit it imports via `file:` links
(`react-devkit`, `ui-foundation`, `react-adapter`, this package) is already built by step 2's `npm run setup`, which chains
`npm --prefix ../.. run build:ui` — no separate build step here.

`<your-app>` can be [`examples/mdk-ui-shell-template`](../../../examples/mdk-ui-shell-template/README.md). Open `:3030` and the launcher is in the corner. `VITE_GATEWAY_URL` feeds the
`/agent` proxy from [Dev server](#dev-server); leave `VITE_MDK_API_URL` empty so
calls stay relative and go through it. `VITE_AUTH_BYPASS=true` skips the shell template's `/signin` gate, landing straight on
the dashboard with a stub session, since this walkthrough has no OAuth backend to sign in against.

### Checking it

```text
hey                  → a greeting, and no tool chip
list the devices     → a chip, then the devices, one per line
reboot <device-id>   → an approval card; nothing runs until you accept
```

A tool chip on the fleet questions is the thing to look for. If they answer
without one, MCP was not up when the session was created — reload the page to
mint a new one.

Against `full-site` the fleet is 30 miners in 2 containers, plus powermeters,
sensors and pools, so "how many miners are there?" answers 30.

Without the UI:

```bash
SESSION=$(curl -sX POST localhost:3847/agent/sessions -H 'content-type: application/json' -d '{}' | jq -r .sessionId)
curl -N -X POST localhost:3847/agent/sessions/$SESSION/messages \
  -H 'content-type: application/json' -d '{"text":"how many miners are there?"}'
```

### Rough edges worth knowing

- **Sessions live in the gateway process.** Restart it and every stored session
  404s; the panel notices and mints a fresh one on the next message, so the
  transcript on screen outlives the conversation the model remembers.
- **One turn at a time.** A second message while one streams is a `409`, and a
  paused approval still counts as busy — which is why the composer stays
  disabled while a card is up.
- **Writes need approval**, and an unanswered card auto-rejects after
  `approvalTimeoutMs` (120s by default). The stream then resumes on its own.
- **No CORS, ever.** The stream route hijacks the reply, so the dev proxy in
  step 4 is not optional if the UI is on another port.

Walked end to end on 2026-08-14; the four steps above are what it took.
