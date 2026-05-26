import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isClaudeConfigured, simulateWithClaude } from "@/lib/engineLLM";
import type { CompetitorProfile, OwnProfile, Scenario } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface Body {
  competitor: CompetitorProfile;
  own: OwnProfile;
  scenarios: Scenario[];
  // Phase 5X.2 — opt-in sub-mode. Default DIRECT preserves the cheap
  // single-call shape; ADJUDICATED splits Red/White/Blue into three sealed
  // Claude calls per round per scenario.
  mode?: "DIRECT" | "ADJUDICATED";
}

export async function POST(req: NextRequest) {
  if (!isClaudeConfigured()) {
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

  if (!body?.competitor || !body?.own || !body?.scenarios?.length) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    const sim = await simulateWithClaude({
      competitor: body.competitor,
      own: body.own,
      scenarios: body.scenarios,
      mode: body.mode === "ADJUDICATED" ? "ADJUDICATED" : "DIRECT",
    });
    return NextResponse.json({ ok: true, simulation: sim });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "auth" }, { status: 401 });
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: "api_error", status: err.status, message: err.message },
        { status: 502 },
      );
    }
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "internal", message }, { status: 500 });
  }
}
