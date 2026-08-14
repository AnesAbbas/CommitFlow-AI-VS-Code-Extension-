import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

async function git(
    args: string[],
    cwd: string
): Promise<string> {
    const result = await execFileAsync(
        "git",
        args,
        {
            cwd,
            maxBuffer: 20 * 1024 * 1024
        }
    );

    return result.stdout.trim();
}

export async function gitPull(cwd: string): Promise<void> {
    await git(["pull"], cwd);
}

export async function gitAddAll(cwd: string): Promise<void> {
    await git(["add", "."], cwd);
}

export async function getStagedDiff(cwd: string): Promise<string> {
    return git(["diff", "--cached"], cwd);
}

export async function getStagedStat(cwd: string): Promise<string> {
    return git(["diff", "--cached", "--stat"], cwd);
}

export async function getStagedNameStatus(cwd: string): Promise<string> {
    return git(
        ["diff", "--cached", "--name-status"],
        cwd
    );
}

export async function getStagedNumStat(cwd: string): Promise<string> {
    return git(
        ["diff", "--cached", "--numstat"],
        cwd
    );
}

export async function hasStagedChanges(
    cwd: string
): Promise<boolean> {
    try {
        await git(
            ["diff", "--cached", "--quiet"],
            cwd
        );

        return false;
    } catch {
        return true;
    }
}

export async function commit(
    cwd: string,
    message: string
): Promise<void> {
    await git(
        ["commit", "-m", message],
        cwd
    );
}

export async function push(cwd: string): Promise<void> {
    await git(["push"], cwd);
}
