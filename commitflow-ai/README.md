
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

1. Install **CommitFlow AI**.
2. Configure your AI provider.
3. Add your API key.
4. Open a Git repository.
5. Make some changes.
6. Press **`Ctrl+Alt+S`**.

That's it.

## ⌨️ Keyboard Shortcut

| Command                     | Shortcut     |
| --------------------------- | ------------ |
| CommitFlow AI: Sync Changes | `Ctrl+Alt+S` |

You can change the shortcut through **Keyboard Shortcuts** in VS Code.

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

