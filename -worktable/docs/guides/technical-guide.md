# CommitFlow AI — Technical Guide

## Overview

CommitFlow AI is a VS Code extension that automates the pull → stage →
commit → push workflow behind a single command/keybinding
(`commitflow-ai.sync`, `Ctrl+Alt+S`), using OpenRouter to generate the
commit message from the staged diff.

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
│   ├── ai.ts               # OpenRouter request + response cleanup
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

This means an OpenRouter API key is **optional** for `commitflow-ai.sync`
to run at all — without one, every sync uses the fallback message unless
the user clears `commitflow-ai.fallbackCommitMessage`.

## Git access (`src/git.ts`)

All git calls go through `execFile("git", args, { cwd })` (via
`util.promisify`) rather than a shell string, so there's no shell
interpolation/injection surface and it works identically cross-platform.
`hasStagedChanges` relies on `git diff --cached --quiet`'s exit code
(non-zero ⇒ there are staged changes) rather than parsing output.

## OpenRouter integration (`src/ai.ts`)

- Reads the API key from `context.secrets` (`commitflow-ai.openrouterApiKey`)
  — never from `settings.json` or the package.
- POSTs to `https://openrouter.ai/api/v1/chat/completions` with the model
  from `commitflow-ai.model`, `temperature: 0.2`, `max_tokens: 100`.
- `cleanCommitMessage()` strips wrapping quotes/backticks, a leading
  "commit message:" prefix, collapses newlines, and truncates to
  `commitflow-ai.maxCommitLength` on a word boundary.

## Settings (contributed in `package.json`)

| Setting | Default | Purpose |
| --- | --- | --- |
| `commitflow-ai.model` | `openai/gpt-4o` | OpenRouter model id. |
| `commitflow-ai.maxFullDiffBytes` | `40000` | Full-diff cutoff. |
| `commitflow-ai.maxReducedDiffBytes` | `150000` | Reduced-diff cutoff. |
| `commitflow-ai.commitStyle` | `conventional` | Passed into the AI prompt. |
| `commitflow-ai.maxCommitLength` | `72` | Enforced client-side after generation. |
| `commitflow-ai.autoPush` | `true` | Gate on the push step. |
| `commitflow-ai.fallbackCommitMessage` | `chore: update files` | Used when AI generation fails; empty disables fallback. |

## Commands

- `commitflow-ai.sync` — the full workflow above (`Ctrl+Alt+S`).
- `commitflow-ai.setApiKey` — `showInputBox({ password: true })` →
  `context.secrets.store`.
- `commitflow-ai.clearApiKey` — `context.secrets.delete`.

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
