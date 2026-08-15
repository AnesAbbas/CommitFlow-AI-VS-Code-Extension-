# Edge Cases

Grouped by stage of `runSync`. "Handled" = current source already covers it
correctly; "Not handled" = confirmed gap; "Partially handled" = covered for
the common case but with a residual gap noted.

## No workspace / no repo

- **No folder open.** Handled — `runSync` checks
  `vscode.workspace.workspaceFolders?.[0]` and shows an error message before
  doing anything (`extension.ts` ~59-68).
- **Folder open but not a Git repo.** Not handled explicitly — `gitPull`
  will fail with git's own "not a git repository" stderr, which surfaces via
  the generic catch in `runSync` as `CommitFlow AI: <git's raw message>`.
  Functional, but the error isn't reworded for a non-technical user.
- **Multi-root workspace.** Not handled — only
  `workspaceFolders?.[0]` is used; any second/third root folder is silently
  ignored even if that's where the user's changes are.

## `git pull` step

- **No remote / no upstream configured.** `gitPull(cwd)` (`git.ts` 22-24)
  has no special-casing at all (unlike `push`, which does handle "no
  upstream"). A detached HEAD or a branch with no tracking ref makes
  `git pull` fail, which aborts the whole sync before staging even happens —
  including for a user who only wanted to commit locally with no remote in
  play yet.
- **Merge conflict from the pull.** Not handled — if `git pull` produces
  conflicts, the command exits non-zero, `runSync`'s catch fires, and the
  user sees a raw git error. Nothing detects "you're now mid-conflict" or
  tells the user to resolve it before re-running.
- **Pull succeeds via a merge commit.** Handled only incidentally — the
  subsequent `git add .` / diff-against-`--cached` operations see whatever
  state pull left behind; a merge that auto-resolves cleanly just becomes
  part of what gets staged and analyzed with no distinction from the user's
  own edits.
- **Network unavailable.** Handled by the generic catch (surfaces git's
  network error), but treated identically to every other failure — no
  offline-specific messaging.

## `git add .` / staging

- **Nothing staged and nothing changed.** Handled —
  `hasStagedChanges` (`git.ts` 52-65, via `git diff --cached --quiet` exit
  code) returns `false` and `runSync` shows an info message and returns
  cleanly, no commit attempted (`extension.ts` ~99-109).
- **`.gitignore` present.** Handled by git itself — `git add .` respects
  ignore rules, so this is not extension-specific behavior, just worth
  noting it's inherited, not implemented.
- **Untracked files the user did not intend to commit** (stray debug
  output, a locally-generated `.env`, an IDE scratch file not yet
  gitignored). **Not handled** — `gitAddAll` is unconditional
  (`git.ts` 26-28); there is no staged-file review step before the diff is
  read and committed. See `03-risk-and-security-assessment.md`.
- **Binary files staged (images, compiled artifacts).** Partially handled —
  `git diff --cached` on binary files produces a "Binary files differ" line
  rather than a real diff, so the AI input degrades gracefully in content
  (no crash), but the commit message quality for a binary-only change is
  effectively "the AI is guessing from the filename in `--name-status`."

## Diff-size tiering (`buildAIInput`)

- **Diff exactly at a threshold boundary.** Handled — both comparisons are
  `<=`, so a diff of exactly `maxFullDiffBytes` bytes takes the full-diff
  path, not the reduced path (`extension.ts` ~272, ~285).
- **Reduced-diff truncation splits a multi-byte UTF-8 character.**
  Not handled — `diff.substring(0, fullLimit)` (`extension.ts` line ~299)
  slices by UTF-16 code unit, and `fullLimit` was computed against a
  **byte** length (`Buffer.byteLength`, line ~263-266). For a diff containing
  multi-byte characters (any non-ASCII: em dashes, non-English text,
  emoji in strings/comments) near the boundary, the byte-measured limit and
  the code-unit-indexed slice can disagree, and the slice can land inside a
  multi-byte character, producing a truncated/malformed sequence sent to the
  AI. Not a crash — just a leaked encoding assumption.
- **User sets `maxReducedDiffBytes` below `maxFullDiffBytes`.**
  Not handled — no validation between the two settings. If reduced < full,
  a diff can be simultaneously "too big for full" and "too big for
  reduced" in an order that doesn't match the comment's intent, or a
  diff in between could hit neither branch's *intended* assumption (the code
  still terminates via the three `if`/`if`/`else` branches, so there's no
  crash, but the settings contract is unenforced and a misconfigured pair
  produces confusing tiering).
- **Extremely large repositories / diffs (tens of MB).** Handled up to
  `execFile`'s `maxBuffer: 20 * 1024 * 1024` (`git.ts` line 15) — a
  `git diff --cached` output larger than 20 MB throws (`ERR_CHILD_PROCESS_
  STDOUT_MAXBUFFER` or similar) before `buildAIInput` even gets to apply its
  own tiering, since the raw diff has to be read once regardless of which
  tier it'll end up in.
- **All changes are renames/deletes only (no line content).** Handled — stat
  / name-status / numstat all represent renames and deletes distinctly;
  the AI input degrades to structural info, consistent with the large-diff
  path's design intent.

## AI response handling (`ai.ts`, `generateCommitMessage` / `cleanCommitMessage`)

- **Missing API key.** Handled — explicit check and error before any
  network call (`ai.ts` ~75-79).
- **Non-2xx HTTP response.** Handled — response body read as text first,
  error thrown with status + body (`ai.ts` ~186-190), so failures aren't
  swallowed as a parse exception.
- **200 response with an in-body `{ error: {...} }`** (OpenRouter's
  documented failure shape for some error classes). Handled explicitly
  (`ai.ts` ~203-209).
- **Non-JSON response body** (HTML error page, empty body, proxy
  interstitial). Handled — try/catch around `JSON.parse` with a clear error
  instead of an opaque exception (`ai.ts` ~192-201).
- **`content` as an array of parts vs. a plain string.** Handled — both
  shapes normalized before cleanup (`ai.ts` ~222-234).
- **Empty message after trim.** Handled — explicit check, error includes
  the model name from the response for diagnosability (`ai.ts` ~236-243).
- **Model returns multiple candidate messages / explanatory preamble despite
  the prompt's "ONE message" instruction.** Handled — `cleanCommitMessage`
  takes the first non-empty line after fence/quote stripping
  (`ai.ts` ~270-280). **Residual gap:** if the model's *first* line is
  itself a preamble ("Here's a commit message:") rather than the message,
  only `"commit message:"` / `"message:"` prefixes are stripped
  (`ai.ts` ~283-286) — any other preamble phrasing ("Sure, here is...",
  "Based on the diff...") passes through as the commit message verbatim.
- **Message contains a literal newline the model didn't intend as a
  separator** (e.g., a deliberate two-line conventional-commit body).
  Handled *as a side effect*, not by design — the "take first line" logic
  means any multi-line response is silently reduced to its first line, so
  the extension cannot currently produce a commit with a subject + body,
  even if a future prompt asked for one.
- **Model emits control characters / null bytes.** Handled — `commit()` in
  `git.ts` strips `\x00` before invoking `execFile`, which would otherwise
  throw `ERR_INVALID_ARG_VALUE` (`git.ts` ~71-79, documented in
  `technical-guide.md`).
- **Truncation lands mid-word.** Handled — `maxCommitLength` truncation
  backs up to the last word boundary via
  `.replace(/\s+\S*$/, "")` rather than hard-cutting
  (`ai.ts` ~288-294). **Edge case within the edge case:** a message with no
  whitespace before the cutoff (one very long unbroken token) leaves the
  regex nothing to match, so the result is a hard cut at `maxLength`
  characters, not a bug but worth noting as the regex's actual boundary
  behavior.
- **`maxCommitLength` set to 0 or a negative number.** Not handled — no
  clamping; `result.length > maxLength` with `maxLength <= 0` truncates to
  an empty (or near-empty) string, which then becomes the commit message
  handed to `git commit -m ""`-equivalent input. Git rejects an empty
  commit message by default (`Aborting commit due to empty commit message`),
  so the practical effect is the sync erroring out at the commit step with a
  git-authored message that doesn't explain the setting caused it.

## Commit / push step

- **Commit message with only whitespace/control chars after sanitization.**
  Partially handled — `commit()` trims after stripping null bytes
  (`git.ts` line 74), so an all-null-byte AI response becomes `""` and git
  itself rejects the empty message; the resulting error surfaces through the
  generic catch, not a CommitFlow-specific explanation.
- **No upstream branch configured for push.** Handled explicitly — `push()`
  detects the "no upstream branch" failure and retries with
  `--set-upstream origin <branch>` (`git.ts` ~82-105).
- **Push rejected (remote has commits the local branch doesn't, e.g. someone
  else pushed in between the sync's `pull` and its `push`).** Not handled —
  only the "no upstream" case is special-cased; a plain non-fast-forward
  rejection propagates as a raw git error via the generic catch. The
  commit itself has already happened locally and is not rolled back — the
  user is left with a local commit ahead of a rejected push, which is
  recoverable but requires understanding git to resolve.
- **Detached HEAD state.** Not handled — `commit` and `push` will behave
  however plain git behaves in detached HEAD (commit succeeds locally but
  isn't on any branch; push fails with "you are not currently on a branch"),
  surfaced only as a raw git error.

## Configuration / migration edge cases

- **User has both old `commitflow-ai.model` and new
  `commitflow-ai.openrouterModel` set at the same scope.**
  Handled — `migrateModelSetting()` only copies the old value over if the
  new key isn't already set at that scope, so an explicit new-key value
  always wins and isn't clobbered (`extension.ts` ~391-401).
- **`migrateModelSetting()` runs on every `activate()`.** Handled as a
  no-op after first run — once the old key is cleared, subsequent
  activations see `oldValue === undefined` and skip (`extension.ts`
  ~389-393), consistent with `technical-guide.md`'s description.
- **Provider switched (`openrouter` ↔ `bedrock`) between setting the API key
  and running sync.** Handled — key storage and lookup are both keyed by
  the *currently configured* provider (`getApiKeySecretName`), so this
  can't silently use the wrong provider's key; worst case is a clear
  "API key has not been configured" error for the newly-selected provider.
