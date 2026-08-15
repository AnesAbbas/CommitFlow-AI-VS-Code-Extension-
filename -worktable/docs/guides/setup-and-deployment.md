# CommitFlow AI — Setup & Deployment

## Prerequisites

- Node.js 18+ and npm
- VS Code 1.85+
- Git on `PATH`
- (Optional) an [OpenRouter](https://openrouter.ai/) API key — not required
  to run the extension, only to get AI-generated commit messages instead of
  the fallback message.

## Local setup

```bash
cd commitflow-ai
npm install
npm run compile
```

## Run / debug

1. Open the `commitflow-ai/` folder in VS Code.
2. Press `F5` (uses `.vscode/launch.json` → "Run CommitFlow AI"), which
   builds via the `watch` task and launches an Extension Development Host.
3. In the new window, open any Git repository.
4. Run **CommitFlow AI: Set OpenRouter API Key** from the Command Palette
   if you want AI-generated messages (stored via VS Code Secret Storage,
   never written to disk in the repo).
5. Make some changes and press `Ctrl+Alt+S`.

For a live-reload loop without `F5`, run `npm run watch` in a terminal and
use **Developer: Reload Window** in the Extension Development Host after
each change.

## Packaging (.vsix)

```bash
cd commitflow-ai
npm run package
```

Runs `vsce package` (via the `@vscode/vsce` devDependency) and produces
`commitflow-ai-<version>.vsix` in `commitflow-ai/`.

### Install a packaged build locally

```bash
code --install-extension commitflow-ai-0.0.1.vsix
```

or, in VS Code: Extensions view → `...` menu → **Install from VSIX...**.

## Publishing to the Marketplace

1. Create the [`TreehouseTechLabs`](https://marketplace.visualstudio.com/manage)
   publisher (matching the `publisher` field already set in
   `commitflow-ai/package.json`) and an Azure DevOps Personal Access Token
   (Marketplace: Manage scope).
2. Log in and publish:

   ```bash
   npx @vscode/vsce login TreehouseTechLabs
   npx @vscode/vsce publish
   ```

   `vsce publish` bumps nothing by default — pass `patch` / `minor` / `major`
   to also bump `version` in `package.json`, e.g. `vsce publish patch`.

## Bumping versions

Update `version` in `commitflow-ai/package.json` and add an entry to
`commitflow-ai/CHANGELOG.md` before packaging/publishing.

## Notes

- No secrets live in the repo or the packaged `.vsix` — the OpenRouter key
  only ever lives in VS Code's Secret Storage on the end user's machine.
- There is no CI workflow configured yet; `npm run compile` is the
  build/verify step to run before packaging or publishing.
