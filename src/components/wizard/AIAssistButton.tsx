"use client";

// HELM — AIAssistButton (DEPRECATED in Phase 6).
//
// Previously this rendered an "describe and let Claude fill" overlay with
// a textarea / URL field. The Phase 6 click-only rewrite removed every
// free-text input from the wizard surface, so this component is no longer
// called by any step.
//
// We keep the file as an empty shim to avoid breakage if any external
// caller still imports it. Renders nothing. DO NOT ADD NEW USAGES.

export interface AIAssistButtonProps {
  [key: string]: unknown;
}

export function AIAssistButton(_props: AIAssistButtonProps): null {
  return null;
}
