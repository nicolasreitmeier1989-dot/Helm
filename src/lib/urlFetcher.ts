// WFC — URL fetcher for the COMPETITOR_URL extractor (Phase 5Y.2).
//
// Server-side only. Fetches static HTML, strips tags / scripts / styles
// with a regex pass, and returns up to ~15K chars of plain text plus the
// canonical source URL. No JS execution — most "About / Investor" pages
// are server-rendered so this is fine for the use case.
//
// Safety caps:
//   - URL length ≤ 256 chars
//   - only http(s) (no file://, javascript:, etc.)
//   - reject IP-literal hosts (avoid SSRF into local services)
//   - 8s timeout, 5MB byte cap, then truncate to 15K chars
//
// This module deliberately has no external deps.

const MAX_URL_LENGTH = 256;
const MAX_OUTPUT_CHARS = 15_000;
const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 8_000;

export interface UrlFetchResult {
  text: string;
  sourceUrl: string;
}

export async function fetchUrlAsText(url: string): Promise<UrlFetchResult> {
  if (!url || typeof url !== "string") {
    throw new Error("URL is empty");
  }
  if (url.length > MAX_URL_LENGTH) {
    throw new Error(
      `URL is too long (${url.length} chars; max ${MAX_URL_LENGTH})`,
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("URL is not parseable");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) URLs are accepted");
  }

  // Reject IPv4 / IPv6 literal hosts — basic SSRF defence.
  if (isIPLiteral(parsed.hostname)) {
    throw new Error("IP-literal hosts are not allowed");
  }
  // Reject obvious local hostnames as well.
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new Error("Local hostnames are not allowed");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let resp: Response;
  try {
    resp = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        // Identify as a normal browser; some sites 403 unknown UAs.
        "User-Agent":
          "Mozilla/5.0 (compatible; WFC-Strategy/0.4; +https://example.com/wfc)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : "unknown";
    throw new Error(`Fetch failed: ${msg}`);
  }
  clearTimeout(timer);

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
  }

  const contentType = resp.headers.get("content-type") ?? "";
  if (
    contentType &&
    !/text\/html|application\/xhtml|text\/plain|application\/xml/i.test(
      contentType,
    )
  ) {
    throw new Error(`Unsupported content-type: ${contentType}`);
  }

  // Read with a byte cap.
  const reader = resp.body?.getReader();
  if (!reader) {
    throw new Error("Empty response body");
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_BYTES) {
        // Stop reading; we already have plenty for our purposes.
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
        break;
      }
      chunks.push(value);
    }
  }
  const buf = concat(chunks);
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  const text = htmlToText(raw).slice(0, MAX_OUTPUT_CHARS);

  return { text, sourceUrl: parsed.toString() };
}

// ---------- helpers ----------

function concat(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const c of chunks) total += c.byteLength;
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

// Strip scripts/styles/comments + tags; collapse whitespace. Conservative
// regex pass; good enough for marketing/about/investor pages.
export function htmlToText(html: string): string {
  let s = html;
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ");
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ");
  s = s.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi, " ");
  s = s.replace(/<svg\b[^>]*>[\s\S]*?<\/svg\s*>/gi, " ");
  s = s.replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/gi, " ");
  // Replace block-level closes with newlines for readability.
  s = s.replace(
    /<\/(?:p|div|section|article|header|footer|h[1-6]|li|tr|br|hr)\b[^>]*>/gi,
    "\n",
  );
  s = s.replace(/<br\s*\/?\s*>/gi, "\n");
  // Strip remaining tags.
  s = s.replace(/<[^>]+>/g, " ");
  // Decode the handful of HTML entities we're likely to encounter.
  s = decodeEntities(s);
  // Collapse whitespace.
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n[ \t]+/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function decodeEntities(s: string): string {
  const named: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
    "&nbsp;": " ",
    "&mdash;": "—",
    "&ndash;": "–",
    "&hellip;": "…",
    "&laquo;": "«",
    "&raquo;": "»",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
    "&euro;": "€",
    "&pound;": "£",
    "&yen;": "¥",
  };
  let out = s;
  for (const [k, v] of Object.entries(named)) {
    out = out.split(k).join(v);
  }
  out = out.replace(/&#(\d+);/g, (_, n) => {
    const code = parseInt(n, 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : "";
  });
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
    const code = parseInt(h, 16);
    return Number.isFinite(code) ? String.fromCodePoint(code) : "";
  });
  return out;
}

function isIPLiteral(host: string): boolean {
  // IPv4 dotted quad
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return true;
  // IPv6 (URL hostname returns it bracket-stripped; check for ':' which
  // never appears in a real DNS hostname).
  if (host.includes(":")) return true;
  return false;
}
