
import { GoogleGenAI, Type } from "@google/genai";
import { GraphData } from "../types";

// Lazily resolve API key to avoid crashing the app at module load time
function getApiKey(): string | undefined {
  return (
    (import.meta as any)?.env?.VITE_API_KEY ||
    (globalThis as any)?.VITE_API_KEY ||
    (typeof process !== "undefined" ? (process as any)?.env?.GEMINI_API_KEY : undefined) ||
    (typeof process !== "undefined" ? (process as any)?.env?.API_KEY : undefined)
  );
}

function getClient(): GoogleGenAI {
  const key = getApiKey();
  // Minimal diagnostics without leaking the actual key value
  if (!key) {
    console.warn("Gemini key check:", {
      hasImportMeta: typeof import.meta !== "undefined",
      hasViteKey: typeof (import.meta as any)?.env?.VITE_API_KEY !== "undefined",
      hasGlobalKey: typeof (globalThis as any)?.VITE_API_KEY !== "undefined",
      hasProcViteKey: typeof (typeof process !== "undefined" ? (process as any)?.env?.VITE_API_KEY : undefined) !== "undefined",
      hasProcGeminiKey: typeof (typeof process !== "undefined" ? (process as any)?.env?.GEMINI_API_KEY : undefined) !== "undefined",
    });
  }
  if (!key) {
    throw new Error("VITE_API_KEY (or GEMINI_API_KEY/API_KEY) environment variable not set");
  }
  return new GoogleGenAI({ apiKey: key });
}

const responseSchema = {
    type: Type.OBJECT,
    properties: {
      nodes: {
        type: Type.ARRAY,
        description: 'A list of all nodes in the graph.',
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: 'A unique identifier for the node, e.g., "node-1".' },
            label: { type: Type.STRING, description: 'A short, concise title for the node.' },
            description: { type: Type.STRING, description: 'The source text or a detailed description of the node.' },
            type: { type: Type.STRING, description: "The category of the node ('Goal', 'Feature', 'Task', 'Constraint', 'Idea')." },
            outputs: { type: Type.ARRAY, description: 'A list of artifacts or data this node produces, e.g., ["CSV Report", "User Image"].', items: { type: Type.STRING } },
          },
          required: ['id', 'label', 'description', 'type'],
        },
      },
      edges: {
        type: Type.ARRAY,
        description: 'A list of all edges representing relationships between nodes.',
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: 'A unique identifier for the edge, e.g., "edge-1".' },
            source: { type: Type.STRING, description: 'The ID of the source node (the provider of data/work).' },
            target: { type: Type.STRING, description: 'The ID of the target node (the consumer of data/work).' },
            label: { type: Type.STRING, description: 'A short description of the artifact or data being passed from the source to the target (e.g., "User Data").' },
          },
          required: ['id', 'source', 'target', 'label'],
        },
      },
    },
    required: ['nodes', 'edges'],
};

export async function parseDocumentToGraph(documentText: string): Promise<GraphData> {
  const prompt = `
You are an expert system designer who helps break down complex project descriptions into a clear, actionable data-flow graph for designers and product managers. Your goal is to create a directed acyclic graph (DAG) where edges represent the flow of data or artifacts.

**Instructions:**
1.  **Identify Nodes:** Extract the key components from the text.
    *   Categorize each node's 'type' as one of 'Goal', 'Feature', 'Task', 'Constraint', or 'Idea'.
    *   Also, identify the key 'outputs' or artifacts that each node produces. This should be a list of strings. For example, a task 'Generate sales report' might have an output \`["CSV Report"]\`.
2.  **Identify Edges:** This is the most critical step. Create edges that represent the flow of data or the completion of a prerequisite.
    *   The edge direction MUST be from the provider/prerequisite (source) to the consumer/dependent (target). For example, if 'Automatic Tagging' provides tags for 'Search Functionality', the edge is from 'Automatic Tagging' (source) to 'Search Functionality' (target).
    *   The edge 'label' MUST be a short, descriptive name for the data or artifact being passed from source to target. For example: 'Image Tags'. Avoid generic labels like "depends on" or "creates".
3.  **Output Format:** The output must be a valid JSON object adhering to the provided schema. Ensure all 'source' and 'target' IDs in edges correspond to actual node IDs. Focus on the essential structure to make the project palpable for a designer—a refined, visual checklist. Avoid creating nodes for minor details.
4.  Respond with ONLY the JSON object. Do not include any prose, code fences, or extra text.

**Project Description to Analyze:**
---
${documentText}
---

Generate the graph structure based on these instructions.
`;

  try {
    const ai = getClient();
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });
    // Extract text from response
    let jsonText: string;
    const maybeTextFn = (result as any)?.text;
    if (typeof maybeTextFn === "function") {
      jsonText = (result as any).text().trim();
    } else {
      const parts = (result as any)?.candidates?.[0]?.content?.parts ?? [];
      jsonText = parts.map((p: any) => p?.text ?? "").join("").trim();
    }
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