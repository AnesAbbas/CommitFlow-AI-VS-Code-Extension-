# Concept Assessment

## The core idea

`Ctrl+Alt+S` collapses `git pull` → `git add .` → AI-generated commit message
→ `git commit` → `git push` into one keystroke, with no confirmation step
between "message generated" and "committed and pushed"
(`runSync` in `extension.ts`). This is the extension's entire value
proposition and its entire risk surface — the same design choice produces
both.

## Where the concept is strong

- **Removes the highest-friction step in the loop, not the least risky one.**
  Writing a commit message is genuinely where most solo-dev commit hygiene
  degrades ("wip", "fix", "asdf"). Automating *that* step specifically,
  rather than e.g. auto-generating diffs or PR descriptions, targets the
  actual friction point.
- **BYOK + provider choice avoids lock-in.** OpenRouter (many models via one
  key) and Amazon Bedrock (org-owned AWS billing/compliance) cover both the
  "individual hobbyist" and "enterprise with AWS governance" cases with the
  same code path (`ai.ts`), because both speak the OpenAI chat-completions
  shape.
- **Tiered payload strategy is the right shape.** Full diff → stat + partial
  diff → stat/name-status/numstat-only as the diff grows
  (`buildAIInput` in `extension.ts`) is a sensible response to "diffs can be
  arbitrarily large but prompts can't be." It trades commit-message
  specificity for cost/latency predictably as change size grows, rather than
  either always sending everything (cost blowup) or always summarizing
  (bad messages for small changes).
- **Fails safe by default.** `fallbackCommitMessage` defaults to empty, which
  means a missing API key or AI failure **aborts the sync** rather than
  committing something meaningless — the risky "commit and push with a junk
  message" behavior is opt-in, not the default (`getCommitMessage` in
  `extension.ts`).

## Where the concept is inherently in tension with itself

- **"One keystroke, no confirmation" is the pitch — and it is also what
  makes a bad AI message or a bad diff-to-message mapping expensive.** The
  commit message is shown as a non-blocking info notification
  (`runSync`, line ~130-135) *after* it's already decided but the commit
  happens regardless of whether the user reads it before it scrolls away.
  There is no reject/edit/retry step. Any workflow this fast is, by
  construction, a workflow the user cannot meaningfully gate.
- **`git pull` as step 1, silently.** Folding a pull into a "commit my
  changes" keybinding means a single keystroke can also merge in unrelated
  upstream history, immediately before staging and committing local work.
  If the pull produces a merge or conflict markers, that becomes part of
  what gets analyzed/staged/committed. This is a bigger behavioral surface
  than "AI writes commit messages" suggests at first read.
- **`git add .` is unconditional and unscoped.** The tool has no concept of
  "changes I meant to commit" vs. "files that happen to be sitting in the
  working tree" — see `02-edge-cases.md` and
  `03-risk-and-security-assessment.md` for the concrete failure modes
  (secrets, debug files, unrelated in-progress work) this creates.
- **Auto-push is the default, not auto-commit-only.** `autoPush` defaults to
  `true` (per `technical-guide.md`'s settings table), so out of the box the
  keybinding's blast radius is "your remote," not just "your local repo."
  Local mistakes are recoverable (`git reset`); a pushed commit on a shared
  branch is a team-visible event.

## Net assessment

The concept is well-matched to a **solo developer on their own
branch/repo**, where "fast and slightly wrong" is cheap to fix (amend,
force-push, nobody else is affected). It is a materially worse fit —
as currently designed, unconfigured — for **shared branches or
multi-contributor repos**, where the same speed/no-confirmation design
turns "AI picked a misleading message" or "pull merged in something odd"
into a shared-history event. Nothing in the current implementation
distinguishes those two contexts; see `05-recommendations.md`.
