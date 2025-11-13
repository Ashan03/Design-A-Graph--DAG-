import type { VercelRequest, VercelResponse } from "@vercel/node";

// Preferred model order. We try each until one succeeds (except on auth errors).
const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash"
].filter(Boolean) as string[];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  const prompt = req.body?.prompt;
  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Missing prompt body parameter" });
  }

  let lastError: any = null;
  for (const model of MODEL_CANDIDATES) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }]}],
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        // If NOT_FOUND or 404, try next model; if 401/403 bail out early.
        if (response.status === 404) {
          lastError = { status: 404, body: text, model };
          continue;
        }
        if (response.status === 401 || response.status === 403) {
          return res.status(response.status).json({ error: `Auth error for model ${model}: ${text}` });
        }
        return res.status(response.status).json({ error: text || `Gemini API error for model ${model}` });
      }

      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      lastError = err;
      // network or unexpected error; try next model
      continue;
    }
  }

  console.error("All Gemini model attempts failed", lastError);
  if (lastError?.status === 404) {
    return res.status(404).json({
      error: "No listed Gemini model variants were found (404). Verify your project/model availability or set GEMINI_MODEL to a valid one.",
      tried: MODEL_CANDIDATES
    });
  }
  return res.status(500).json({ error: "Failed to reach Gemini models", tried: MODEL_CANDIDATES });
}

