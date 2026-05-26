// WFC — root page (Phase 4).
//
// What used to live at `/` (the dense dashboard) has moved to `/dashboard`.
// `/` is now the user-first landing surface that opens in the user's own
// vocabulary (BMC / VPC / Capabilities) and leads them into the dashboard
// only after they've mapped at least one business + one move.

import { Landing } from "@/components/wizard/Landing";

export default function HomePage() {
  return <Landing />;
}
