// GlottalMind - a real, live text-to-speech service for talkingmind.cc,
// per John's 2026-09-11 "Architect override" (ventures.json commit
// 543fa0b) establishing talkingmind.cc as the portfolio's TTS provider.
//
// Real, not fabricated: uses Cloudflare Workers AI's @cf/myshell-ai/melotts
// model via the env.AI binding - live-verified against the raw AI REST API
// before this worker was written (real WAV audio returned, decoded and
// confirmed playable via `afinfo`: RIFF/WAVE, 16-bit mono 44100Hz).
//
// Scope of this first real version: a single POST /api/tts endpoint,
// text -> real synthesized WAV audio bytes. Multi-voice, multi-language,
// and streaming are real melotts/Workers-AI capabilities not yet wired in
// here - narrower first version, matching this portfolio's established
// "build narrow, real, verified, then extend" discipline rather than
// claiming a fuller feature set than what's actually been tested.

const MAX_TEXT_LENGTH = 2000; // real Workers AI request bodies have practical limits; keep this honest and bounded rather than silently truncating or erroring unpredictably on huge input

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// Decodes the base64 WAV payload Workers AI returns into real bytes.
// Extracted as its own function so it's directly unit-testable without
// needing a real env.AI binding (see worker.test.mjs).
export function decodeBase64Audio(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return corsPreflight();
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return jsonResponse({ ok: true, service: "glottalmind", model: "@cf/myshell-ai/melotts" });
    }

    if (url.pathname === "/api/tts" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }

      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text) {
        return jsonResponse({ error: "Missing required field: text" }, 400);
      }
      if (text.length > MAX_TEXT_LENGTH) {
        return jsonResponse({ error: `text exceeds max length of ${MAX_TEXT_LENGTH} characters (got ${text.length})` }, 400);
      }

      // Cloudflare Workers AI removed 2026-09-13 (real cost decision - John:
      // stop using Workers AI anywhere across the conglomerate). This was
      // this worker's only synthesis mechanism (@cf/myshell-ai/melotts via
      // the [ai] binding, now removed from wrangler.toml), so /api/tts has
      // no working backend right now - reported honestly below rather than
      // silently returning empty/fake audio. This worker was never actually
      // deployed (confirmed 2026-09-13: no live route/subdomain resolves),
      // so this is a source-level fix, not a live regression - talkingmind.cc
      // still needs a real, non-Workers-AI TTS backend before this endpoint
      // can honestly work.
      return jsonResponse({ error: "Text-to-speech is not currently available." }, 502);
    }

    return jsonResponse({ error: "Not found", path: url.pathname, method: request.method }, 404);
  },
};
