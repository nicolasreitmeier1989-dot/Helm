// WFC — defender option library (Phase 4.5).
//
// Seven canonical stances an incumbent can take against an AI-native
// challenger. Each carries:
//   - whenItFits — one-line guidance for the picker
//   - Rumelt-kernel template generators that prefill the Diagnosis /
//     Guiding Policy / Opening Move textareas based on the chosen
//     pattern and the user's exposed BMC blocks.
//
// The user can edit any prefilled text; the templates are intended as a
// strong starting point so the kernel is never empty at simulation time.

import type { AIPattern } from "./aiNativePatterns";

export type DefenderOptionId =
  | "HARDEN_HUMAN"
  | "ACQUIRE_DISRUPTOR"
  | "CARVE_OUT_PNL"
  | "VERTICALIZE_DOWN"
  | "PICKS_AND_SHOVELS"
  | "MARGIN_MIGRATION"
  | "GRACEFUL_HARVEST";

export interface DefenderOption {
  id: DefenderOptionId;
  name: string;
  whenItFits: string;
  diagnosisTemplate: (patternName: string, exposedBlocks: string) => string;
  guidingPolicyTemplate: () => string;
  openingMoveTemplate: () => string;
}

export const DEFENDER_OPTIONS: DefenderOption[] = [
  {
    id: "HARDEN_HUMAN",
    name: "Harden the irreducibly-human",
    whenItFits:
      "Regulation, fiduciary duty, physical presence, or emotional trust is required.",
    diagnosisTemplate: (pattern, blocks) =>
      `An AI-native challenger using ${pattern} threatens ${blocks}. The defensible core of our business sits in places AI cannot legally, ethically, or practically reach — regulated judgement, fiduciary accountability, and trusted physical/emotional presence.`,
    guidingPolicyTemplate: () =>
      "Concentrate investment on the irreducibly-human parts of the workflow. Make those parts more visible to the customer, more contractually binding, and more expensive to substitute. Cede the commoditizing layer rather than fight on it.",
    openingMoveTemplate: () =>
      "Re-bundle the high-trust human services and re-price the offering around them; spin out or deprecate the AI-substitutable layer.",
  },
  {
    id: "ACQUIRE_DISRUPTOR",
    name: "Acquire the disruptor",
    whenItFits:
      "Cheap acquisition targets exist and you have the currency (cash, stock, balance sheet).",
    diagnosisTemplate: (pattern, blocks) =>
      `An AI-native challenger using ${pattern} threatens ${blocks}. Several plausible targets exist with strong technology but weak distribution; our distribution and capital position lets us internalise their innovation cheaper than building it.`,
    guidingPolicyTemplate: () =>
      "Use balance-sheet asymmetry to buy the disruption before it buys our market. Move quickly on the top 2–3 plausible targets, integrate cleanly, and retain founders with vesting + autonomy.",
    openingMoveTemplate: () =>
      "Open exploratory M&A talks with the top 2 AI-native targets in the threatened category and quietly retain a specialist banker.",
  },
  {
    id: "CARVE_OUT_PNL",
    name: "Carve-out + separate P&L",
    whenItFits:
      "Christensen-style: a real cultural separation is required for the new business to grow.",
    diagnosisTemplate: (pattern, blocks) =>
      `An AI-native challenger using ${pattern} threatens ${blocks}. Trying to build the AI-native response inside the legacy P&L will starve it — the metrics, cycle time, and risk appetite are incompatible.`,
    guidingPolicyTemplate: () =>
      "Stand up a separately governed unit with its own P&L, its own hiring bar, and explicit permission to cannibalise the legacy business. Protect it from finance and from corporate IT until it can stand on its own.",
    openingMoveTemplate: () =>
      "Appoint a GM, allocate seed funding, and announce the new unit's mandate (including the explicit licence to cannibalise) at the next executive offsite.",
  },
  {
    id: "VERTICALIZE_DOWN",
    name: "Verticalize down the stack",
    whenItFits:
      "Own one defensible sliver (data, regulated relationship, distribution) AI can't replicate.",
    diagnosisTemplate: (pattern, blocks) =>
      `An AI-native challenger using ${pattern} threatens ${blocks}. The horizontal AI layer will commoditize fast, but the vertical sliver beneath it — proprietary data, regulated relationships, and last-mile distribution — remains structurally hard to replicate.`,
    guidingPolicyTemplate: () =>
      "Stop competing on the horizontal AI layer. Concentrate investment on the vertical sliver where our position is structurally defensible, and let AI-natives layer on top of us rather than under us.",
    openingMoveTemplate: () =>
      "Publish an API/partner programme that turns the AI-natives into customers of our vertical sliver, while quietly de-investing from the horizontal-AI roadmap.",
  },
  {
    id: "PICKS_AND_SHOVELS",
    name: "Become the picks-and-shovels",
    whenItFits:
      "You can sell to the AI-natives who are attacking your industry.",
    diagnosisTemplate: (pattern, blocks) =>
      `An AI-native challenger using ${pattern} threatens ${blocks}. The challengers themselves need infrastructure, data, distribution, and trust signals that we already possess. We can sell to them at higher margin than we earn from end-customers.`,
    guidingPolicyTemplate: () =>
      "Reposition the company as the infrastructure layer to the AI-native gold rush. Treat the disruptors as customers rather than enemies, and price for their growth not their incumbency.",
    openingMoveTemplate: () =>
      "Spin up a B2B-AI division, package the underlying assets (data, regulated rails, distribution) as a developer-facing offering, and announce it at the next industry AI summit.",
  },
  {
    id: "MARGIN_MIGRATION",
    name: "Margin migration",
    whenItFits:
      "Concede the commoditizing layer, move profitably to the reconcentrating layer.",
    diagnosisTemplate: (pattern, blocks) =>
      `An AI-native challenger using ${pattern} threatens ${blocks}. The current profit pool is being eroded fast, but adjacent layers (advisory, outcomes, integration, regulated risk) will reconcentrate margin as the AI layer commoditises.`,
    guidingPolicyTemplate: () =>
      "Plan an explicit migration of the profit pool: phase down investment in the commoditising layer, phase up investment in the adjacent layer that will absorb the margin. Communicate it to the board on a multi-year horizon.",
    openingMoveTemplate: () =>
      "Publish a 24-month profit-pool migration plan: which lines are wound down, which adjacent line absorbs the margin, and what the bridging years look like.",
  },
  {
    id: "GRACEFUL_HARVEST",
    name: "Graceful harvest",
    whenItFits:
      "The game is over — the rational move is to optimise cash extraction.",
    diagnosisTemplate: (pattern, blocks) =>
      `An AI-native challenger using ${pattern} threatens ${blocks}. There is no defensible answer that creates more value than disciplined harvest: cash flows are strong now, will decline, and reinvestment will not change the trajectory.`,
    guidingPolicyTemplate: () =>
      "Optimise for cash extraction over the remaining defensible window. Stop new investment, protect existing customers ruthlessly, and return capital to shareholders or redeploy into unrelated bets.",
    openingMoveTemplate: () =>
      "Freeze new product investment, ringfence the operating cash, and present the harvest plan and capital-return schedule to the board.",
  },
];

export function getDefenderOption(id: DefenderOptionId): DefenderOption {
  const o = DEFENDER_OPTIONS.find((x) => x.id === id);
  if (!o) throw new Error(`Unknown DefenderOptionId: ${id}`);
  return o;
}

/**
 * rumeltFromStance — uses the stance's templates to fill a Rumelt-kernel
 * triple from the chosen pattern + the labels of exposed BMC blocks.
 */
export function rumeltFromStance(
  stance: DefenderOption,
  pattern: AIPattern,
  exposedBlockLabels: string[],
): { diagnosis: string; guidingPolicy: string; openingMove: string } {
  const blocks =
    exposedBlockLabels.length > 0
      ? exposedBlockLabels.slice(0, 3).join(", ")
      : "core blocks of our business model";
  return {
    diagnosis: stance.diagnosisTemplate(pattern.name, blocks),
    guidingPolicy: stance.guidingPolicyTemplate(),
    openingMove: stance.openingMoveTemplate(),
  };
}
