import { GraphData } from "../types";

export async function parseDocumentToGraph(documentText: string): Promise<GraphData> {
  const prompt = `
You are an expert system designer who helps break down complex project descriptions into a clear, actionable data-flow graph for designers and product managers. Your goal is to create a directed acyclic graph (DAG) where edges represent the flow of data or artifacts.

**Instructions:**
1.  **Identify Nodes:** Extract the key components from the text.
    *   Assign 'type' from: Goal | Feature | Task | Constraint | Idea.
    *   Determine a 'moduleType' from: ui | backend | storage | ml-model | data-pipeline | schema | infra | integration | logic. If uncertain default to logic.
    *   Provide 'inputs' (artifacts consumed) and 'outputs' (artifacts produced). Prefer short noun phrases.
    *   Provide 'owners' as an array of broad roles: frontend, backend, ml, infra, design, data.
    *   Provide 'stack' with concrete tech hints if implied (e.g. ['react','s3','python']).
2.  **Identify Edges:** This is the most critical step. Create edges that represent the flow of data or the completion of a prerequisite.
    *   The edge direction MUST be from the provider/prerequisite (source) to the consumer/dependent (target). For example, if 'Automatic Tagging' provides tags for 'Search Functionality', the edge is from 'Automatic Tagging' (source) to 'Search Functionality' (target).
    *   The edge 'label' MUST be a short, descriptive name for the data or artifact being passed from source to target. For example: 'Image Tags'. Avoid generic labels like "depends on" or "creates".
3.  **Output Format:** The output must be a valid JSON object adhering to the provided schema. Ensure all 'source' and 'target' IDs in edges correspond to actual node IDs. Focus on the essential structure to make the project palpable for a designer—a refined, visual checklist. Avoid creating nodes for minor details.
 4.  Respond with ONLY the JSON object. Do not include any prose, code fences, or extra text.
 5.  Keep arrays small; omit owners/stack if truly unknown.

**Project Description to Analyze:**
---
${documentText}
---

Generate the graph structure based on these instructions.
`;

  try {
    // Always call the serverless API to keep secrets server-side
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Server API error (${response.status}): ${text}`);
    }
    const result = await response.json();
    // Extract text from response
    let jsonText: string;
    const parts = (result as any)?.candidates?.[0]?.content?.parts ?? [];
    jsonText = parts.map((p: any) => p?.text ?? "").join("").trim();
    // Try strict parse first
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonText);
    } catch {
      // Fallback: extract the largest JSON object block (handles accidental prose or fenced code)
      const fenceMatch = jsonText.match(/```json([\s\S]*?)```/i) || jsonText.match(/```([\s\S]*?)```/i);
      const candidate = fenceMatch ? fenceMatch[1] : jsonText;
      const braceStart = candidate.indexOf("{");
      const braceEnd = candidate.lastIndexOf("}");
      if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
        const sliced = candidate.slice(braceStart, braceEnd + 1);
        parsedJson = JSON.parse(sliced);
      } else {
        console.error("Gemini raw text (truncated):", jsonText.slice(0, 500));
        throw new Error("Model did not return JSON.");
      }
    }

    // Normalize common schema variations
    function normalize(input: any): GraphData | null {
      const root = input?.nodes && input?.edges ? input : input?.graph || input?.data || null;
      const source = root || input;
      if (!source) return null;
      let nodes = source.nodes;
      let edges = source.edges;
      if (!Array.isArray(nodes) || !Array.isArray(edges)) return null;

      // Coerce nodes
      nodes = nodes.map((n: any, idx: number) => {
        if (typeof n === "string") {
          return { id: `node-${idx + 1}`, label: n, description: n, type: "Idea", outputs: [] };
        }
        const id = String(n.id ?? `node-${idx + 1}`);
        const label = String(n.label ?? n.title ?? n.name ?? id);
        const description = String(n.description ?? n.text ?? label);
        const type = String(n.type ?? "Idea");
        const outputs = Array.isArray(n.outputs) ? n.outputs.map(String) : [];
        return { id, label, description, type, outputs };
      });

      // Coerce edges
      edges = edges.map((e: any, idx: number) => {
        const id = String(e.id ?? `edge-${idx + 1}`);
        const source = String(e.source ?? e.from ?? e.src ?? "");
        const target = String(e.target ?? e.to ?? e.dst ?? "");
        const label = String(e.label ?? e.name ?? e.data ?? "");
        return { id, source, target, label };
      }).filter((e: any) => e.source && e.target);

      return { nodes, edges };
    }

    const normalized = normalize(parsedJson as any);
    if (!normalized) {
      console.error("Gemini parsed JSON (truncated):", JSON.stringify(parsedJson).slice(0, 500));
      throw new Error("API response is missing 'nodes' or 'edges' array.");
    }

    return normalized as GraphData;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to parse document. The model may have returned an invalid structure.");
  }
}