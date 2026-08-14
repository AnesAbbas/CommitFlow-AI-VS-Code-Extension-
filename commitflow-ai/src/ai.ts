import * as vscode from "vscode";

interface OpenRouterResponse {
    choices?: Array<{
        message?: {
            content?: string;
        };
    }>;
}

export async function generateCommitMessage(
    context: vscode.ExtensionContext,
    input: string
): Promise<string> {

    const apiKey =
        await context.secrets.get(
            "commitflow-ai.openrouterApiKey"
        );

    if (!apiKey) {
        throw new Error(
            "OpenRouter API key has not been configured."
        );
    }

    const config =
        vscode.workspace.getConfiguration(
            "commitflow-ai"
        );

    const model =
        config.get<string>(
            "model",
            "openai/gpt-4o"
        );

    const style =
        config.get<string>(
            "commitStyle",
            "conventional"
        );

    const maxLength =
        config.get<number>(
            "maxCommitLength",
            72
        );

    const prompt = `
Generate ONE Git commit message for the staged changes below.

Rules:

- Return ONLY the commit message.
- Do not wrap it in quotes.
- Do not use Markdown.
- Maximum ${maxLength} characters.
- Describe the primary purpose of the change.
- Do not merely list changed files.
- Use imperative language.

Commit style:
${style}

If style is "conventional", use:
type: short description

Possible types:
feat
fix
refactor
docs
test
chore
perf
style
build

Changes:

${input}
`;

    const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://marketplace.visualstudio.com/",
                "X-Title": "CommitFlow AI"
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.2,
                max_tokens: 100
            })
        }
    );

    if (!response.ok) {
        const errorText =
            await response.text();

        throw new Error(
            `OpenRouter request failed (${response.status}): ${errorText}`
        );
    }

    const data =
        await response.json() as OpenRouterResponse;

    const message =
        data.choices?.[0]?.message?.content?.trim();

    if (!message) {
        throw new Error(
            "OpenRouter returned an empty commit message."
        );
    }

    return cleanCommitMessage(
        message,
        maxLength
    );
}

function cleanCommitMessage(
    message: string,
    maxLength: number
): string {

    let result =
        message
            .replace(/^["'`]+/, "")
            .replace(/["'`]+$/, "")
            .replace(/^commit message:\s*/i, "")
            .replace(/\r?\n/g, " ")
            .trim();

    if (result.length > maxLength) {
        result =
            result.substring(0, maxLength)
                .replace(/\s+\S*$/, "")
                .trim();
    }

    return result;
}
