import * as vscode from "vscode";

import {
    gitPull,
    gitAddAll,
    getStagedDiff,
    getStagedStat,
    getStagedNameStatus,
    getStagedNumStat,
    hasStagedChanges,
    commit,
    push
} from "./git";

import {
    generateCommitMessage
} from "./ai";

import { CommitResult } from "./types";

export function activate(
    context: vscode.ExtensionContext
) {

    const syncCommand =
        vscode.commands.registerCommand(
            "commitflow-ai.sync",
            () => runSync(context)
        );

    const setKeyCommand =
        vscode.commands.registerCommand(
            "commitflow-ai.setApiKey",
            () => setApiKey(context)
        );

    const clearKeyCommand =
        vscode.commands.registerCommand(
            "commitflow-ai.clearApiKey",
            () => clearApiKey(context)
        );

    context.subscriptions.push(
        syncCommand,
        setKeyCommand,
        clearKeyCommand
    );
}

async function runSync(
    context: vscode.ExtensionContext
) {

    const workspace =
        vscode.workspace.workspaceFolders?.[0];

    if (!workspace) {
        vscode.window.showErrorMessage(
            "CommitFlow AI: Open a Git repository first."
        );

        return;
    }

    const cwd =
        workspace.uri.fsPath;

    try {

        let result: CommitResult | undefined;

        await vscode.window.withProgress(
            {
                location:
                    vscode.ProgressLocation.Notification,
                title:
                    "CommitFlow AI",
                cancellable: false
            },
            async (progress) => {

                progress.report({
                    message: "Pulling latest changes..."
                });

                await gitPull(cwd);

                progress.report({
                    message: "Staging changes..."
                });

                await gitAddAll(cwd);

                const staged =
                    await hasStagedChanges(cwd);

                if (!staged) {

                    vscode.window.showInformationMessage(
                        "CommitFlow AI: No changes to commit."
                    );

                    return;
                }

                progress.report({
                    message:
                        "Analyzing staged changes..."
                });

                const aiInput =
                    await buildAIInput(cwd);

                progress.report({
                    message:
                        "Generating commit message..."
                });

                result =
                    await getCommitMessage(
                        context,
                        aiInput
                    );

                const label =
                    result.isFallback
                        ? `Commit message (fallback):\n\n${result.message}`
                        : `Commit message:\n\n${result.message}`;

                const confirmed =
                    await vscode.window.showInformationMessage(
                        label,
                        {
                            modal: true
                        },
                        "Commit & Push",
                        "Commit Only",
                        "Cancel"
                    );

                if (
                    confirmed === "Cancel" ||
                    !confirmed
                ) {
                    vscode.window.showInformationMessage(
                        "CommitFlow AI: Operation cancelled."
                    );

                    result = undefined;

                    return;
                }

                progress.report({
                    message: "Creating commit..."
                });

                await commit(
                    cwd,
                    result.message
                );

                const autoPush =
                    vscode.workspace
                        .getConfiguration("commitflow-ai")
                        .get<boolean>("autoPush", true);

                if (
                    confirmed === "Commit & Push" &&
                    autoPush
                ) {

                    progress.report({
                        message: "Pushing changes..."
                    });

                    await push(cwd);
                }
            }
        );

        if (result) {
            vscode.window.showInformationMessage(
                "CommitFlow AI: Done."
            );
        }

    } catch (error) {

        const message =
            error instanceof Error
                ? error.message
                : String(error);

        vscode.window.showErrorMessage(
            `CommitFlow AI: ${message}`
        );
    }
}

/**
 * Generates a commit message via the AI, falling back to a
 * user-configured default message when the AI call fails
 * (no API key, network error, rate limit, etc). Leaving the
 * fallback setting empty disables the fallback and surfaces
 * the original error instead.
 */
async function getCommitMessage(
    context: vscode.ExtensionContext,
    aiInput: string
): Promise<CommitResult> {

    try {

        const message =
            await generateCommitMessage(
                context,
                aiInput
            );

        return {
            message,
            isFallback: false
        };

    } catch (error) {

        const config =
            vscode.workspace.getConfiguration(
                "commitflow-ai"
            );

        const fallback =
            config
                .get<string>("fallbackCommitMessage", "chore: update files")
                .trim();

        if (!fallback) {
            throw error;
        }

        const reason =
            error instanceof Error
                ? error.message
                : String(error);

        vscode.window.showWarningMessage(
            `CommitFlow AI: AI commit message generation failed (${reason}). Using fallback message from settings.`
        );

        return {
            message: fallback,
            isFallback: true
        };
    }
}

async function buildAIInput(
    cwd: string
): Promise<string> {

    const config =
        vscode.workspace.getConfiguration(
            "commitflow-ai"
        );

    const fullLimit =
        config.get<number>(
            "maxFullDiffBytes",
            40000
        );

    const reducedLimit =
        config.get<number>(
            "maxReducedDiffBytes",
            150000
        );

    const diff =
        await getStagedDiff(cwd);

    const size =
        Buffer.byteLength(
            diff,
            "utf8"
        );

    /*
     * Small diff:
     * Send everything.
     */
    if (size <= fullLimit) {

        return `
Staged diff:

${diff}
`;
    }

    /*
     * Medium diff:
     * Send a compact diff.
     */
    if (size <= reducedLimit) {

        const stat =
            await getStagedStat(cwd);

        const names =
            await getStagedNameStatus(cwd);

        /*
         * Keep only the first portion of
         * the diff to prevent huge prompts.
         */
        const truncated =
            diff.substring(
                0,
                fullLimit
            );

        return `
Staged change summary:

${stat}

Changed files:

${names}

Partial diff:

${truncated}
`;
    }

    /*
     * Large diff:
     * Do not send the entire diff.
     */
    const stat =
        await getStagedStat(cwd);

    const names =
        await getStagedNameStatus(cwd);

    const numstat =
        await getStagedNumStat(cwd);

    return `
Large staged change detected.

Repository change statistics:

${stat}

Changed files:

${names}

Line statistics:

${numstat}

Generate the commit message from the overall
change structure above.

Do not assume details that are not present.
`;
}

async function setApiKey(
    context: vscode.ExtensionContext
) {

    const key =
        await vscode.window.showInputBox({
            prompt:
                "Enter your OpenRouter API key",
            password: true,
            ignoreFocusOut: true,
            placeHolder:
                "sk-or-v1-..."
        });

    if (!key) {
        return;
    }

    await context.secrets.store(
        "commitflow-ai.openrouterApiKey",
        key.trim()
    );

    vscode.window.showInformationMessage(
        "CommitFlow AI: OpenRouter API key saved securely."
    );
}

async function clearApiKey(
    context: vscode.ExtensionContext
) {

    await context.secrets.delete(
        "commitflow-ai.openrouterApiKey"
    );

    vscode.window.showInformationMessage(
        "CommitFlow AI: OpenRouter API key removed."
    );
}

export function deactivate() {}
