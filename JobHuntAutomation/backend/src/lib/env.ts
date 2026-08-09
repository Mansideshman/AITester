export const APIFY_TOKEN = process.env.APIFY_TOKEN?.trim() || "";
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.trim() || "";
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5";
export const JSEARCH_API_KEY = process.env.JSEARCH_API_KEY?.trim() || "";

export const isApifyConfigured = () => APIFY_TOKEN.length > 0;
export const isAnthropicConfigured = () => ANTHROPIC_API_KEY.length > 0;
export const isJSearchConfigured = () => JSEARCH_API_KEY.length > 0;
