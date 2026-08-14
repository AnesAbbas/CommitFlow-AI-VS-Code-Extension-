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
    OpenRouter
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
- **BYOK (Bring Your Own Key)** — your OpenRouter API key is stored using VS
  Code's built-in Secret Storage. It is never written to settings, the
  extension package, or source control.
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
| `CommitFlow AI: Set OpenRouter API Key` | Prompts for and securely stores your OpenRouter API key. |
| `CommitFlow AI: Clear OpenRouter API Key` | Removes the stored API key. |

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `commitflow-ai.model` | `openai/gpt-4o` | OpenRouter model used to generate commit messages. |
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
3. Run `CommitFlow AI: Set OpenRouter API Key` (optional — see Fallback
   behavior below) and paste a key from https://openrouter.ai/.
4. Open any Git repository, make changes, and press `Ctrl+Alt+S`.

## Fallback behavior

If no API key is configured, or the OpenRouter request fails for any reason,
CommitFlow AI does **not** stop the sync. Instead it uses the message from
`commitflow-ai.fallbackCommitMessage` (default: `chore: update files`) and
shows a warning notification explaining why. You still see the commit
message in the confirmation dialog before it's used, and can cancel.

Set `commitflow-ai.fallbackCommitMessage` to an empty string if you'd rather
have CommitFlow AI show an error and abort instead of falling back.

## Security

Your OpenRouter API key is stored via `context.secrets`, VS Code's Secret
Storage API. It is never written to `package.json`, `settings.json`,
`extension.ts`, this README, or any file tracked by git.

## Packaging

```bash
npm run package
```

Produces a `.vsix` file via `vsce`.
