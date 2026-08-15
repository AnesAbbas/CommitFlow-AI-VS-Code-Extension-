# Changelog

## Unreleased

- Removed the commit/push confirmation dialog — `Ctrl+Alt+S` now commits
  (and pushes, per `commitflow-ai.autoPush`) automatically, showing the
  generated commit message as a notification instead of blocking on it.
- Fixed auto-push silently failing on a branch with no upstream: `push()`
  now retries with `git push --set-upstream origin <branch>` instead of
  throwing "no upstream branch" (previously surfaced as an error toast
  that looked like nothing happened after the commit).
- Fixed `commit()` throwing `ERR_INVALID_ARG_VALUE` ("must be a string
  without null bytes") when the AI response contained a stray `\x00`
  control character — the commit message is now sanitized before being
  passed to `git commit -m`.

## 0.0.1

- Initial release: pull → stage → AI commit message (OpenRouter) → commit → push, bound to `Ctrl+Alt+S`.
- Size-aware staged diff analysis (full / reduced / summary).
- BYOK OpenRouter API key stored via VS Code Secret Storage.
- Configurable model (default `openrouter/free`), commit style, max length, and auto-push.
- Configurable fallback commit message used when AI generation fails.
- Robust OpenRouter response handling: tolerates string or content-block
  `message.content`, in-body `{ error }` responses, and non-JSON error
  bodies.
