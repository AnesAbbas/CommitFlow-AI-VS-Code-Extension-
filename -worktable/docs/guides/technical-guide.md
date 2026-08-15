# CommitFlow AI — Technical Guide

## Overview

CommitFlow AI is a VS Code extension that automates the pull → stage →
commit → push workflow behind a single command/keybinding
(`commitflow-ai.sync`, `Ctrl+Alt+S`), using OpenRouter or Amazon Bedrock
(user-selectable via `commitflow-ai.provider`) to generate the commit
message from the staged diff.

Source lives in [`commitflow-ai/`](../../../commitflow-ai) at the repo root.
For build/run/package/publish steps, see
[`setup-and-deployment.md`](setup-and-deployment.md).

```text
commitflow-ai/
├── .vscode/
│   ├── launch.json      # F5 debug config (extension host)
│   └── tasks.json       # background "watch" build task
├── src/
│   ├── extension.ts      # command registration, sync workflow, fallback logic
│   ├── git.ts             # git operations (execFile wrapper, no shell)
│   ├── ai.ts               # OpenRouter/Bedrock request + response cleanup
│   └── types.ts            # shared interfaces
├── package.json            # manifest: commands, keybindings, settings
├── tsconfig.json
├── README.md               # user-facing docs
└── CHANGELOG.md
```

## Sync workflow (`runSync` in `src/extension.ts`)

1. `gitPull(cwd)`
2. `gitAddAll(cwd)`
3. `hasStagedChanges(cwd)` — bail out with an info message if nothing staged.
4. `buildAIInput(cwd)` — picks one of three payload shapes based on staged
   diff size (bytes):
   - `size <= maxFullDiffBytes` → full diff.
   - `size <= maxReducedDiffBytes` → `git diff --stat` + `--name-status` +
     a diff truncated to `maxFullDiffBytes`.
   - otherwise → `--stat` + `--name-status` + `--numstat` only (no diff body),
     to keep large changes from blowing up the prompt / API cost.
5. `getCommitMessage(context, aiInput)` — see fallback behavior below.
6. Confirmation modal: **Commit & Push** / **Commit Only** / **Cancel**.
7. `commit(cwd, message)`, then `push(cwd)` if the user chose "Commit & Push"
   and `commitflow-ai.autoPush` is `true`.

## Fallback commit message

`getCommitMessage()` in `src/extension.ts` wraps `generateCommitMessage()`
(from `src/ai.ts`) in a try/catch:

- On success: returns `{ message, isFallback: false }`.
- On failure (missing/invalid API key, network error, non-2xx response,
  empty AI response, etc.): reads `commitflow-ai.fallbackCommitMessage`
  from configuration.
  - If the fallback string is non-empty (after trimming), a warning
    notification is shown with the failure reason, and
    `{ message: fallback, isFallback: true }` is returned — the sync
    continues normally and the user still confirms the message before
    anything is committed.
  - If the fallback string is empty, the original error is re-thrown and
    surfaced via the top-level error handler in `runSync`, aborting the
    sync (previous behavior).

This means an API key (for whichever provider is selected) is **optional**
for `commitflow-ai.sync` to run at all — without one, every sync uses the
fallback message unless the user clears `commitflow-ai.fallbackCommitMessage`.

## Git access (`src/git.ts`)

All git calls go through `execFile("git", args, { cwd })` (via
`util.promisify`) rather than a shell string, so there's no shell
interpolation/injection surface and it works identically cross-platform.
`hasStagedChanges` relies on `git diff --cached --quiet`'s exit code
(non-zero ⇒ there are staged changes) rather than parsing output.

## AI provider integration (`src/ai.ts`)

CommitFlow AI supports two providers, chosen via `commitflow-ai.provider`
(`openrouter` default, or `bedrock`). Both OpenRouter and Amazon Bedrock's
Chat Completions endpoint speak the same OpenAI-compatible request/response
shape, so `generateCommitMessage()` uses one shared request builder and
response parser — only the endpoint URL, model, headers, and API key secret
name differ per provider:

- `getProvider(config)` reads `commitflow-ai.provider`.
- `getApiKeySecretName(provider)` maps to a provider-scoped secret key:
  `commitflow-ai.openrouterApiKey` or `commitflow-ai.bedrockApiKey` — never
  read from `settings.json` or the package. Keeping them separate means
  switching providers doesn't clobber the other provider's stored key.
- Endpoint:
  - `openrouter` → `https://openrouter.ai/api/v1/chat/completions`, with
    `HTTP-Referer`/`X-Title` headers set, model from
    `commitflow-ai.openrouterModel` (default `~anthropic/claude-sonnet-latest`).
  - `bedrock` → `https://bedrock-mantle.<commitflow-ai.bedrockRegion>.api.aws/v1/chat/completions`
    (region default `us-east-1`), model from `commitflow-ai.bedrockModel`
    (default `openai.gpt-oss-120b`). The Bedrock API key is sent as a
    bearer token, matching AWS's documented Bedrock API key usage.
- Both requests use `temperature: 0.1`, `max_tokens: 200`.
- The response body is read as text first, then `JSON.parse`d, so a non-JSON
  error body (HTML error page, empty body, etc.) surfaces as a clear "invalid
  JSON" error instead of an opaque parse exception. An in-body
  `{ error: { message } }` (some OpenRouter failures return `200`/`4xx` with
  this shape) is also checked and thrown explicitly.
- `message.content` is accepted as either a plain string or an array of
  `{ type, text }` parts (some models/providers return content blocks
  instead of a flat string) — both shapes are normalized before cleanup.
- `cleanCommitMessage()` strips Markdown code fences, wrapping quotes,
  collapses the response down to its first non-empty line (in case the
  model ignores the "one message" instruction), strips a leading
  "commit message:"/"message:" prefix, and truncates to
  `commitflow-ai.maxCommitLength` on a word boundary.
- All error messages are prefixed with the provider's display name
  (`getProviderLabel()`: "OpenRouter" or "Amazon Bedrock") so failures are
  attributable to the active provider.

## Settings (contributed in `package.json`)

| Setting | Default | Purpose |
| --- | --- | --- |
| `commitflow-ai.provider` | `openrouter` | `openrouter` or `bedrock`. |
| `commitflow-ai.openrouterModel` | `~anthropic/claude-sonnet-latest` | OpenRouter model id (provider `openrouter`). Renamed from `commitflow-ai.model`; see `migrateModelSetting()` below. |
| `commitflow-ai.bedrockRegion` | `us-east-1` | AWS region for the Bedrock runtime endpoint (provider `bedrock`). |
| `commitflow-ai.bedrockModel` | `openai.gpt-oss-120b` | Bedrock model id (provider `bedrock`). |
| `commitflow-ai.maxFullDiffBytes` | `40000` | Full-diff cutoff. |
| `commitflow-ai.maxReducedDiffBytes` | `150000` | Reduced-diff cutoff. |
| `commitflow-ai.commitStyle` | `conventional` | Passed into the AI prompt. |
| `commitflow-ai.maxCommitLength` | `72` | Enforced client-side after generation. |
| `commitflow-ai.autoPush` | `true` | Gate on the push step. |
| `commitflow-ai.fallbackCommitMessage` | `chore: update files` | Used when AI generation fails; empty disables fallback. |

## Commands

- `commitflow-ai.sync` — the full workflow above (`Ctrl+Alt+S`).
- `commitflow-ai.setApiKey` (palette title: "CommitFlow AI: Set API Key (for
  Active Provider)") — `showInputBox({ password: true })` →
  `context.secrets.store`, keyed to the currently configured provider
  (`getApiKeySecretName`). The input box prompt names the provider
  explicitly (e.g. "Enter your Amazon Bedrock API key") since the palette
  title itself can't reflect the live setting value.
- `commitflow-ai.clearApiKey` (palette title: "CommitFlow AI: Clear API Key
  (for Active Provider)") — `context.secrets.delete` for the currently
  configured provider's key.

## Settings migration (`migrateModelSetting()` in `src/extension.ts`)

`commitflow-ai.model` was renamed to `commitflow-ai.openrouterModel` for
symmetry with `commitflow-ai.bedrockModel`. On `activate()`,
`migrateModelSetting()` inspects the old `model` key at Global and
Workspace scope; for each scope with an old value it copies it to
`openrouterModel` (only if `openrouterModel` isn't already set at that
scope) and clears the old key. This runs once per activation and is
effectively a no-op after the first run for a given scope.

## Build / run / package

```bash
cd commitflow-ai
npm install
npm run compile   # tsc -p ./
npm run watch      # tsc -watch -p ./ (bound to the default build task, F5)
npm run package     # @vscode/vsce package → .vsix
```

Debug via `.vscode/launch.json` ("Run CommitFlow AI") — launches an
Extension Development Host with `--extensionDevelopmentPath` pointed at
`commitflow-ai/`.

## Notes for future changes

- `vsce` (unscoped, on npm) is deprecated and capped at `2.15.0`; the
  package manifest uses the maintained `@vscode/vsce` instead, keeping the
  `npm run package` script name (`vsce package`) unchanged since both
  packages install the same `vsce` bin.
- Diff-size thresholds and prompt truncation intentionally never send
  `node_modules`, `dist`, lockfiles, etc. specially — see `plan.md` §13 for
  the deliberately-deferred "smart hunk sampling" improvement that would
  exclude generated/binary noise from the medium/large-diff payloads.
