import { GraphData } from "../types";
import { ensureAcyclicGraph } from "../utils/graphUtils";

export async function parseDocumentToGraph(documentText: string, apiKey: string): Promise<GraphData> {
  const prompt = `
You are an expert software architect who converts project descriptions into executable system architecture diagrams. Your goal is to create a directed acyclic graph (DAG) representing ACTUAL system components, APIs, databases, services, and logic blocks—not abstract concepts.

**CRITICAL: Generate Real Architecture Components**

Instead of generic names like "Constraint_1" or "Feature_3", create nodes that represent CONCRETE architectural elements:
- **APIs/Services**: "User Authentication Service", "Image Processing API", "Search Service"
- **Data Stores**: "User Profile DB", "Image Metadata Store", "Tag Index"
- **Logic Modules**: "ML Inference Engine", "Tag Classifier", "Search Query Parser"
- **Infrastructure**: "S3 Image Bucket", "CloudFront CDN", "Lambda Functions"
- **UI Components**: "Login Screen", "Photo Gallery View", "Search Interface"

**Core Principles:**
1. **Architecture-First Thinking:** Each node should be a buildable, deployable, or implementable component
2. **Meaningful Names:** Use descriptive names that a developer would recognize: "OAuth2 Provider", "PostgreSQL Users Table", "React Dashboard"
3. **Real Data Flow:** Edges represent actual data/API calls: "JWT Token", "Image Metadata", "Search Results JSON"
4. **Layered Design:** Infrastructure → Storage → Backend Services → Business Logic → Frontend

**Node Creation Rules:**
1. **Identify Nodes as System Components:**
   - **type**: Goal (business objective) | Feature (user-facing capability) | Task (implementation work) | Constraint (technical requirement) | Idea (future enhancement)
   - **label**: MUST be a specific component name, NOT generic. Examples:
     * Good: "PostgreSQL Database", "Express.js API Server", "React Photo Grid"
     * Bad: "Database_1", "Backend Service", "Feature_2"
   - **moduleType**: ui | backend | storage | ml-model | data-pipeline | schema | infra | integration | logic
   - **description**: Brief technical description of what this component does
   - **inputs**: Specific artifacts consumed (e.g., "User Credentials", "Image Binary", "SQL Query")
   - **outputs**: Specific artifacts produced (e.g., "Auth Token", "Thumbnail URL", "Search Results")
   - **owners**: Roles responsible [frontend, backend, ml, infra, design, data, devops]
   - **stack**: Actual technologies [react, express, postgres, s3, tensorflow, etc.]

2. **Create Edges as Data/Control Flow:**
   - Edge direction: Provider (source) → Consumer (target)
   - **label**: The ACTUAL data/artifact being transferred:
     * Good: "User Session Token", "Optimized Image URL", "Classification Scores"
     * Bad: "data", "depends on", "connects to"

3. **Architecture Decomposition:**
   Break down high-level requirements into actual system components:
   - "User can upload images" → ["Image Upload Form (UI)", "File Upload API", "S3 Storage Bucket", "Upload Validator"]
   - "Automatic tagging" → ["ML Model Container", "Feature Extractor", "Tag Database", "Inference API"]
   - "Search photos" → ["Search UI", "ElasticSearch Index", "Query Service", "Results Formatter"]

4. **Ensure Complete Architecture:**
   - Every feature needs: UI → API → Logic → Storage chain
   - Every API needs authentication/authorization components
   - Every storage needs schema definition
   - Infrastructure components must be explicit

**Output Schema:**
Generate a JSON object with this exact structure:
{
  "nodes": [
    {
      "id": "unique-kebab-case-id",
      "label": "Descriptive Component Name",
      "description": "What this component does technically",
      "type": "Goal|Feature|Task|Constraint|Idea",
      "moduleType": "ui|backend|storage|ml-model|data-pipeline|schema|infra|integration|logic",
      "outputs": ["Specific Output 1", "Specific Output 2"],
      "inputs": ["Specific Input 1"],
      "owners": ["frontend", "backend"],
      "stack": ["react", "node.js"]
    }
  ],
  "edges": [
    {
      "id": "edge-unique-id",
      "source": "provider-node-id",
      "target": "consumer-node-id",
      "label": "Specific Data/Artifact Name"
    }
  ]
}

**Example Transformation:**

Input: "Users can upload images and search by tags"

Bad Output:
- Nodes: "Feature_1", "Constraint_1", "Task_1"

Good Output:
- Nodes: 
  * "Image Upload UI" (ui, react)
  * "Upload API Gateway" (backend, express)
  * "S3 Image Bucket" (storage, aws-s3)
  * "Image Metadata DB" (storage, postgres)
  * "ML Tagging Service" (ml-model, tensorflow)
  * "Tag Index" (storage, elasticsearch)
  * "Search API" (backend, express)
  * "Search Results UI" (ui, react)
- Edges:
  * "Image Upload UI" → "Upload API Gateway" (label: "Multipart Form Data")
  * "Upload API Gateway" → "S3 Image Bucket" (label: "Image Binary")
  * "S3 Image Bucket" → "ML Tagging Service" (label: "Image URL")
  * "ML Tagging Service" → "Tag Index" (label: "Generated Tags")
  * "Search Results UI" → "Search API" (label: "Search Query")
  * "Search API" → "Tag Index" (label: "Tag Lookup Request")

**CRITICAL: NO CYCLES ALLOWED**
This MUST be a Directed Acyclic Graph (DAG). Ensure:
- No circular dependencies (A → B → C → A)
- No bidirectional flows (A → B AND B → A)
- All edges flow in one direction through the architecture
- Think in terms of layers: Lower layers provide services to higher layers, never the reverse

If you detect a potential cycle, break it by:
- Choosing the dominant flow direction (typically: infrastructure → storage → backend → frontend)
- Using async/event-driven patterns where needed (message queues, event buses)
- Introducing intermediary components (caches, queues) to break circular dependencies

**Project Description to Analyze:**
---
${documentText}
---

Generate a complete system architecture graph with CONCRETE component names and real data flows. 
VERIFY there are no cycles before returning. Return ONLY the JSON object.
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

    // Ensure the graph is acyclic - break any cycles automatically
    const acyclicGraph = ensureAcyclicGraph(normalized as GraphData);
    
    return acyclicGraph;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to parse document. The model may have returned an invalid structure.");
  }
}