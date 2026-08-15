
# CommitFlow AI

**One keyboard shortcut to go from changes to pushed code.**

Press `Ctrl+Alt+S` and CommitFlow AI handles the entire Git workflow automatically:

**Pull → Stage → AI Commit Message → Commit → Push**

No typing commit messages. No repetitive Git commands. No confirmation prompts.

## ⚡ Why CommitFlow AI?

### One shortcut. Your entire Git workflow.

Instead of manually running:

```bash
git pull
git add .
git commit -m "..."
git push
````

just press:

**`Ctrl+Alt+S`**

CommitFlow AI does it for you.

### 🤖 AI-powered commit messages

CommitFlow AI analyzes your staged changes and generates a concise, meaningful commit message automatically.

For example:

```text
feat: add dark mode toggle
```

or:

```text
fix: prevent duplicate login requests
```

### 🔄 Fully automatic

Your shortcut runs the complete workflow:

```text
          Ctrl + Alt + S
                 │
                 ▼
            Git Pull
                 │
                 ▼
          Stage All Changes
                 │
                 ▼
        Analyze Changes
                 │
                 ▼
       Generate AI Message
                 │
                 ▼
            Git Commit
                 │
                 ▼
             Git Push
```

Once you invoke the shortcut, CommitFlow AI handles the rest.

### 🧠 Handles large changes

CommitFlow AI automatically adapts the amount of change information sent to the AI, allowing it to work with both small changes and larger changesets while controlling API usage.

### 🕸 Don't let AI failures stop you

You can optionally configure a fallback commit message.

If AI generation fails because of a network problem, rate limit, unavailable model, or missing API key, CommitFlow AI can use your fallback message and continue the workflow.

Or leave the fallback empty to stop safely when AI generation fails.

### 🔐 Bring Your Own Key

Use your own AI provider credentials.

Your API keys are stored securely using VS Code's built-in Secret Storage and are not saved in your project or settings files.

### 🔌 Choose your AI provider

Currently supported:

* **OpenRouter** — choose from a wide range of AI models.
* **Amazon Bedrock** — use supported Bedrock models with your own AWS credentials.

### ⚙️ Customize your workflow

Configure:

* AI provider
* AI model
* Commit style
* Maximum commit message length
* Automatic pushing
* Fallback commit message
* Diff handling limits

## 🚀 Getting Started

### 1. Install CommitFlow AI

Install the extension from the VS Code Marketplace, or via the Extensions view (`Ctrl+Shift+X`) by searching for **CommitFlow AI**.

### 2. Choose your AI provider

By default, CommitFlow AI uses **OpenRouter**. If that's fine, skip to step 3.

To use **Amazon Bedrock** instead:

1. Open **Settings** (`Ctrl+,`).
2. Search for `commitflow-ai.provider`.
3. Set it to `bedrock`.

### 3. Add your API key

1. Open the **Command Palette** (`Ctrl+Shift+P`).
2. Run **`CommitFlow AI: Set API Key (for Active Provider)`**.
3. Paste your key when prompted and press `Enter`.

> The command reads whichever provider is set in step 2, so set the provider *before* adding the key. Your key is saved to VS Code's Secret Storage, not to your settings file.

Where to get a key:

* **OpenRouter** — create one at [openrouter.ai/keys](https://openrouter.ai/keys). It looks like `sk-or-v1-...`.
* **Amazon Bedrock** — generate a Bedrock API key in the AWS Console (Bedrock → API keys). It looks like `ABSK...`. Also set `commitflow-ai.bedrockRegion` and `commitflow-ai.bedrockModel` in Settings if you're not using the defaults.

Need to update or remove a key later? Run **`CommitFlow AI: Set API Key`** again to overwrite it, or **`CommitFlow AI: Clear API Key`** to delete it.

### 4. Open a Git repository

Open a folder in VS Code that's already a Git repository (`git init` if it isn't yet).

### 5. Make some changes and sync

Edit your files, then press **`Ctrl+Alt+S`**.

CommitFlow AI pulls, stages, generates a commit message, commits, and pushes — automatically.

## ⌨️ Commands & Shortcuts

| Command                                              | Shortcut     | Description                                             |
| ----------------------------------------------------- | ------------ | -------------------------------------------------------- |
| `CommitFlow AI: Sync Changes`                          | `Ctrl+Alt+S` | Runs the full pull → commit → push workflow.             |
| `CommitFlow AI: Set API Key (for Active Provider)`     | —            | Saves an API key for the currently selected provider.    |
| `CommitFlow AI: Clear API Key (for Active Provider)`   | —            | Removes the saved API key for the currently selected provider. |

All commands are available from the **Command Palette** (`Ctrl+Shift+P`). You can change the sync shortcut through **Keyboard Shortcuts** in VS Code.

## 🤖 OpenRouter

CommitFlow AI works with OpenRouter's Chat Completions API.

The default model is:

```text
~anthropic/claude-sonnet-latest
```

You can change the model to any compatible OpenRouter model.

## ☁️ Amazon Bedrock

CommitFlow AI also supports Amazon Bedrock through its OpenAI-compatible Chat Completions API.

Configure your:

* AWS region
* Bedrock model
* Bedrock API key

Your Bedrock and OpenRouter credentials are stored separately, so you can switch providers without losing your saved credentials.

## ⚙️ Settings

| Setting                               | Default                           | Description                                 |
| ------------------------------------- | --------------------------------- | ------------------------------------------- |
| `commitflow-ai.provider`              | `openrouter`                      | AI provider.                                |
| `commitflow-ai.openrouterModel`       | `~anthropic/claude-sonnet-latest` | OpenRouter model.                           |
| `commitflow-ai.bedrockRegion`         | `us-east-1`                       | Amazon Bedrock region.                      |
| `commitflow-ai.bedrockModel`          | `openai.gpt-oss-120b`             | Bedrock model.                              |
| `commitflow-ai.commitStyle`           | `conventional`                    | Commit message style.                       |
| `commitflow-ai.maxCommitLength`       | `72`                              | Maximum commit message length.              |
| `commitflow-ai.autoPush`              | `true`                            | Automatically push after committing.        |
| `commitflow-ai.fallbackCommitMessage` | Empty                             | Optional fallback when AI generation fails. |

## 🔒 Privacy & Security

CommitFlow AI does not provide an AI service or proxy your requests.

You provide your own API key, and requests are sent directly to your selected AI provider.

API keys are stored using VS Code Secret Storage.

