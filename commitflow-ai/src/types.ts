export interface GitStatus {
    hasChanges: boolean;
    stagedFiles: string[];
}

export interface DiffAnalysis {
    diff: string;
    size: number;
    mode: "full" | "reduced" | "summary";
}

export interface CommitResult {
    message: string;
    isFallback: boolean;
}
