import { NextResponse } from "next/server";
import { isClaudeConfigured } from "@/lib/engineLLM";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    claude: isClaudeConfigured(),
    model: "claude-opus-4-7",
  });
}
