# Changelog

## 0.0.1

- Initial release: pull → stage → AI commit message (OpenRouter) → commit → push, bound to `Ctrl+Alt+S`.
- Size-aware staged diff analysis (full / reduced / summary).
- BYOK OpenRouter API key stored via VS Code Secret Storage.
- Configurable model (default `openrouter/free`), commit style, max length, and auto-push.
- Configurable fallback commit message used when AI generation fails.
- Robust OpenRouter response handling: tolerates string or content-block
  `message.content`, in-body `{ error }` responses, and non-JSON error
  bodies.
