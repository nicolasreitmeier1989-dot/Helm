import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, userPrompt } from "@/lib/wargame/prompt";
import { mockSimulation } from "@/lib/wargame/mock";
import type { Simulation, SimulationRequest } from "@/lib/wargame/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-5-20250929";

function stripFences(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return t.trim();
}

export async function POST(req: NextRequest) {
  let body: SimulationRequest;
  try {
    body = (await req.json()) as SimulationRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.company || !body?.sector || !body?.pitch) {
    return NextResponse.json(
      { error: "Missing fields: company, sector, pitch are all required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Demo mode — no API key. Return mock so the demo runs.
    return NextResponse.json({ ...mockSimulation(body), _source: "mock" });
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt(body) }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("LLM returned no text block");
    }

    const raw = stripFences(textBlock.text);
    const sim = JSON.parse(raw) as Simulation;

    if (!sim?.rounds || sim.rounds.length !== 12) {
      throw new Error(`Expected 12 rounds, got ${sim?.rounds?.length}`);
    }

    return NextResponse.json({ ...sim, _source: "llm" });
  } catch (err) {
    console.error("[wargame] LLM error, falling back to mock:", err);
    return NextResponse.json({
      ...mockSimulation(body),
      _source: "mock",
      _error: err instanceof Error ? err.message : String(err),
    });
  }
}
