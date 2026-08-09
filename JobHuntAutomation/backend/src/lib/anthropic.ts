import { ANTHROPIC_API_KEY, ANTHROPIC_MODEL } from "./env";

export class AnthropicError extends Error {}

/**
 * Calls Anthropic's Messages API and returns the parsed JSON from the first text block.
 * Callers must instruct the model (via `prompt`) to respond with strict JSON only.
 */
export async function callAnthropicJson<T>(prompt: string, maxTokens = 1500): Promise<T> {
  if (!ANTHROPIC_API_KEY) throw new AnthropicError("ANTHROPIC_API_KEY is not configured");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new AnthropicError(`Anthropic API error: ${res.status} ${text}`);
  }

  const body = (await res.json()) as any;
  const text: string = body?.content?.[0]?.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new AnthropicError("Anthropic response did not contain JSON");
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    throw new AnthropicError("Failed to parse Anthropic JSON response");
  }
}
