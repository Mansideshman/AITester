import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { excelManager } from "./excelManager";
import { ContentRow, KEYWORD_POOL } from "./types";

function getGroqClient(): Groq {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");
  return new Groq({ apiKey: key });
}

function getGeminiClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey: key });
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

async function groqChat(
  client: Groq,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096
): Promise<string> {
  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}

// ─── Agent 1: Topic Generator ────────────────────────────────────────────────

export async function runAgent1(): Promise<string> {
  console.log("[Agent1] Generating topic...");
  const groq = getGroqClient();
  const existing = await excelManager.readAll();
  const usedTopics = existing.map((r) => r.topic.toLowerCase());

  const pool = KEYWORD_POOL.filter(
    (kw) => !usedTopics.some((t) => t.includes(kw.toLowerCase()))
  );
  const candidates = pool.length > 0 ? pool : [...KEYWORD_POOL];

  const topic = await groqChat(
    groq,
    `You are a technical content strategist for an AI/QA engineering audience.
Given a keyword, produce a single specific, practical article title.
Do not add quotes, numbering, or extra commentary — just the title.`,
    `Pick one keyword from: ${candidates.join(", ")}
Return ONLY a compelling, specific title for a technical post or article.
Do not repeat any of these existing titles: ${existing.map((r) => r.topic).join(" | ")}`
  );

  const date = todayISO();
  const newRow: ContentRow = {
    date,
    topic: topic.replace(/^["']|["']$/g, "").trim(),
    linkedinPost: "",
    mediumArticle: "",
    igScript: "",
    ytScript: "",
    devtoArticle: "",
    status: "Pending",
    linkedinImage: "",
    mediumImage: "",
    igImage: "",
  };

  await excelManager.upsertRow(newRow);
  console.log(`[Agent1] Topic generated: "${newRow.topic}"`);
  return newRow.topic;
}

// ─── Agent 2: Content Writer ─────────────────────────────────────────────────

export async function runAgent2(topic: string): Promise<void> {
  console.log(`[Agent2] Writing content for: "${topic}"`);
  const groq = getGroqClient();
  const date = todayISO();

  await excelManager.updateRow(date, { status: "Writing" });

  const voice = `You write in a direct, opinionated technical voice.
Use short paragraphs (2-4 sentences). Include real code snippets or concrete
examples where relevant. Avoid filler phrases: "game-changer", "dive deep",
"seamlessly", "robust", "leverage", "cutting-edge". No waffle. Be specific.`;

  // LinkedIn post
  const linkedinPost = await groqChat(
    groq,
    `${voice}\nYou write LinkedIn posts for senior software engineers and QA professionals.`,
    `Write a LinkedIn post about: "${topic}"
Requirements:
- Hook in first line (no "I" opener)
- 150-200 words total
- 3-5 short paragraphs
- End with 1 concrete takeaway or question
- No hashtag spam (max 3 relevant hashtags at the end)`,
    512
  );

  // Medium article
  const mediumArticle = await groqChat(
    groq,
    `${voice}\nYou write long-form technical articles for Medium (markdown format).`,
    `Write a complete 3000-word Medium article about: "${topic}"
Structure:
# [Title]
## Introduction (the problem, why it matters now)
## [Core concept 1 — specific heading]
## [Core concept 2 — specific heading]
## [Core concept 3 — specific heading]
## Practical Implementation (code examples, steps)
## Common Pitfalls
## Conclusion (key points, next step for the reader)

Use markdown: ## headings, \`code\`, \`\`\`code blocks\`\`\`, **bold**, bullet lists.`,
    8192
  );

  // Instagram script
  const igScript = await groqChat(
    groq,
    `${voice}\nYou write Instagram Reels/Carousel scripts for a technical audience.`,
    `Write an Instagram reel/carousel script about: "${topic}"
Format:
SLIDE 1: Hook text (bold statement or surprising fact, max 10 words)
SLIDE 2-6: One insight per slide (headline + 1 sentence explanation)
SLIDE 7: CTA (follow / save / comment prompt)
CAPTION: 100-word caption with 5 targeted hashtags
VO (voiceover notes for reel): 30-second spoken script`,
    1024
  );

  // YouTube script
  const ytScript = await groqChat(
    groq,
    `${voice}\nYou write YouTube video scripts with clear timestamps.`,
    `Write a full YouTube script about: "${topic}"
Structure:
[00:00] INTRO (hook question + what viewer will learn, 30 sec)
[00:30] CONTEXT (why this topic matters now)
[02:00] SECTION 1: [specific aspect]
[05:00] SECTION 2: [specific aspect]
[08:00] SECTION 3: [specific aspect]
[11:00] DEMO/WALKTHROUGH (step by step, mention code/tools)
[14:00] OUTRO (3 key takeaways + subscribe/like CTA)

Include spoken dialogue, not just bullet points. Add [B-ROLL] and [SCREEN SHARE] cues.`,
    4096
  );

  // Dev.to article
  const devtoArticle = await groqChat(
    groq,
    `${voice}\nYou write technical articles for Dev.to (markdown, developer audience).`,
    `Write a complete 2000-word Dev.to article about: "${topic}"
Front matter:
---
title: [title]
published: true
tags: [3-5 relevant tags]
---

Structure:
## TL;DR (3 bullet points)
## The Problem
## How [topic] Solves It
## Implementation (code-heavy, practical steps)
## Testing / Validation
## Key Takeaways

Use \`inline code\` and \`\`\`language\\n...code...\`\`\` blocks liberally.`,
    6144
  );

  await excelManager.updateRow(date, {
    linkedinPost,
    mediumArticle,
    igScript,
    ytScript,
    devtoArticle,
    status: "Imaging",
  });

  console.log("[Agent2] Content written successfully.");
}

// ─── Agent 3: Image Generator ─────────────────────────────────────────────────

export async function runAgent3(topic: string): Promise<void> {
  console.log(`[Agent3] Generating images for: "${topic}"`);
  const gemini = getGeminiClient();
  const date = todayISO();

  const imageDir = path.resolve(process.cwd(), "public", "images");
  if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });

  const safeTopic = topic.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const dateSlug = date.replace(/-/g, "");

  interface ImageSpec {
    key: keyof Pick<ContentRow, "linkedinImage" | "mediumImage" | "igImage">;
    filename: string;
    prompt: string;
  }

  const specs: ImageSpec[] = [
    {
      key: "mediumImage",
      filename: `${dateSlug}_${safeTopic}_medium.png`,
      prompt: `Professional 16:9 cover image for a technical blog article titled "${topic}". Minimalist design, dark background, subtle tech/circuit patterns, white and blue accent colors. Bold title text overlay. Suitable for Medium.com article header. High quality, clean.`,
    },
    {
      key: "linkedinImage",
      filename: `${dateSlug}_${safeTopic}_linkedin.png`,
      prompt: `Professional LinkedIn post image for the topic "${topic}". Clean corporate tech aesthetic, gradient background (deep navy to electric blue). Bold headline text, abstract data visualization accent. Professional and eye-catching.`,
    },
    {
      key: "igImage",
      filename: `${dateSlug}_${safeTopic}_instagram.png`,
      prompt: `Square Instagram post image for the tech topic "${topic}". Bold, vibrant design with gradient purple-to-blue background. Large bold title text. Modern, engaging look for a tech/AI audience. Clean icons or minimal illustration.`,
    },
  ];

  const updates: Partial<ContentRow> = {};

  async function generateWithRetry(spec: ImageSpec): Promise<void> {
    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await gemini.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: spec.prompt,
          config: { responseModalities: ["IMAGE"] },
        });

        let saved = false;
        const parts = response.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          const data = (part as { inlineData?: { mimeType?: string; data?: string } }).inlineData;
          if (data?.mimeType?.startsWith("image/") && data.data) {
            const buffer = Buffer.from(data.data, "base64");
            const filePath = path.join(imageDir, spec.filename);
            fs.writeFileSync(filePath, buffer);
            updates[spec.key] = `/images/${spec.filename}`;
            console.log(`[Agent3] Saved ${spec.key}: ${filePath}`);
            saved = true;
            break;
          }
        }
        if (!saved) {
          console.warn(`[Agent3] No image data for ${spec.key} on attempt ${attempt}`);
          updates[spec.key] = "";
        }
        return; // success
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Parse retry-after from 429 responses
        const retryMatch = msg.match(/retry in (\d+)/i);
        const waitMs = retryMatch ? (parseInt(retryMatch[1]) + 2) * 1000 : 15_000;

        if (attempt < MAX_RETRIES && msg.includes("429")) {
          console.log(`[Agent3] Rate limited on ${spec.key}, waiting ${waitMs / 1000}s (attempt ${attempt}/${MAX_RETRIES})...`);
          await new Promise((r) => setTimeout(r, waitMs));
        } else {
          console.error(`[Agent3] Failed ${spec.key} after ${attempt} attempts: ${msg.slice(0, 120)}`);
          updates[spec.key] = "";
          return;
        }
      }
    }
  }

  for (const spec of specs) {
    await generateWithRetry(spec);
  }

  const hasAnyImage = Object.values(updates).some((v) => v !== "");

  await excelManager.updateRow(date, {
    ...updates,
    status: hasAnyImage ? "Done" : "Error",
    errorMessage: hasAnyImage ? "" : "All image generations failed — see logs",
  });

  console.log(`[Agent3] Images done. Status: ${hasAnyImage ? "Done" : "Error"}`);
}

// ─── API Key Health Check ─────────────────────────────────────────────────────

export async function checkGroqHealth(): Promise<boolean> {
  try {
    const groq = getGroqClient();
    const res = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
    });
    return !!res.choices[0];
  } catch {
    return false;
  }
}

export async function checkGeminiHealth(): Promise<boolean> {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return false;
    // Lightweight check: just verify the key is set and non-empty
    // (a real API call to imagen costs tokens; we skip it for health)
    return key.length > 8;
  } catch {
    return false;
  }
}
