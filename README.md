# CommitFlow AI — Smart Git Sync & AI Commit Messages

A VS Code extension that turns `Ctrl+Alt+S` into: pull → stage → analyze
staged changes → generate a commit message via OpenRouter → commit → push.

- **Extension source:** [`commitflow-ai/`](commitflow-ai) — see
  [`commitflow-ai/README.md`](commitflow-ai/README.md) for install/usage and
  the full settings reference.
- **Technical guide:** [`-worktable/docs/guides/technical-guide.md`](-worktable/docs/guides/technical-guide.md)
- **Original design plan:** [`-worktable/docs/plan.md`](-worktable/docs/plan.md)

## Quick start

```bash
cd commitflow-ai
npm install
npm run compile
```

Then press `F5` in VS Code to launch the Extension Development Host, open a
Git repository, and press `Ctrl+Alt+S`.

An OpenRouter API key (`CommitFlow AI: Set OpenRouter API Key`) is optional:
without one, commits use the configurable
`commitflow-ai.fallbackCommitMessage` setting instead of an AI-generated
message.
