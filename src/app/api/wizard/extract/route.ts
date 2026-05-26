// HELM — wizard AI-Assist extraction endpoint (Phase 4).
//
// Accepts { kind, description, context? } and dispatches to the matching
// extractor in src/lib/extractors.ts. If ANTHROPIC_API_KEY is missing,
// returns 503 — the AIAssistButton handles this gracefully by disabling
// the affordance with a tooltip.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  extractAINativeCompetitor,
  extractBMC,
  extractCapabilities,
  extractCompetitorBasic,
  extractCompetitorFromText,
  extractCompetitorFromURL,
  extractVPC,
  isExtractorConfigured,
  type ExtractKind,
} from "@/lib/extractors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface Body {
  kind: ExtractKind;
  description: string;
  /** COMPETITOR_URL only — target URL */
  url?: string;
  context?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  if (!isExtractorConfigured()) {
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

  if (!body?.kind) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  // Per-kind input requirements:
  //  - AI_NATIVE_COMPETITOR → driven by `context` (no description needed)
  //  - COMPETITOR_URL       → requires `url`
  //  - all others           → require a `description` paragraph
  if (body.kind === "COMPETITOR_URL") {
    if (!body.url || typeof body.url !== "string" || body.url.length < 8) {
      return NextResponse.json({ error: "missing_url" }, { status: 400 });
    }
  } else if (
    body.kind !== "AI_NATIVE_COMPETITOR" &&
    (!body.description || body.description.trim().length < 8)
  ) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    switch (body.kind) {
      case "BMC": {
        const blocks = await extractBMC(body.description);
        return NextResponse.json({ ok: true, blocks });
      }
      case "VPC": {
        const ctx = (body.context ?? {}) as {
          customerSegmentBlockId?: string;
          customerSegmentLabel?: string;
        };
        if (!ctx.customerSegmentBlockId || !ctx.customerSegmentLabel) {
          return NextResponse.json(
            { error: "missing_context" },
            { status: 400 },
          );
        }
        const vpc = await extractVPC(
          body.description,
          ctx.customerSegmentBlockId,
          ctx.customerSegmentLabel,
        );
        return NextResponse.json({ ok: true, vpc });
      }
      case "CAPABILITIES": {
        const { capabilitySets, capabilities } = await extractCapabilities(
          body.description,
        );
        return NextResponse.json({ ok: true, capabilitySets, capabilities });
      }
      case "COMPETITOR_BASIC": {
        const ctx = (body.context ?? {}) as { ourBusiness?: string };
        const competitor = await extractCompetitorBasic(
          body.description,
          ctx,
        );
        return NextResponse.json({ ok: true, competitor });
      }
      case "COMPETITOR_URL": {
        const ctx = (body.context ?? {}) as { hint?: string };
        const competitor = await extractCompetitorFromURL(
          body.url ?? "",
          ctx.hint,
        );
        return NextResponse.json({ ok: true, competitor });
      }
      case "COMPETITOR_TEXT": {
        const ctx = (body.context ?? {}) as { hint?: string };
        const competitor = await extractCompetitorFromText(
          body.description,
          ctx.hint,
        );
        return NextResponse.json({ ok: true, competitor });
      }
      case "AI_NATIVE_COMPETITOR": {
        const ctx = (body.context ?? {}) as {
          patternName?: string;
          fearWorkflow?: string;
          fearPricing?: string;
          fearFlywheel?: string;
        };
        if (!ctx.patternName) {
          return NextResponse.json(
            { error: "missing_context", message: "patternName required" },
            { status: 400 },
          );
        }
        const competitor = await extractAINativeCompetitor({
          patternName: ctx.patternName,
          fearWorkflow: ctx.fearWorkflow,
          fearPricing: ctx.fearPricing,
          fearFlywheel: ctx.fearFlywheel,
        });
        return NextResponse.json({ ok: true, competitor });
      }
      default:
        return NextResponse.json({ error: "unknown_kind" }, { status: 400 });
    }
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
