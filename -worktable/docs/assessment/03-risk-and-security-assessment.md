# Risk & Security Assessment

Scope: data sent to third parties, credential handling, and the blast radius
of the no-confirmation commit/push flow. Based on `ai.ts`, `git.ts`, and
`extension.ts` as implemented.

## Data exposure to the AI provider

- **The staged diff — potentially including secrets — is sent to a
  third-party API by design.** For any change under `maxFullDiffBytes`
  (default 40,000 bytes), the *entire* diff content goes to OpenRouter or
  Bedrock (`buildAIInput`, full-diff branch). If a developer stages a file
  containing a credential, token, or key — accidentally or because it
  wasn't yet gitignored — and the diff is under the size threshold, that
  secret is transmitted to whichever third-party model is configured before
  the user sees any preview. This is a direct consequence of `git add .`
  being unconditional (see `02-edge-cases.md`): there is no path in the
  current code where a file gets excluded from staging *and* therefore from
  the diff sent to the AI.
- **No secret-pattern scanning anywhere in the pipeline.** Neither
  `buildAIInput` nor `generateCommitMessage` inspects diff content for
  likely-sensitive patterns (API key formats, private key headers, `.env`
  contents, etc.) before sending. This is a reasonable scope decision for a
  v1, but it means the tool currently offers no defense here beyond
  whatever `.gitignore` the user already had in place before running it.
- **Reduced/large-diff tiers leak filenames even when they don't leak
  content.** `--name-status` and `--numstat` still send full file paths to
  the AI provider (`extension.ts` reduced/large branches). A path like
  `secrets/prod-db-credentials.sql` reveals sensitive information about the
  repository's structure/contents even when the line-level diff is withheld
  for size reasons — the size-based tiering was designed for prompt-cost
  control, not for information sensitivity, so it doesn't reduce exposure
  on that axis.
- **Model/provider selection determines the actual trust boundary, and nothing
  in the code enforces it.** `openrouterModel` defaults to
  `~anthropic/claude-sonnet-latest` — the `~` OpenRouter prefix opts into
  OpenRouter's default data-retention policy for that model slot, which
  varies by the account's OpenRouter settings rather than anything
  CommitFlow AI controls. A user who assumes "my code never leaves my AWS
  account" needs to have deliberately selected `provider: bedrock`; nothing
  in the extension defaults toward the more conservative choice or warns
  when `openrouter` (the default) is active on a repository that looks
  sensitive.

## Credential handling

- **API keys are stored via `vscode.ExtensionContext.secrets`**
  (OS keychain-backed: Windows Credential Manager / macOS Keychain /
  libsecret), not `settings.json` and not the extension's own storage —
  this is the correct mechanism and is handled well
  (`setApiKey`/`clearApiKey`, `extension.ts` ~411-474).
  Per-provider secret names (`getApiKeySecretName`) correctly prevent a
  provider switch from silently reusing or clobbering the other provider's
  key.
- **Key entry uses `password: true`** on the input box (`extension.ts` line
  ~430), so it isn't echoed in the UI — appropriate.
- **Keys are sent as a bearer token over HTTPS to the configured endpoint**
  (`ai.ts` ~152-155, ~164-181) — standard and appropriate; no custom crypto
  or key derivation to review.
- **No key-format validation before storage.** `setApiKey` stores whatever
  string the user enters (after `.trim()`), with only a UI `placeHolder`
  hint of the expected prefix (`sk-or-v1-...` / `ABSK...`) — not a risk
  in the security sense, just means a malformed key isn't caught until the
  first failed sync, surfaced as a generic HTTP error.
- **Errors from a failed request include the raw response body**
  (`ai.ts` line ~188, ~199, ~216), which is good for debuggability and is
  not itself a leak (it's the provider's response, not the request), but
  worth naming: if a provider ever echoed request content back in an error
  body, that would surface in a VS Code notification/log. Not observed in
  the current OpenRouter/Bedrock error shapes handled here — noted as a
  category to keep in mind if more providers are added.

## Unattended commit/push risk

- **No user confirmation between "message generated" and "committed and
  pushed."** This is the concept's central risk (see
  `01-concept-assessment.md`) restated in security/process terms: for a
  repository with branch protection or required review, this doesn't bypass
  those controls (git/GitHub still enforce them), but for any repo *without*
  such protection, an unattended process is pushing to a remote based on
  unreviewed AI output. The generated message is shown in a **non-blocking**
  notification (`runSync` ~130-135) — informational, not gating.
- **`autoPush` defaults to `true`.** Combined with the above, the
  out-of-the-box behavior is "AI-authored commit, pushed automatically,"
  not "AI-authored commit, held locally for review." A user who wants the
  more conservative default has to discover and change this setting rather
  than opt in to the riskier one.
- **`git pull` runs as an unreviewed first step of every sync**
  (see `02-edge-cases.md`'s pull section) — a merge or fast-forward from a
  shared remote happens automatically before the user's own changes are
  analyzed and committed, with no diff shown for the incoming changes
  either.
- **Fallback-message path lowers the bar further, deliberately.** Setting
  `fallbackCommitMessage` to a non-empty string turns *any* AI failure
  (including e.g. a transient network blip or rate limit) into "commit and
  push anyway with a generic message" rather than "stop and tell the user."
  This is documented, intentional, opt-in behavior
  (`technical-guide.md`'s Fallback section) — flagged here only because it
  is the one setting that directly trades reliability of the *audit trail*
  (meaningful commit messages) for uptime of the automation, and a user
  enabling it should understand that trade explicitly.

## What's already well-mitigated

- **Command injection.** All git invocation goes through
  `execFile("git", args, { cwd })`, never a shell string
  (`git.ts` git()`, line 4-20) — no shell metacharacter interpolation
  surface regardless of what a filename, branch name, or AI-generated
  string contains.
- **`execFile` argument-injection via the commit message.** Because
  `commit()` passes the message as a single array element
  (`git.ts` ~76-79), a message starting with `-` or containing spaces
  cannot be split into extra `git commit` flags/arguments the way string
  concatenation into a shell command could allow.
- **Malformed provider responses cannot crash or hang the extension** —
  every failure mode identified in `02-edge-cases.md`'s AI-response section
  (non-JSON body, missing choices, empty message, in-body error shape)
  throws a typed `Error` with context rather than propagating an unhandled
  exception or silently committing garbage.
