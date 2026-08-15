# Recommendations

Derived from `01`–`04`. Ordered by impact vs. effort, not by file. Nothing
here is implemented yet — this is a proposal list, cross-referenced to the
specific finding it addresses.

## High impact, low effort

1. **Add an opt-out-able confirmation step for the commit message before
   committing.** E.g. a `commitflow-ai.confirmBeforeCommit` setting
   (default `false`, to preserve current behavior) that swaps the
   info-notification for a modal `showInformationMessage` with
   Commit/Cancel actions, awaited before calling `commit()`. Directly
   addresses the "no gate between generation and push" risk in
   `03-risk-and-security-assessment.md` and the "easy to miss" UX gap in
   `04-ux-and-workflow-assessment.md`, without changing the default
   fast-path experience the concept is built around.
2. **Fix the UTF-8 truncation boundary in `buildAIInput`'s medium-diff
   branch.** Truncate on the same unit the size check used (bytes), e.g.
   via `Buffer.from(diff, "utf8").subarray(0, fullLimit).toString("utf8")`
   guarded against splitting a multi-byte sequence, instead of
   `diff.substring(0, fullLimit)`. Small, contained fix for the edge case
   in `02-edge-cases.md`.
3. **Clamp `maxCommitLength` to a sane minimum (e.g. 10) when read.**
   One-line guard in `ai.ts` where `maxLength` is read from config, avoids
   the confusing "git rejects empty commit message" failure mode from a
   misconfigured setting.
4. **Distinguish "Done (pushed)" from "Done (committed only)" in the final
   notification.** Cheap: `runSync` already knows `autoPush`'s value at
   that point; interpolate it into the final message.

## Medium impact, medium effort

5. **Offer a narrower command for "commit only, no pull, no push."**
   A second command (e.g. `commitflow-ai.commitOnly`) reusing
   `buildAIInput`/`getCommitMessage` but skipping `gitPull` and `push`
   would cover the "I already staged what I want, just write the message"
   use case flagged in `04-ux-and-workflow-assessment.md`, without changing
   what the primary `sync` keybinding does.
6. **Warn (not block) when staged changes look sensitive before sending to
   the AI.** A lightweight check on staged filenames/paths (`.env`,
   `*.pem`, `*_rsa`, common secret-file patterns) via
   `getStagedNameStatus` — already computed for medium/large diffs — surfaced
   as a warning notification with a chance to abort, addresses the
   secret-exposure risk in `03-risk-and-security-assessment.md` without
   taking on full content-based secret scanning.
7. **Validate `maxReducedDiffBytes > maxFullDiffBytes` and warn otherwise.**
   Prevents the confusing-tiering configuration edge case in
   `02-edge-cases.md` from silently doing something the user didn't intend.
8. **Detect and name specific pull failure modes** (merge conflict vs. no
   remote vs. network) in `gitPull`'s call site, mirroring the special-case
   handling `push()` already does for "no upstream branch" — turns several
   raw-git-error edge cases in `02-edge-cases.md` into actionable messages.

## Lower priority / larger design questions worth a decision, not just a fix

9. **Should `autoPush` default to `false`?** This is a product decision, not
   a bug — flagged in `01-concept-assessment.md` and
   `03-risk-and-security-assessment.md` as the single setting with the
   largest effect on the tool's risk profile. Worth deciding deliberately
   rather than leaving as inherited from the original design doc.
10. **Should `git add .` remain unconditional, or should the extension
    support a "respect what's already staged" mode** (skip `gitAddAll`
    entirely if `hasStagedChanges` is already true, so a user who
    deliberately staged a subset of files via source control UI isn't
    overridden)? This changes the tool's contract from "stage everything for
    me" to "write a message for what I staged," which is a meaningfully
    different product for teams with partial-commit habits.
11. **Multi-root workspace support** — currently silently uses only
    `workspaceFolders[0]`; worth either explicit multi-root handling or an
    explicit "only the first folder is used" note in the command's own
    error messaging, so it fails loudly instead of quietly operating on the
    wrong folder.
