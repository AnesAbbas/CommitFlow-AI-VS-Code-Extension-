# UX & Workflow Assessment

How the single-command flow actually feels to use, based on the sequence of
`vscode.window.withProgress` steps and notifications in `runSync`
(`extension.ts`).

## What works well

- **Progress reporting matches the real steps.** Each phase — pulling,
  staging, analyzing, generating, creating commit, pushing — gets its own
  `progress.report({ message: ... })` call, so a slow step (e.g. a large
  diff going to the AI) is legible as "Generating commit message..." rather
  than the UI looking frozen (`extension.ts` ~87-158).
  For large repos or slow networks this is the difference between a user
  waiting confidently and a user assuming it hung and cancelling/retrying.
- **"No changes to commit" short-circuits cleanly.** No wasted AI call, no
  misleading progress steps for a no-op run — it exits right after staging
  with a plain info message (`extension.ts` ~99-109).
- **The fallback path tells the user it happened, and why, and labels the
  message as a fallback.** `getCommitMessage` surfaces a warning with the
  actual failure reason before falling back
  (`extension.ts` ~222-229), and `runSync` prefixes the shown message with
  "(fallback)" (`extension.ts` ~130-133) — a user watching notifications
  can tell the difference between "AI wrote this" and "AI failed, this is
  your configured default" without digging into logs.
- **Errors are prefixed with the provider name.** Every thrown error out of
  `ai.ts` is prefixed with `getProviderLabel()` ("OpenRouter" or "Amazon
  Bedrock") — when a user runs sync and it fails, they immediately know
  which system to check (their OpenRouter dashboard vs. AWS), rather than a
  generic "API request failed."
- **Cancellable: false is a defensible, if debatable, choice.** The
  `withProgress` call sets `cancellable: false`
  (`extension.ts` line ~83) — once started, a sync can't be interrupted
  mid-flight. Given the flow ends in a push, allowing cancellation *after*
  the commit but *before* the push (or vice versa) would need careful
  state handling; not offering cancellation at all sidesteps that
  complexity at the cost of flexibility if a user realizes partway through
  that they didn't want to run this right now.

## Where the flow can surprise a user

- **The commit message notification is easy to miss, and nothing waits for
  it.** It's shown via `showInformationMessage` (non-modal, auto-dismissing
  in VS Code's notification stack) *and* the very next progress step
  ("Creating commit...") starts immediately after
  (`extension.ts` ~135-141) — there's no `await` on user acknowledgment.
  A user glancing away for even a few seconds may never actually read the
  message their repository just committed under.
- **One combined command name, six distinct operations.** `commitflow-ai.sync`
  is invoked from a single keybinding and a single command-palette entry,
  but semantically performs a pull, a broad stage, an AI call, a commit, and
  conditionally a push. A user who wants "just commit what I've already
  staged with a good message, nothing else" has no such command — the
  granularity offered by the extension is "everything" or "nothing," with
  no way to run a subset (e.g., generate-message-only, or
  stage-and-commit-without-pull, or commit-without-push-this-once).
- **Success message ("Done.") doesn't distinguish what actually happened.**
  Whether the sync pulled + committed + pushed, or pulled + committed with
  `autoPush: false`, the terminal message is the same generic
  "CommitFlow AI: Done." (`extension.ts` ~162-166) — a user relying on that
  notification to confirm "did it push?" can't tell from the message alone.
- **Settings that change behavior significantly are easy to set once and
  forget.** `autoPush: false` and a non-empty `fallbackCommitMessage` both
  change what the *default* keybinding does in ways that aren't visible at
  the point of pressing `Ctrl+Alt+S` — there's no in-flow indicator (e.g.,
  in the progress title) reminding the user "push is disabled" or "fallback
  is armed" on a given run.
- **No indication of which provider/model produced a message**, at the
  point the message is shown. A user who has switched between OpenRouter
  and Bedrock (e.g., comparing quality) sees the same notification format
  either way and would need to check settings to know which one just ran.

## Net UX read

The flow is well-instrumented for "watch it work" (progress messages, clear
provider-attributed errors, explicit fallback labeling) but not instrumented
for "confirm before it's permanent" — every piece of user-facing feedback in
`runSync` is informational/after-the-fact, none of it is a gate. That's
consistent with the concept's design intent (see
`01-concept-assessment.md`), but it means the UX quality of *error
reporting* is noticeably higher than the UX quality of *decision points*,
because the design has almost no decision points after the keybinding is
pressed.
