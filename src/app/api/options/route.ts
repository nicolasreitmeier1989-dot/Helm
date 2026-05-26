// WFC — choice-generator endpoint (Phase 6).
//
// POST /api/options
//
// Body: { questionId, context, count?, exclude?, refine? }
//
// Returns: { options: ChoiceOption[] }
//
// When ANTHROPIC_API_KEY is missing, returns 503 { error: "no_api_key" }.
// The client (ChoiceGenerator) falls back to the static defaults library
// in that case, keeping the demo path alive.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ChoiceOption } from "@/lib/staticChoices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Body {
  questionId: string;
  context?: Record<string, unknown>;
  count?: number;
  exclude?: string[];
  refine?: boolean;
}

function configured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const SYSTEM_PROMPT = `You are WFC's choice generator. For a given strategic question and prior-answer context, produce {count} short, distinct, plausible options that a strategist can click. Each option has a snappy label (3-7 words), an optional one-sentence description, and a payload object representing the underlying selection. Options must be mutually distinct. Exclude the labels in {exclude}. When {refine} is true, deliberately vary the angle from your previous suggestions — different framing, different scope, different posture.

Hard rules:
- Output STRICT JSON matching the provided schema. No prose, no markdown.
- Each id is a short stable kebab-case slug derived from the label.
- Labels are 3-7 words. Descriptions ≤ 1 sentence, ≤ 20 words.
- Payload is a small object that downstream wizard code can store directly. Always include the label inside payload.label.
- meta is OPTIONAL: a single short uppercase tag like "MATURE", "AI-NATIVE", "EMERGING" — only when clearly applicable.
- Be concrete. No generic strategy-speak. Use the user's industry / prior choices to ground the options.
- Match the input language (German in → German out, English in → English out).`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["options"],
  properties: {
    options: {
      type: "array",
      minItems: 1,
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "payload"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          description: { type: "string" },
          meta: { type: "string" },
          payload: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
    },
  },
} as const;

export async function POST(req: NextRequest) {
  if (!configured()) {
    return NextResponse.json(
      { error: "no_api_key", message: "ANTHROPIC_API_KEY ist nicht gesetzt" },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body?.questionId || typeof body.questionId !== "string") {
    return NextResponse.json({ error: "missing_questionId" }, { status: 400 });
  }

  const count = Math.max(2, Math.min(12, body.count ?? 6));
  const userPayload = {
    questionId: body.questionId,
    context: body.context ?? {},
    count,
    exclude: body.exclude ?? [],
    refine: !!body.refine,
  };

  try {
    const client = new Anthropic();
    const stream = client.messages.stream({
      model: "claude-opus-4-7",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: {
          type: "json_schema",
          name: "choice_options",
          schema: SCHEMA as unknown as Record<string, unknown>,
        },
      },
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: JSON.stringify(userPayload) }],
    });

    const finalMessage = await stream.finalMessage();
    const textBlock = finalMessage.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude returned no text content");
    }
    const parsed = JSON.parse(textBlock.text) as { options: ChoiceOption[] };
    // Light client-side dedup based on label, just in case.
    const seen = new Set<string>();
    const options = (parsed.options ?? []).filter((o) => {
      const key = o.label.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return NextResponse.json({ options });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json(
      { error: "claude_error", message: msg },
      { status: 500 },
    );
  }
}
