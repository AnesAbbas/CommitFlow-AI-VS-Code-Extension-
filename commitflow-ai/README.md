# CommitFlow AI

**Smart Git Sync & AI Commit Messages** for VS Code.

Turns `Ctrl+Alt+S` into: pull → stage → analyze → AI commit message → commit → push.

```text
Ctrl + Alt + S
       │
       ▼
   Git Pull
       │
       ▼
   Git Add .
       │
       ▼
 Analyze staged changes
       │
       ├── small  → full diff
       ├── medium → compact diff
       └── large  → structured summary
       │
       ▼
 OpenRouter or Bedrock
       │
       ▼
 AI commit message
       │
       ▼
   Git Commit
       │
       ▼
    Git Push
```

## Features

- **One shortcut, full sync** — `Ctrl+Alt+S` pulls, stages, generates a commit
  message, and commits (optionally pushing).
- **Size-aware diff analysis** — small diffs are sent in full, medium diffs are
  sent as a compact summary + partial diff, large diffs are sent as
  statistics only, keeping API usage under control.
- **BYOK (Bring Your Own Key)** — your API key is stored using VS Code's
  built-in Secret Storage. It is never written to settings, the extension
  package, or source control.
- **Choice of AI provider** — use OpenRouter or Amazon Bedrock (via its
  OpenAI-compatible Chat Completions endpoint), configurable in settings.
  Each provider's API key is stored separately, so switching providers
  doesn't require re-entering a key you've already saved.
- **Configurable commit style, model, and length limits.**
- **Fallback commit message** — if AI generation fails for any reason (no API
  key configured, network error, rate limit, invalid response, etc.),
  CommitFlow AI uses a default commit message you configure in settings
  instead of blocking the whole sync. You still get a confirmation dialog
  before anything is committed.

## Commands

| Command | Description |
| --- | --- |
| `CommitFlow AI: Sync Changes` | Runs the full pull → add → AI message → commit → push flow. Bound to `Ctrl+Alt+S`. |
| `CommitFlow AI: Set API Key (for Active Provider)` | Prompts for and securely stores the API key for whichever provider `commitflow-ai.provider` is currently set to. The prompt names the provider explicitly. |
| `CommitFlow AI: Clear API Key (for Active Provider)` | Removes the stored API key for whichever provider `commitflow-ai.provider` is currently set to. |

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `commitflow-ai.provider` | `openrouter` | AI provider used to generate commit messages: `openrouter` or `bedrock`. |
| `commitflow-ai.openrouterModel` | `~anthropic/claude-sonnet-latest` | OpenRouter model used to generate commit messages (used when `commitflow-ai.provider` is `openrouter`). |
| `commitflow-ai.bedrockRegion` | `us-east-1` | AWS region of the Bedrock runtime endpoint (used when `commitflow-ai.provider` is `bedrock`). |
| `commitflow-ai.bedrockModel` | `us.anthropic.claude-sonnet-4-6` | Bedrock model ID used to generate commit messages (used when `commitflow-ai.provider` is `bedrock`). |
| `commitflow-ai.maxFullDiffBytes` | `40000` | Maximum staged diff size (bytes) sent as a full diff. |
| `commitflow-ai.maxReducedDiffBytes` | `150000` | Maximum staged diff size (bytes) before switching to a structured summary. |
| `commitflow-ai.commitStyle` | `conventional` | `conventional`, `simple`, or `descriptive`. |
| `commitflow-ai.maxCommitLength` | `72` | Maximum recommended commit message length. |
| `commitflow-ai.autoPush` | `true` | Push after committing when "Commit & Push" is chosen. |
| `commitflow-ai.fallbackCommitMessage` | `chore: update files` | Commit message used when AI generation fails. Set to an empty string to disable the fallback and surface the error instead. |

## Getting started

1. Install dependencies and compile:

   ```bash
   npm install
   npm run compile
   ```

2. Press `F5` in VS Code to launch the Extension Development Host.
3. (Optional) Set `commitflow-ai.provider` to `openrouter` (default) or
   `bedrock`.
4. Run `CommitFlow AI: Set API Key (for Active Provider)` (optional — see
   Fallback behavior below) and paste a key:
   - OpenRouter: a key from https://openrouter.ai/.
   - Amazon Bedrock: a Bedrock API key (see
     [Use an Amazon Bedrock API key](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys-use.html)).
     Note AWS recommends long-lived Bedrock API keys for exploration/dev
     only, not production.
5. Open any Git repository, make changes, and press `Ctrl+Alt+S`.

## Amazon Bedrock provider

Set `commitflow-ai.provider` to `bedrock` to generate commit messages via
Amazon Bedrock's OpenAI-compatible Chat Completions endpoint
(`https://bedrock-runtime.<region>.amazonaws.com/v1/chat/completions`)
instead of OpenRouter. Configure:

- `commitflow-ai.bedrockRegion` — the AWS region (default `us-east-1`).
- `commitflow-ai.bedrockModel` — the Bedrock model ID (default
  `us.anthropic.claude-sonnet-4-6`).
- Run `CommitFlow AI: Set API Key (for Active Provider)` while
  `commitflow-ai.provider` is `bedrock` to store your Bedrock API key. It's
  stored separately from your OpenRouter key, so switching
  `commitflow-ai.provider` back and forth doesn't require re-entering keys
  you've already saved.

## Migrating from `commitflow-ai.model`

`commitflow-ai.model` was renamed to `commitflow-ai.openrouterModel` (to
match `commitflow-ai.bedrockModel`). Existing values are migrated
automatically the first time the extension activates; you shouldn't need to
do anything, but if you have `commitflow-ai.model` set in a scope this
doesn't cover (e.g. a `.code-workspace` folder scope), move the value to
`commitflow-ai.openrouterModel` manually.

## Fallback behavior

If no API key is configured for the selected provider, or the request fails
for any reason, CommitFlow AI does **not** stop the sync. Instead it uses
the message from `commitflow-ai.fallbackCommitMessage` (default:
`chore: update files`) and shows a warning notification explaining why. You
still see the commit message in the confirmation dialog before it's used,
and can cancel.

Set `commitflow-ai.fallbackCommitMessage` to an empty string if you'd rather
have CommitFlow AI show an error and abort instead of falling back.

## Security

Your API key is stored via `context.secrets`, VS Code's Secret Storage API,
under a key scoped to the selected provider. It is never written to
`package.json`, `settings.json`, `extension.ts`, this README, or any file
tracked by git.

## Packaging

```bash
npm run package
```

Produces a `.vsix` file via `vsce`.
