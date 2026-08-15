import * as vscode from "vscode";

interface OpenRouterResponse {
    id?: string;
    model?: string;
    choices?: Array<{
        index?: number;
        finish_reason?: string;
        message?: {
            role?: string;
            content?: string | Array<{
                type?: string;
                text?: string;
            }>;
        };
    }>;
    error?: {
        message?: string;
        code?: string | number;
    };
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
            "openrouter/free"
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
- Return ONLY ONE commit message.
- Do not provide alternatives.
- Do not explain your answer.
- Do not use Markdown.
- Do not wrap the message in quotes.
- Maximum ${maxLength} characters.
- Describe the primary purpose of the change.
- Use imperative language.

Commit style:
${style}

If using conventional commits, use:
type: short description

Allowed types:
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
                "HTTP-Referer":
                    "https://marketplace.visualstudio.com/",
                "X-Title":
                    "CommitFlow AI"
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.1,
                max_tokens: 200
            })
        }
    );

    const rawText =
        await response.text();

    if (!response.ok) {
        throw new Error(
            `OpenRouter request failed (${response.status}): ${rawText}`
        );
    }

    let data: OpenRouterResponse;

    try {
        data =
            JSON.parse(rawText) as OpenRouterResponse;
    } catch {
        throw new Error(
            `OpenRouter returned invalid JSON: ${rawText.substring(0, 1000)}`
        );
    }

    if (data.error) {
        throw new Error(
            `OpenRouter error: ${
                data.error.message ?? "Unknown error"
            }`
        );
    }

    const choice =
        data.choices?.[0];

    if (!choice) {
        throw new Error(
            `OpenRouter returned no choices. Response: ${rawText.substring(0, 1000)}`
        );
    }

    let message = "";

    const content =
        choice.message?.content;

    if (typeof content === "string") {

        message = content;

    } else if (Array.isArray(content)) {

        message = content
            .map(part => part.text ?? "")
            .join("");
    }

    message = message.trim();

    if (!message) {
        throw new Error(
            `OpenRouter returned an empty commit message. ` +
            `Model: ${data.model ?? "unknown"}`
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

    let result = message.trim();

    // Remove Markdown code fences.
    result = result
        .replace(/^```[a-zA-Z]*\s*/, "")
        .replace(/\s*```$/, "")
        .trim();

    // Remove leading/trailing quotes.
    result = result
        .replace(/^["']+/, "")
        .replace(/["']+$/, "")
        .trim();

    // If the model ignored the "one message" instruction
    // and returned multiple lines, use the first meaningful line.
    const lines =
        result
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);

    if (lines.length > 0) {
        result = lines[0];
    }

    // Remove common prefixes.
    result = result
        .replace(/^commit message:\s*/i, "")
        .replace(/^message:\s*/i, "")
        .trim();

    if (result.length > maxLength) {
        result =
            result
                .substring(0, maxLength)
                .replace(/\s+\S*$/, "")
                .trim();
    }

    return result;
}
